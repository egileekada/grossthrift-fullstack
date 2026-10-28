-- Private listing invite links: one-use tokens are stored as hashes, not in plain text.
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  contact_email text,
  contact_phone text,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired', 'exhausted')),
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0 and use_count <= max_uses),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists invites_listing_created_idx
  on public.invites (listing_id, created_at desc);

alter table public.invites enable row level security;
revoke all on public.invites from anon, authenticated;
grant select, insert, update on public.invites to authenticated;

create policy "Hosts manage invites for their own listings"
  on public.invites
  for all
  to authenticated
  using (
    invited_by = (select auth.uid())
    and exists (
      select 1
      from public.listings
      where listings.id = invites.listing_id
        and listings.host_id = (select auth.uid())
    )
  )
  with check (
    invited_by = (select auth.uid())
    and exists (
      select 1
      from public.listings
      where listings.id = invites.listing_id
        and listings.host_id = (select auth.uid())
    )
  );
