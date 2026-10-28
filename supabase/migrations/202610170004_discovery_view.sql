-- Public listing discovery data for the PRD's Official/Community filter and Host rating sort.
-- SECURITY INVOKER keeps the underlying listings, services, and profiles RLS policies in force.
create or replace view public.listings_with_host
with (security_invoker = true)
as
select
  l.id,
  l.host_type,
  l.service_id,
  l.plan_type,
  l.total_cost,
  l.billing_cycle,
  l.seats_total,
  l.seats_open,
  l.price_per_seat,
  l.description,
  l.rules,
  l.status,
  l.visibility,
  l.created_at,
  s.name as service_name,
  s.category as service_category,
  s.logo_url as service_logo_url,
  s.sharing_policy_note,
  case
    when l.host_type = 'official' then 'GrossThrift'
    else p.display_name
  end as host_display_name,
  case when l.host_type = 'official' then null else p.avatar_url end as host_avatar_url,
  p.rating_avg as host_rating_avg,
  coalesce(p.completed_splits, 0) as host_completed_splits
from public.listings as l
join public.services as s on s.id = l.service_id
left join public.profiles as p on p.id = l.host_id;

grant select on public.listings_with_host to anon, authenticated;
