-- Paystack hosted checkout ledger and atomic membership settlement.
-- Run in Supabase SQL Editor after the existing membership migrations.

-- Nigeria and NGN are the MVP launch assumption in the PRD; this only changes
-- the default for newly created listings. Existing listings are left intact.
alter table public.listings alter column currency set default 'NGN';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null unique references public.memberships(id) on delete restrict,
  listing_id uuid not null references public.listings(id) on delete restrict,
  member_id uuid not null references auth.users(id) on delete restrict,
  host_id uuid references auth.users(id) on delete set null,
  provider text not null default 'paystack' check (provider = 'paystack'),
  provider_reference text not null unique,
  provider_transaction_id text unique,
  currency text not null default 'NGN' check (currency = 'NGN'),
  seat_amount_minor bigint not null check (seat_amount_minor > 0),
  fee_amount_minor bigint not null check (fee_amount_minor >= 0),
  amount_minor bigint not null check (amount_minor = seat_amount_minor + fee_amount_minor),
  fee_percent numeric(7, 4) not null check (fee_percent >= 0 and fee_percent <= 100),
  status text not null default 'pending'
    check (status in ('pending', 'held', 'refund_due', 'refund_pending', 'refunded', 'failed')),
  authorization_url text,
  refund_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_member_created_idx
  on public.payments (member_id, created_at desc);
create index if not exists payments_host_created_idx
  on public.payments (host_id, created_at desc);

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

drop policy if exists "Members and hosts can read related payments" on public.payments;
create policy "Members and hosts can read related payments"
  on public.payments
  for select
  to authenticated
  using (member_id = (select auth.uid()) or host_id = (select auth.uid()));

create or replace function public.settle_paystack_payment(
  p_provider_reference text,
  p_provider_transaction_id text,
  p_amount_minor bigint,
  p_currency text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_row public.payments%rowtype;
  membership_row public.memberships%rowtype;
begin
  select * into payment_row
    from public.payments
    where provider_reference = p_provider_reference
    for update;

  if not found then
    raise exception 'Payment reference not found' using errcode = 'P0002';
  end if;

  if payment_row.amount_minor <> p_amount_minor or payment_row.currency <> p_currency then
    raise exception 'Paystack amount or currency does not match the payment record' using errcode = '22023';
  end if;

  if payment_row.status in ('held', 'refund_due', 'refund_pending', 'refunded') then
    return payment_row.status;
  end if;
  if payment_row.status <> 'pending' then
    return payment_row.status;
  end if;

  select * into membership_row
    from public.memberships
    where id = payment_row.membership_id
    for update;

  if not found then
    update public.payments
      set status = 'refund_due',
          provider_transaction_id = p_provider_transaction_id,
          paid_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      where id = payment_row.id;
    return 'refund_due';
  end if;

  if membership_row.status = 'pending_payment'
     and membership_row.seat_expires_at > pg_catalog.now() then
    update public.memberships
      set status = 'paid_and_held',
          seat_expires_at = null,
          updated_at = pg_catalog.now()
      where id = membership_row.id;

    update public.payments
      set status = 'held',
          provider_transaction_id = p_provider_transaction_id,
          paid_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      where id = payment_row.id;
    return 'held';
  end if;

  -- A late successful charge must not take a seat that has already been released.
  if membership_row.status = 'pending_payment' then
    update public.memberships
      set status = 'left',
          left_at = coalesce(left_at, pg_catalog.now()),
          seat_expires_at = null,
          updated_at = pg_catalog.now()
      where id = membership_row.id;

    update public.listings
      set seats_open = pg_catalog.least(seats_total, seats_open + 1),
          status = case when status = 'full' then 'active' else status end,
          updated_at = pg_catalog.now()
      where id = membership_row.listing_id;
  end if;

  update public.payments
    set status = 'refund_due',
        provider_transaction_id = p_provider_transaction_id,
        paid_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where id = payment_row.id;
  return 'refund_due';
end;
$$;

create or replace function public.release_failed_paystack_payment(p_provider_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_row public.payments%rowtype;
  membership_row public.memberships%rowtype;
begin
  select * into payment_row
    from public.payments
    where provider_reference = p_provider_reference
    for update;
  if not found or payment_row.status <> 'pending' then return; end if;

  update public.payments
    set status = 'failed', updated_at = pg_catalog.now()
    where id = payment_row.id;

  select * into membership_row
    from public.memberships
    where id = payment_row.membership_id
    for update;
  if found and membership_row.status = 'pending_payment' then
    update public.memberships
      set status = 'left',
          left_at = coalesce(left_at, pg_catalog.now()),
          seat_expires_at = null,
          updated_at = pg_catalog.now()
      where id = membership_row.id;

    update public.listings
      set seats_open = pg_catalog.least(seats_total, seats_open + 1),
          status = case when status = 'full' then 'active' else status end,
          updated_at = pg_catalog.now()
      where id = membership_row.listing_id;
  end if;
end;
$$;

create or replace function public.claim_paystack_refund(p_provider_reference text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
begin
  update public.payments
    set status = 'refund_pending', updated_at = pg_catalog.now()
    where provider_reference = p_provider_reference
      and status = 'refund_due'
    returning id into claimed_id;
  return claimed_id is not null;
end;
$$;

revoke all on function public.settle_paystack_payment(text, text, bigint, text) from public, anon, authenticated;
revoke all on function public.release_failed_paystack_payment(text) from public, anon, authenticated;
revoke all on function public.claim_paystack_refund(text) from public, anon, authenticated;
grant execute on function public.settle_paystack_payment(text, text, bigint, text) to service_role;
grant execute on function public.release_failed_paystack_payment(text) to service_role;
grant execute on function public.claim_paystack_refund(text) to service_role;
