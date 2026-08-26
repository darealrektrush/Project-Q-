-- Cover every foreign key introduced by the Bond campaign governance and
-- verification workflows. Indexes only: no rows, grants, campaign state,
-- rewards, certifications or evidence are changed.

create index if not exists campaign_readiness_approvals_founder_idx
  on public.campaign_readiness_approvals(campaign_id, founder_user_id);

create index if not exists campaign_ruleset_decisions_founder_idx
  on public.campaign_ruleset_decisions(campaign_id, founder_user_id);
create index if not exists campaign_ruleset_decisions_proposal_campaign_idx
  on public.campaign_ruleset_decisions(proposal_id, campaign_id);

create index if not exists campaign_ruleset_finalizations_founder_idx
  on public.campaign_ruleset_finalizations(campaign_id, finalized_by);
create index if not exists campaign_ruleset_finalizations_proposal_campaign_idx
  on public.campaign_ruleset_finalizations(proposal_id, campaign_id);

create index if not exists campaign_ruleset_proposals_founder_idx
  on public.campaign_ruleset_proposals(campaign_id, proposed_by);

create index if not exists telegram_trending_receipts_source_idx
  on public.telegram_trending_receipts(campaign_id, source_key);
create index if not exists telegram_trending_receipts_context_idx
  on public.telegram_trending_receipts(context_id);

create index if not exists telegram_trending_source_configs_founder_idx
  on public.telegram_trending_source_configs(campaign_id, configured_by);

create index if not exists verification_source_certifications_founder_idx
  on public.verification_source_certifications(campaign_id, certified_by);

create index if not exists website_vote_attempts_participation_event_idx
  on public.website_vote_attempts(participation_event_id);
