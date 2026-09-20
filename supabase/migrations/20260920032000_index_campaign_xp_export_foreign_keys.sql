-- Cover campaign XP export foreign keys used by retention checks and joins.
create index if not exists campaign_xp_exports_campaign_id_idx
  on public.campaign_xp_exports (campaign_id);

create index if not exists campaign_xp_exports_profile_id_idx
  on public.campaign_xp_exports (profile_id);
