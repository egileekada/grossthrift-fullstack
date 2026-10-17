-- GrossThrift MVP: align seat reservations with the PRD membership model.
-- Run once in Supabase SQL Editor after 202610170001_listing_seat_holds.sql.

-- The existing RPC return type follows the table rename.

do $$
begin
  if to_regclass('public.listing_members') is not null
     and to_regclass('public.memberships') is null then
    alter table public.listing_members rename to memberships;
  elsif to_regclass('public.listing_members') is not null
        and to_regclass('public.memberships') is not null then
    raise exception 'Both listing_members and memberships exist; refusing to merge them automatically';
  elsif to_regclass('public.memberships') is null then
    raise exception 'Neither public.listing_members nor public.memberships exists';
  end if;
end;
$$;

-- Keep the PRD's public table and lifecycle field names.
alter table public.memberships
  add column if not exists joined_at timestamptz not null default now(),
  add column if not exists left_at timestamptz,
  add column if not exists invitation_sent_at timestamptz,
  add column if not exists access_confirmed_at timestamptz;

-- Remove the earlier status check before translating its values.
do $$
declare
  check_row record;
begin
  for check_row in
    select conname
      from pg_constraint
      where conrelid = 'public.memberships'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.memberships drop constraint %I', check_row.conname);
  end loop;
end;
$$;

update public.memberships
  set status = case status
    when 'seat_held' then 'pending_payment'
    when 'payment_held' then 'paid_and_held'
    when 'access_confirmed' then 'active'
    when 'completed' then 'active'
    when 'cancelled' then 'left'
    when 'expired' then 'left'
    when 'refund_pending' then 'paid_and_held'
    else status
  end,
  left_at = case
    when status in ('cancelled', 'expired') then coalesce(left_at, now())
    else left_at
  end
  where status in (
    'seat_held', 'payment_held', 'access_confirmed', 'completed',
    'cancelled', 'expired', 'refund_pending'
  );

alter table public.memberships
  alter column status set default 'pending_payment',
  add constraint memberships_status_check
    check (status in (
      'pending_payment',
      'paid_and_held',
      'invited',
      'active',
      'disputed',
      'left',
      'refunded'
    ));

-- The old status-specific index is now empty after status conversion; retaining it is safe.
-- The existing listing/status index remains useful after the table rename.
create unique index if not exists memberships_one_current_per_user_listing
  on public.memberships (listing_id, member_id)
  where status in ('pending_payment', 'paid_and_held', 'invited', 'active', 'disputed');

alter table public.memberships enable row level security;
-- The existing member/host read policy stays attached to the renamed table.

revoke all on public.memberships from anon, authenticated;
grant select on public.memberships to authenticated;

create or replace function public.hold_listing_seat(p_listing_id uuid)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  listing_row public.listings%rowtype;
  held_membership public.memberships%rowtype;
  expired_count integer;
begin
  if current_user_id is null then
    raise exception 'Sign in before joining a listing' using errcode = '28000';
  end if;

  if not exists (
    select 1
      from auth.users
      where id = current_user_id
        and email_confirmed_at is not null
  ) then
    raise exception 'Verify your email before joining a listing' using errcode = '42501';
  end if;

  -- Lock the listing so simultaneous requests cannot reserve the same last seat.
  select *
    into listing_row
    from public.listings
    where id = p_listing_id
    for update;

  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  -- Release unpaid reservations whose 10-minute checkout window has ended.
  with expired_holds as (
    update public.memberships
      set status = 'left',
          left_at = coalesce(left_at, pg_catalog.now()),
          seat_expires_at = null,
          updated_at = pg_catalog.now()
      where listing_id = p_listing_id
        and status = 'pending_payment'
        and seat_expires_at <= pg_catalog.now()
      returning id
  )
  select pg_catalog.count(*)::integer
    into expired_count
    from expired_holds;

  if expired_count > 0 then
    update public.listings
      set seats_open = pg_catalog.least(seats_total, seats_open + expired_count),
          status = case when status = 'full' then 'active' else status end,
          updated_at = pg_catalog.now()
      where id = p_listing_id
      returning * into listing_row;
  end if;

  if listing_row.status <> 'active' or listing_row.visibility <> 'public' then
    raise exception 'This listing is not open for public joining' using errcode = '22023';
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
      where listing_id = p_listing_id
        and member_id = current_user_id
        and status in ('pending_payment', 'paid_and_held', 'invited', 'active', 'disputed')
  ) then
    raise exception 'You already have a membership for this listing' using errcode = '23505';
  end if;

  update public.listings
    set seats_open = seats_open - 1,
        status = case when seats_open - 1 = 0 then 'full' else status end,
        updated_at = pg_catalog.now()
    where id = p_listing_id
    returning * into listing_row;

  insert into public.memberships (
    listing_id,
    member_id,
    status,
    price_per_seat,
    seat_expires_at
  ) values (
    p_listing_id,
    current_user_id,
    'pending_payment',
    listing_row.price_per_seat,
    pg_catalog.now() + interval '10 minutes'
  )
  returning * into held_membership;

  return held_membership;
end;
$$;

revoke all on function public.hold_listing_seat(uuid) from public, anon;
grant execute on function public.hold_listing_seat(uuid) to authenticated;



