-- ============================================================================
-- GrossThrift Fix: Table Grants, Schema Constraints & RLS Policies for Listings
-- Fixes: "permission denied for table listings" (SQLSTATE 42501)
-- Run this script in your Supabase Dashboard -> SQL Editor.
-- ============================================================================

-- 1. Ensure schema usage is granted to anon, authenticated, and service_role
grant usage on schema public to anon, authenticated, service_role;

-- 2. Grant full table-level privileges to postgres and service_role on all tables
--    (Note: In Postgres, service_role bypasses RLS policies via BYPASSRLS,
--     but STILL requires table-level GRANT privileges!)
grant all on all tables in schema public to postgres, service_role;
grant all on all sequences in schema public to postgres, authenticated, service_role;
grant all on all routines in schema public to postgres, service_role;

-- 3. Grant explicit table-level privileges to anon & authenticated roles
grant select on table public.services to anon, authenticated, service_role;
grant select, insert, update on table public.profiles to authenticated, service_role;
grant select on table public.profiles to anon;

grant select, insert, update, delete on table public.listings to authenticated, service_role;
grant select on table public.listings to anon;

do $$
begin
  if exists (select 1 from information_schema.views where table_schema = 'public' and table_name = 'listings_with_host') then
    execute 'grant select on table public.listings_with_host to anon, authenticated, service_role';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profile_private') then
    execute 'grant select, insert, update on table public.profile_private to authenticated, service_role';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invites') then
    execute 'grant select, insert, update, delete on table public.invites to authenticated, service_role';
    execute 'grant select on table public.invites to anon';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'memberships') then
    execute 'grant select, insert, update, delete on table public.memberships to authenticated, service_role';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payments') then
    execute 'grant select, insert, update on table public.payments to authenticated, service_role';
  end if;
end $$;

-- 4. Ensure public.listings supports both 'community' and 'user' host_type,
--    has the currency column, and allows optional or default rules
alter table public.listings
  add column if not exists currency text not null default 'NGN';

alter table public.listings
  alter column rules set default 'Use your own assigned profile or seat invitation only. Never share primary account credentials.',
  alter column rules drop not null;

do $$
declare
  constraint_rec record;
begin
  -- Drop any restrictive check constraint on listings.host_type or listings.rules
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

-- 5. Enable Row Level Security and define clean, permissive policies for authenticated users
alter table public.listings enable row level security;
alter table public.profiles enable row level security;

-- Clean up any conflicting or overly restrictive legacy policies on public.listings
drop policy if exists "listings_select_public_or_own" on public.listings;
drop policy if exists "listings_insert_own" on public.listings;
drop policy if exists "listings_update_own" on public.listings;
drop policy if exists "listings_delete_own" on public.listings;
drop policy if exists "Public listings are viewable by everyone" on public.listings;
drop policy if exists "Users can create their own listings" on public.listings;
drop policy if exists "Users can update their own listings" on public.listings;
drop policy if exists "Hosts can insert listings" on public.listings;
drop policy if exists "Authenticated users can create listings" on public.listings;

-- Anyone (anon or authenticated) can read public active listings, or hosts can read their own listings
create policy "listings_select_public_or_own"
  on public.listings for select
  using (
    visibility = 'public'
    or host_id = (select auth.uid())
  );

-- Any authenticated user can create a listing where they are the host_id
create policy "listings_insert_own"
  on public.listings for insert
  to authenticated
  with check (
    host_id = (select auth.uid())
  );

-- Hosts can update their own listings
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

-- Ensure profiles RLS policies allow users to read profiles and upsert their own profile
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

