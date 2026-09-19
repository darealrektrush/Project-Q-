-- Project Q-owned aggregate campaign intelligence contract.
-- Returns team-safe counts/totals only; no member identities, wallet addresses,
-- proof bodies, X identities, or reward destinations are exposed.

create or replace function public.project_q_campaign_intelligence(
  p_campaign_id text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_state text;
  v_result jsonb;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = '' or length(p_campaign_id) > 96 then
    raise exception 'invalid campaign id';
  end if;

  select state into v_state
  from public.campaigns
  where id = p_campaign_id;

  if v_state is null then
    raise exception 'unknown campaign';
  end if;

  select jsonb_build_object(
    'campaign_id', p_campaign_id,
    'campaign_state', v_state,
    'generated_at', now(),
    'identity', jsonb_build_object(
      'enrolled', (
        select count(*) from public.identity_links
        where campaign_id = p_campaign_id
      ),
      'x_verified', (
        select count(*) from public.identity_links
        where campaign_id = p_campaign_id and x_verified_at is not null
      ),
      'wallet_verified', (
        select count(*) from public.identity_links
        where campaign_id = p_campaign_id and wallet_verified_at is not null
      ),
      'token_account_ready', (
        select count(*) from public.identity_links
        where campaign_id = p_campaign_id and fawkq_token_account is not null
      )
    ),
    'xp', jsonb_build_object(
      'participants', (
        select count(distinct telegram_user_id)
        from public.xp_ledger
        where campaign_id = p_campaign_id and amount > 0
      ),
      'total', (
        select coalesce(sum(amount), 0)
        from public.xp_ledger
        where campaign_id = p_campaign_id
      ),
      'awards', (
        select count(*)
        from public.xp_ledger
        where campaign_id = p_campaign_id and amount > 0
      )
    ),
    'raid_evidence', jsonb_build_object(
      'credited', (
        select count(*) from public.campaign_raid_events
        where campaign_id = p_campaign_id and credited = true
      ),
      'pending', (
        select count(*) from public.campaign_raid_events
        where campaign_id = p_campaign_id and credited = false and reason is null
      ),
      'rejected_or_capped', (
        select count(*) from public.campaign_raid_events
        where campaign_id = p_campaign_id and credited = false and reason is not null
      )
    ),
    'participation_evidence', jsonb_build_object(
      'votes_credited', (
        select count(*) from public.campaign_participation_events
        where campaign_id = p_campaign_id and source = 'vote' and credited = true
      ),
      'votes_pending', (
        select count(*) from public.campaign_participation_events
        where campaign_id = p_campaign_id and source = 'vote'
          and credited = false and reason is null
      ),
      'votes_rejected_or_capped', (
        select count(*) from public.campaign_participation_events
        where campaign_id = p_campaign_id and source = 'vote'
          and credited = false and reason is not null
      ),
      'trending_credited', (
        select count(*) from public.campaign_participation_events
        where campaign_id = p_campaign_id and source = 'event' and credited = true
      ),
      'trending_pending', (
        select count(*) from public.campaign_participation_events
        where campaign_id = p_campaign_id and source = 'event'
          and credited = false and reason is null
      ),
      'trending_rejected_or_capped', (
        select count(*) from public.campaign_participation_events
        where campaign_id = p_campaign_id and source = 'event'
          and credited = false and reason is not null
      )
    ),
    'buy_to_earn', jsonb_build_object(
      'tracked_positions', (
        select count(*) from public.positions
        where campaign_id = p_campaign_id
      ),
      'eligible_positions', (
        select count(*) from public.positions
        where campaign_id = p_campaign_id and eligible = true
      )
    ),
    'rewards', jsonb_build_object(
      'allocations', (
        select count(*) from public.allocations
        where campaign_id = p_campaign_id
      ),
      'allocated_base_units', (
        select coalesce(sum(gross_base_units), 0)::text
        from public.allocations
        where campaign_id = p_campaign_id
      ),
      'releases', (
        select count(*)
        from public.releases r
        join public.allocations a on a.id = r.allocation_id
        where a.campaign_id = p_campaign_id
      ),
      'paid_releases', (
        select count(*)
        from public.releases r
        join public.allocations a on a.id = r.allocation_id
        where a.campaign_id = p_campaign_id and r.status in ('paid','recovered')
      )
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.project_q_campaign_intelligence(text)
  from public, anon, authenticated;
grant execute on function public.project_q_campaign_intelligence(text)
  to service_role;

comment on function public.project_q_campaign_intelligence(text) is
  'Project Q-owned aggregate campaign intelligence for trusted backend consumers. No member-level identities or wallet data.';
