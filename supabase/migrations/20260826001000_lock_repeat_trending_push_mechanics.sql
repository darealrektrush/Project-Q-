-- Lock the approved repeat-voting flywheel without activating the campaign.
-- Every accepted Telegram-bot receipt remains in campaign_participation_events
-- as one Trending Push. XP settlement uses a dedicated 20 XP daily bucket.

alter table public.xp_ledger
  drop constraint if exists xp_ledger_cap_bucket_check;
alter table public.xp_ledger
  add constraint xp_ledger_cap_bucket_check
  check (cap_bucket in ('participation','mission','trending','other'));

update public.verification_sources
set cooldown_seconds = case source_key
  when 'telegram:majorbuybot' then 7200
  when 'telegram:wtftrending' then 3600
  when 'telegram:trenchobot' then 86400
  when 'telegram:bbtrendingbot' then 3600
  when 'telegram:drokiatrendsbot' then 3600
end
where campaign_id = 'bond-the-duck-2026'
  and source = 'event'
  and source_key in (
    'telegram:majorbuybot', 'telegram:wtftrending', 'telegram:trenchobot',
    'telegram:bbtrendingbot', 'telegram:drokiatrendsbot'
  );

create index if not exists campaign_participation_events_trending_rank_idx
  on public.campaign_participation_events(campaign_id, telegram_user_id, verified_at)
  where source = 'event' and credited = true;

comment on index public.campaign_participation_events_trending_rank_idx is
  'Supports the verified Trending Push leaderboard; one accepted event equals one push.';
