-- Cover the foreign keys introduced by the Bond the Duck reward flywheel.

create index if not exists burn_audit_log_proposal_id_idx
  on public.burn_audit_log(proposal_id);
create index if not exists burn_progress_events_campaign_id_idx
  on public.burn_progress_events(campaign_id);
create index if not exists burn_proposals_campaign_id_idx
  on public.burn_proposals(campaign_id);
create index if not exists burn_receipts_campaign_id_idx
  on public.burn_receipts(campaign_id);
create index if not exists campaign_referrals_bonus_xp_ledger_id_idx
  on public.campaign_referrals(bonus_xp_ledger_id);
create index if not exists campaign_referrals_campaign_code_idx
  on public.campaign_referrals(campaign_id, referral_code);
create index if not exists campaign_referrals_first_xp_ledger_id_idx
  on public.campaign_referrals(first_xp_ledger_id);
create index if not exists campaign_x_invites_bonus_xp_ledger_id_idx
  on public.campaign_x_invite_events(bonus_xp_ledger_id);
