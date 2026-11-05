-- GrossThrift PRD v1.0 Complete Lifecycle Migration:
-- Wallets, Wallet Transactions, Payout Requests, Disputes, Ratings, and Notifications.

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_balance numeric(12, 2) not null default 0 check (available_balance >= 0),
  held_balance numeric(12, 2) not null default 0 check (held_balance >= 0),
  currency text not null default 'NGN',
  bank_name text,
  bank_code text,
  account_number text,
  account_name text,
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;
drop policy if exists "Users can read their own wallet" on public.wallets;
create policy "Users can read their own wallet"
  on public.wallets for select to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  type text not null check (type in ('hold_in', 'release_to_available', 'withdrawal', 'refund_out')),
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  description text,
  created_at timestamptz not null default now()
);

alter table public.wallet_transactions enable row level security;
drop policy if exists "Users can read their own wallet transactions" on public.wallet_transactions;
create policy "Users can read their own wallet transactions"
  on public.wallet_transactions for select to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 2000),
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'paid', 'failed')),
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.payout_requests enable row level security;
drop policy if exists "Hosts can read their own payout requests" on public.payout_requests;
create policy "Hosts can read their own payout requests"
  on public.payout_requests for select to authenticated
  using (host_id = (select auth.uid()));

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  opened_by uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('no_invite', 'invite_failed', 'access_revoked', 'wrong_plan', 'other')),
  description text not null,
  evidence_urls text[] default '{}',
  status text not null default 'open'
    check (status in ('open', 'under_review', 'resolved_refund', 'resolved_release')),
  resolution_note text,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.disputes enable row level security;
drop policy if exists "Involved users can read disputes" on public.disputes;
create policy "Involved users can read disputes"
  on public.disputes for select to authenticated
  using (
    opened_by = (select auth.uid())
    or exists (
      select 1 from public.listings
      where listings.id = disputes.listing_id
        and listings.host_id = (select auth.uid())
    )
  );

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  rater_id uuid not null references auth.users(id) on delete cascade,
  ratee_id uuid not null references auth.users(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (membership_id, rater_id)
);

alter table public.ratings enable row level security;
drop policy if exists "Anyone authenticated can read ratings" on public.ratings;
create policy "Anyone authenticated can read ratings"
  on public.ratings for select to authenticated
  using (true);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

