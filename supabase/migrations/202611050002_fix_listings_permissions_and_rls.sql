-- ============================================================================
-- GrossThrift Fix: Table Grants, Schema Constraints & RLS Policies for Listings
-- Fixes: "permission denied for table listings" (SQLSTATE 42501)
-- Preserves all existing RLS rules on memberships, payments, and invites.
-- Run this script in your Supabase Dashboard -> SQL Editor.
-- ============================================================================

-- 1. Ensure schema usage is granted to anon, authenticated, and service_role
grant usage on schema public to anon, authenticated, service_role;

-- 2. Grant full table-level privileges to postgres and service_role on all tables
--    (In Postgres, service_role bypasses RLS via BYPASSRLS, but still requires
--     table-level GRANT privileges so server-side admin operations succeed.)
grant all on all tables in schema public to postgres, service_role;
grant all on all sequences in schema public to postgres, authenticated, service_role;
grant all on all routines in schema public to postgres, service_role;

-- 3. Grant exact role-appropriate privileges on core tables (preserving existing
--    read-only client restrictions on memberships and payments):
grant select on table public.services to anon, authenticated, service_role;
grant select on table public.profiles to anon, authenticated, service_role;
grant insert, update on table public.profiles to authenticated, service_role;

grant select on table public.listings to anon, authenticated, service_role;
grant insert, update, delete on table public.listings to authenticated, service_role;

do $$
begin
  if exists (select 1 from information_schema.views where table_schema = 'public' and table_name = 'listings_with_host') then
    execute 'grant select on table public.listings_with_host to anon, authenticated, service_role';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profile_private') then
    execute 'grant select, insert, update on table public.profile_private to authenticated, service_role';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invites') then
    execute 'grant select, insert, update on table public.invites to authenticated, service_role';
  end if;

  -- Keep memberships and payments read-only for authenticated clients (mutations
  -- happen via SECURITY DEFINER RPCs and server-side service_role routes)
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'memberships') then
    execute 'grant select on table public.memberships to authenticated, service_role';
    execute 'grant insert, update, delete on table public.memberships to service_role';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payments') then
    execute 'grant select on table public.payments to authenticated, service_role';
    execute 'grant insert, update, delete on table public.payments to service_role';
  end if;
end $$;

-- 4. Ensure public.profiles supports role and suspension flags for Admin Enforcement (ADM-1 / ADM-4)
alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user', 'admin')),
  add column if not exists is_suspended boolean not null default false;

-- 5. Ensure public.listings supports 'official', 'community', and 'user' host_type,
--    has the currency column, and sets a sensible default for rules
alter table public.listings
  add column if not exists currency text not null default 'NGN';

alter table public.listings
  alter column rules set default 'Use your own assigned profile or seat invitation only. Never share primary account credentials.',
  alter column rules drop not null;

do $$
declare
  constraint_rec record;
begin
  for constraint_rec in
    select conname
    from pg_constraint
    where conrelid = 'public.listings'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ilike '%host_type%'
        or pg_get_constraintdef(oid) ilike '%rules%'
      )
  loop
    execute format('alter table public.listings drop constraint if exists %I', constraint_rec.conname);
  end loop;
end $$;

alter table public.listings
  add constraint listings_host_type_check
  check (host_type in ('official', 'community', 'user'));

-- 5. Enable Row Level Security and define clean policies for public.listings & public.profiles
alter table public.listings enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "listings_select_public_or_own" on public.listings;
drop policy if exists "listings_insert_own" on public.listings;
drop policy if exists "listings_update_own" on public.listings;
drop policy if exists "listings_delete_own" on public.listings;
drop policy if exists "Public listings are viewable by everyone" on public.listings;
drop policy if exists "Users can create their own listings" on public.listings;
drop policy if exists "Users can update their own listings" on public.listings;
drop policy if exists "Hosts can insert listings" on public.listings;
drop policy if exists "Authenticated users can create listings" on public.listings;

-- Anyone can read public listings; hosts and members can also read their related private/full listings
create policy "listings_select_public_or_own"
  on public.listings for select
  using (
    visibility = 'public'
    or host_id = (select auth.uid())
    or exists (
      select 1
      from public.memberships
      where memberships.listing_id = listings.id
        and memberships.member_id = (select auth.uid())
    )
  );

-- Authenticated users can create a listing where they are the host and have attested to sharing terms
create policy "listings_insert_own"
  on public.listings for insert
  to authenticated
  with check (
    host_id = (select auth.uid())
    and host_attested = true
  );

-- Hosts can update their own listings (price lock trigger listings_lock_price_with_members remains enforced)
create policy "listings_update_own"
  on public.listings for update
  to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

-- Hosts can delete their own listings
create policy "listings_delete_own"
  on public.listings for delete
  to authenticated
  using (host_id = (select auth.uid()));

-- Ensure profiles RLS policies allow reading public profile info and updating own profile
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
