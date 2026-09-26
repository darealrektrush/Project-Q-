-- The receipt verifier expects @WTFTrendingBot. The previously registered
-- @wtftrending URL opens its announcement channel instead of the voting bot.
-- Correct the target only while the campaign is draft and this source has no
-- certification; this does not change classification, health, or acceptance.
do $correct_wtf_trending_target$
declare
  current_target text;
  campaign_state text;
begin
  select v.target_url, c.state
    into strict current_target, campaign_state
  from public.verification_sources v
  join public.campaigns c on c.id = v.campaign_id
  where v.campaign_id = 'bond-the-duck-2026'
    and v.source_key = 'telegram:wtftrending'
    and v.source = 'event'
    and v.classification = 'PROOF_SUPPORTED';

  if campaign_state <> 'DRAFT' then
    raise exception 'WTF Trending target correction requires a draft campaign';
  end if;
  if current_target not in ('https://t.me/wtftrending', 'https://t.me/wtftrendingbot') then
    raise exception 'WTF Trending target has changed unexpectedly';
  end if;
  if exists (
    select 1 from public.verification_source_certifications
    where campaign_id = 'bond-the-duck-2026'
      and source_key = 'telegram:wtftrending'
  ) then
    raise exception 'WTF Trending source already has certification evidence';
  end if;

  update public.verification_sources
  set target_url = 'https://t.me/wtftrendingbot'
  where campaign_id = 'bond-the-duck-2026'
    and source_key = 'telegram:wtftrending'
    and target_url is distinct from 'https://t.me/wtftrendingbot';
end;
$correct_wtf_trending_target$;
