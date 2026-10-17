-- GrossThrift MVP: prevent changing a listing price once a member is in the flow.
-- Run in Supabase SQL Editor after 202610170002_memberships_match_prd.sql.

create or replace function public.prevent_listing_price_change_with_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.price_per_seat is distinct from old.price_per_seat
     and exists (
       select 1
         from public.memberships
         where listing_id = old.id
           and status in (
             'pending_payment',
             'paid_and_held',
             'invited',
             'active',
             'disputed'
           )
     ) then
    raise exception 'Price cannot change while members are active in this split'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_listing_price_change_with_members() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
      from pg_trigger
      where tgrelid = 'public.listings'::regclass
        and tgname = 'listings_lock_price_with_members'
        and not tgisinternal
  ) then
    create trigger listings_lock_price_with_members
      before update of price_per_seat on public.listings
      for each row
      execute function public.prevent_listing_price_change_with_members();
  end if;
end;
$$;
