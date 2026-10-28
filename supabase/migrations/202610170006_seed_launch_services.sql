-- Initial GrossThrift launch catalog. Existing services with the same name are left unchanged.
insert into public.services (name, category, logo_url, sharing_policy_note, is_active)
select seed.name, seed.category, null, seed.sharing_policy_note, true
from (values
  (
    'Netflix',
    'Streaming',
    'Only list a plan whose current terms expressly allow sharing with the intended members. Use the provider’s official invitation flow.'
  ),
  (
    'Spotify',
    'Music & Podcasts',
    'Only list a plan whose current terms expressly allow sharing with the intended members. Use the provider’s official invitation flow.'
  ),
  (
    'ChatGPT',
    'AI Tools',
    'Only list a plan whose current terms expressly allow adding the intended members. Never share account passwords.'
  ),
  (
    'YouTube',
    'Streaming',
    'Only list a plan whose current terms expressly allow sharing with the intended members. Use the provider’s official invitation flow.'
  ),
  (
    'Xbox',
    'Gaming',
    'Only list a plan whose current terms expressly allow sharing with the intended members. Use the provider’s official invitation flow.'
  ),
  (
    'Canva',
    'Productivity',
    'Only list a plan whose current terms expressly allow adding the intended members. Use the provider’s official invitation flow.'
  ),
  (
    'Adobe',
    'Productivity',
    'Only list a plan whose current terms expressly allow adding the intended members. Use the provider’s official invitation flow.'
  )
) as seed(name, category, sharing_policy_note)
where not exists (
  select 1
  from public.services as existing
  where lower(existing.name) = lower(seed.name)
);
