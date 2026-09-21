-- Cover every campaign-operations foreign key used by deletes and joins.
-- Index creation is non-activating and changes no campaign or ledger rows.

create index if not exists campaign_bagwork_events_cycle_idx
  on public.campaign_bagwork_events(campaign_id, cycle_id);
create index if not exists campaign_bagwork_events_submission_idx
  on public.campaign_bagwork_events(submission_id);
create index if not exists campaign_bagwork_events_xp_ledger_idx
  on public.campaign_bagwork_events(xp_ledger_id);

create index if not exists campaign_buy_to_earn_events_cycle_idx
  on public.campaign_buy_to_earn_events(campaign_id, cycle_id);
create index if not exists campaign_buy_to_earn_events_market_idx
  on public.campaign_buy_to_earn_events(campaign_id, venue_key);

create index if not exists campaign_funding_decisions_founder_idx
  on public.campaign_funding_decisions(campaign_id, founder_user_id);
create index if not exists campaign_funding_finalizations_founder_idx
  on public.campaign_funding_finalizations(campaign_id, finalized_by);
create index if not exists campaign_funding_proposals_founder_idx
  on public.campaign_funding_proposals(campaign_id, proposed_by);

create index if not exists campaign_holder_eligibility_profile_idx
  on public.campaign_holder_eligibility_events(campaign_id, profile_id);

create index if not exists campaign_impact_receipts_founder_idx
  on public.campaign_impact_receipts(campaign_id, recorded_by);
create index if not exists campaign_impact_receipts_identity_idx
  on public.campaign_impact_receipts(campaign_id, telegram_user_id);

create index if not exists campaign_top_contributor_identity_idx
  on public.campaign_top_contributor_finalizations(campaign_id, telegram_user_id);
create index if not exists campaign_top_contributor_founder_idx
  on public.campaign_top_contributor_finalizations(campaign_id, finalized_by);
create index if not exists campaign_top_contributor_profile_idx
  on public.campaign_top_contributor_finalizations(campaign_id, profile_id);

create index if not exists campaign_xp_exports_campaign_profile_idx
  on public.campaign_xp_exports(campaign_id, profile_id);
