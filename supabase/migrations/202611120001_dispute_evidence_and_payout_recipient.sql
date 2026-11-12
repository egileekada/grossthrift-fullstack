-- Adds dispute screenshot evidence URLs and Paystack bank verification metadata

alter table public.disputes
  add column if not exists evidence_urls text[] not null default '{}';

alter table public.wallets
  add column if not exists bank_code text,
  add column if not exists bank_verified boolean not null default false,
  add column if not exists provider_recipient_code text;

