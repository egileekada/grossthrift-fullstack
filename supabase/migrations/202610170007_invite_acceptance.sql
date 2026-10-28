-- Safe public preview and atomic acceptance of private listing invites.
alter table public.memberships
  add column if not exists invite_id uuid references public.invites(id) on delete set null;

create index if not exists memberships_invite_id_idx
  on public.memberships (invite_id)
  where invite_id is not null;

create or replace function public.restore_invite_use_on_hold_release()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.invite_id is not null
     and old.status = 'pending_payment'
     and old.seat_expires_at is not null
     and new.status = 'left'
     and new.seat_expires_at is null then
    update public.invites
      set use_count = greatest(use_count - 1, 0),
          status = case
            when revoked_at is not null then 'revoked'
            when expires_at <= pg_catalog.now() then 'expired'
            else 'active'
          end
      where id = old.invite_id
        and status in ('active', 'exhausted');
  end if;
  return new;
end;
$$;

revoke all on function public.restore_invite_use_on_hold_release() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'memberships_restore_invite_use_on_hold_release'
      and tgrelid = 'public.memberships'::regclass
      and not tgisinternal
  ) then
    create trigger memberships_restore_invite_use_on_hold_release
      after update of status, seat_expires_at on public.memberships
      for each row
      execute function public.restore_invite_use_on_hold_release();
  end if;
end;
$$;

create or replace function public.get_private_invite_preview(p_token_hash text)
returns table (
  listing_id uuid,
  service_name text,
  service_category text,
  service_logo_url text,
  plan_type text,
  total_cost numeric,
  billing_cycle text,
  seats_open integer,
  price_per_seat numeric,
  description text,
  rules text,
  host_type text,
  host_display_name text,
  host_avatar_url text,
  host_rating_avg numeric,
  host_completed_splits integer,
  expires_at timestamptz,
  uses_remaining integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    s.name::text,
    s.category::text,
    s.logo_url::text,
    l.plan_type::text,
    l.total_cost,
    l.billing_cycle::text,
    l.seats_open,
    l.price_per_seat,
    l.description::text,
    l.rules::text,
    l.host_type::text,
    case when l.host_type::text = 'official' then 'GrossThrift' else p.display_name end,
    case when l.host_type::text = 'official' then null else p.avatar_url end,
    p.rating_avg::numeric,
    coalesce(p.completed_splits, 0),
    i.expires_at,
    greatest(i.max_uses - i.use_count, 0)
  from public.invites as i
  join public.listings as l on l.id = i.listing_id
  join public.services as s on s.id = l.service_id
  left join public.profiles as p on p.id = l.host_id
  where i.token_hash = p_token_hash
    and i.status = 'active'
    and i.revoked_at is null
    and i.expires_at > pg_catalog.now()
    and i.use_count < i.max_uses
    and l.visibility = 'private'
    and l.status = 'active'
    and l.seats_open > 0;
$$;

revoke all on function public.get_private_invite_preview(text) from public;
grant execute on function public.get_private_invite_preview(text) to anon, authenticated;

create or replace function public.accept_private_invite(p_token_hash text)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_listing_id uuid;
  listing_row public.listings%rowtype;
  invite_row public.invites%rowtype;
  held_membership public.memberships%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in before joining a private listing' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = current_user_id
      and email_confirmed_at is not null
  ) then
    raise exception 'Verify your email before joining a private listing' using errcode = '42501';
  end if;

  select i.listing_id
    into target_listing_id
    from public.invites as i
    where i.token_hash = p_token_hash;

  if not found then
    raise exception 'Invite link is invalid or expired' using errcode = 'P0002';
  end if;

  -- Serialize all invite acceptances for a listing so its final seat cannot be oversold.
  select *
    into listing_row
    from public.listings
    where id = target_listing_id
    for update;

  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  select *
    into invite_row
    from public.invites
    where token_hash = p_token_hash
    for update;

  if not found then
    raise exception 'Invite link is invalid, expired, revoked, or fully used' using errcode = 'P0002';
  end if;

  if invite_row.status <> 'active'
     or invite_row.revoked_at is not null
     or invite_row.expires_at <= pg_catalog.now()
     or invite_row.use_count >= invite_row.max_uses then
    raise exception 'Invite link is invalid, expired, revoked, or fully used' using errcode = 'P0002';
  end if;

  if listing_row.visibility <> 'private' or listing_row.status <> 'active' then
    raise exception 'This private listing is not open for joining' using errcode = '22023';
  end if;

  if listing_row.host_id = current_user_id then
    raise exception 'Hosts cannot join their own listing' using errcode = '22023';
  end if;

  if listing_row.seats_open < 1 then
    raise exception 'No seats are currently available' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.memberships
    where listing_id = target_listing_id
      and member_id = current_user_id
      and status in ('pending_payment', 'paid_and_held', 'invited', 'active', 'disputed')
  ) then
    raise exception 'You already have a membership for this listing' using errcode = '23505';
  end if;

  update public.listings
    set seats_open = seats_open - 1,
        status = case when seats_open - 1 = 0 then 'full' else status end,
        updated_at = pg_catalog.now()
    where id = target_listing_id
    returning * into listing_row;

  update public.invites
    set use_count = use_count + 1,
        status = case when use_count + 1 >= max_uses then 'exhausted' else 'active' end
    where id = invite_row.id;

  insert into public.memberships (
    listing_id,
    member_id,
    invite_id,
    status,
    price_per_seat,
    seat_expires_at
  ) values (
    target_listing_id,
    current_user_id,
    invite_row.id,
    'pending_payment',
    listing_row.price_per_seat,
    pg_catalog.now() + interval '10 minutes'
  )
  returning * into held_membership;

  return held_membership;
end;
$$;

revoke all on function public.accept_private_invite(text) from public, anon;
grant execute on function public.accept_private_invite(text) to authenticated;


