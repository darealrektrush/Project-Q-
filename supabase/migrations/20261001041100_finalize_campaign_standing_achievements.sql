-- Finalized standings become immutable achievement receipts in the same
-- transaction that records campaign completion. Live standings remain
-- provisional and never write earned records.

create or replace function public.record_final_campaign_standing_achievements()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.state <> 'COMPLETED' or old.state = 'COMPLETED' then
    return new;
  end if;

  with participant_xp as (
    select
      totals.campaign_id,
      totals.telegram_user_id,
      identity.profile_id,
      sum(totals.xp)::bigint as campaign_xp
    from public.campaign_xp_totals totals
    join public.identity_links identity
      on identity.campaign_id = totals.campaign_id
      and identity.telegram_user_id = totals.telegram_user_id
      and identity.x_verified_at is not null
      and identity.profile_id is not null
    where totals.campaign_id = new.id
    group by totals.campaign_id, totals.telegram_user_id, identity.profile_id
    having sum(totals.xp) > 0
  ), ranked as (
    select
      participant_xp.*,
      row_number() over (order by campaign_xp desc, telegram_user_id asc) as final_rank,
      count(*) over () as eligible_participant_count
    from participant_xp
  ), awards as (
    select ranked.*, 'top-10-percent'::text as achievement_id
    from ranked
    where final_rank <= ceil(eligible_participant_count * 0.10)
    union all
    select ranked.*, 'top-5-percent'::text
    from ranked
    where final_rank <= ceil(eligible_participant_count * 0.05)
    union all
    select ranked.*, 'top-1-percent'::text
    from ranked
    where final_rank <= ceil(eligible_participant_count * 0.01)
    union all
    select ranked.*, 'top-100'::text
    from ranked
    where final_rank <= 100
    union all
    select ranked.*, 'top-10'::text
    from ranked
    where final_rank <= 10
    union all
    select ranked.*, 'champion'::text
    from ranked
    where final_rank = 1
  ), award_counts as (
    select achievement_id, count(*)::bigint as holder_count
    from awards
    group by achievement_id
  )
  insert into public.campaign_achievement_records (
    campaign_id, profile_id, telegram_user_id, operation_key, achievement_id,
    collection_key, rarity_tier, criteria_version, verification_source, source_ref,
    result, verified_at
  )
  select
    award.campaign_id,
    award.profile_id,
    award.telegram_user_id,
    'operation-01',
    award.achievement_id,
    'standings',
    case
      when counts.holder_count::numeric / award.eligible_participant_count <= 0.01 then 'legendary'
      when counts.holder_count::numeric / award.eligible_participant_count <= 0.05 then 'elite'
      when counts.holder_count::numeric / award.eligible_participant_count <= 0.10 then 'rare'
      when counts.holder_count::numeric / award.eligible_participant_count <= 0.25 then 'advanced'
      else 'standard'
    end,
    'bond-final-standing-v1',
    'finalized_campaign_standings',
    'final-standing:v1:' || award.campaign_id || ':' || award.profile_id::text || ':' || award.achievement_id,
    jsonb_build_object(
      'final_rank', award.final_rank,
      'campaign_xp', award.campaign_xp,
      'eligible_participant_count', award.eligible_participant_count,
      'holder_count', counts.holder_count,
      'holder_share_percent', round(counts.holder_count::numeric * 100 / award.eligible_participant_count, 2)
    ),
    new.updated_at
  from awards award
  join award_counts counts using (achievement_id)
  on conflict (campaign_id, profile_id, operation_key, achievement_id) do nothing;

  return new;
end;
$$;
revoke all on function public.record_final_campaign_standing_achievements()
  from public, anon, authenticated;

drop trigger if exists campaign_final_standing_achievements
  on public.campaigns;
create trigger campaign_final_standing_achievements
after update of state on public.campaigns
for each row
when (new.state = 'COMPLETED' and old.state is distinct from new.state)
execute function public.record_final_campaign_standing_achievements();
