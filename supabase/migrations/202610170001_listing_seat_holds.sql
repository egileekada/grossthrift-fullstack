-- GrossThrift MVP: safe 10-minute seat holds when a member joins a listing.
-- Run this in Supabase SQL Editor after the existing services, listings,
-- profiles, and profile_private tables have been created.

create table if not exists public.listing_members (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'seat_held'
    check (status in (
      'seat_held',
      'payment_held',
      'invited',
      'access_confirmed',
      'completed',
      'cancelled',
      'expired',
      'refund_pending',
      'refunded',
      'disputed'
    )),
  price_per_seat numeric(12, 2) not null check (price_per_seat > 0),
  seat_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists listing_members_one_active_per_user_listing
  on public.listing_members (listing_id, member_id)
  where status in (
    'seat_held', 'payment_held', 'invited', 'access_confirmed',
    'completed', 'refund_pending', 'disputed'
  );

create index if not exists listing_members_listing_status_idx
  on public.listing_members (listing_id, status);

alter table public.listing_members enable row level security;

 drop policy if exists "Members and hosts can read listing memberships" on public.listing_members;
 create policy "Members and hosts can read listing memberships"
   on public.listing_members
   for select
   to authenticated
   using (
     member_id = (select auth.uid())
     or exists (
       select 1
       from public.listings
       where listings.id = listing_members.listing_id
         and listings.host_id = (select auth.uid())
     )
   );

revoke all on public.listing_members from anon, authenticated;
grant select on public.listing_members to authenticated;

create or replace function public.hold_listing_seat(p_listing_id uuid)
returns public.listing_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  listing_row public.listings%rowtype;
  held_membership public.listing_members%rowtype;
  expired_count integer;
begin
  if current_user_id is null then
    raise exception 'Sign in before joining a listing' using errcode = '28000';
  end if;

  -- Lock the listing so simultaneous join requests cannot take the same seat.
  select *
    into listing_row
    from public.listings
    where id = p_listing_id
    for update;

  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  -- Expire stale unpaid holds and return their seats before checking availability.
  with expired_holds as (
    update public.listing_members
      set status = 'expired',
          seat_expires_at = null,
          updated_at = pg_catalog.now()
      where listing_id = p_listing_id
        and status = 'seat_held'
        and seat_expires_at <= pg_catalog.now()
      returning id
  )
  select pg_catalog.count(*)::integer
    into expired_count
    from expired_holds;

  if expired_count > 0 then
    update public.listings
      set seats_open = pg_catalog.least(seats_total, seats_open + expired_count),
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
      from public.listing_members
      where listing_id = p_listing_id
        and member_id = current_user_id
        and status in (
          'seat_held', 'payment_held', 'invited', 'access_confirmed',
          'completed', 'refund_pending', 'disputed'
        )
  ) then
    raise exception 'You already have a membership for this listing' using errcode = '23505';
  end if;

  update public.listings
    set seats_open = seats_open - 1,
        updated_at = pg_catalog.now()
    where id = p_listing_id
    returning * into listing_row;

  insert into public.listing_members (
    listing_id,
    member_id,
    status,
    price_per_seat,
    seat_expires_at
  ) values (
    p_listing_id,
    current_user_id,
    'seat_held',
    listing_row.price_per_seat,
    pg_catalog.now() + interval '10 minutes'
  )
  returning * into held_membership;

  return held_membership;
end;
$$;

revoke all on function public.hold_listing_seat(uuid) from public, anon;
grant execute on function public.hold_listing_seat(uuid) to authenticated;
