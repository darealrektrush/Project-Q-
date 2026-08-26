-- Register the five founder-confirmed Bond the Duck Telegram trending bots.
-- Registration is not certification: every row remains visibly pending until
-- its real receipt-verification path is evidenced and certified separately.
-- This migration does not activate the campaign or award XP.

do $register_bots$
declare
  matching_bots integer;
  registered_bot_total integer;
begin
  alter table public.verification_sources
    add column if not exists target_url text
    check (target_url is null or (
      char_length(target_url) between 9 and 2048 and target_url ~* '^https://'
    ));

  insert into public.verification_sources (
    campaign_id, source_key, classification, cooldown_seconds, health, checked_at, source, target_url
  ) values
    ('bond-the-duck-2026', 'telegram:majorbuybot', 'PROOF_SUPPORTED', 7200, 'PENDING_CERTIFICATION', null, 'event', 'https://t.me/majorbuybot'),
    ('bond-the-duck-2026', 'telegram:wtftrending', 'PROOF_SUPPORTED', 3600, 'PENDING_CERTIFICATION', null, 'event', 'https://t.me/wtftrending'),
    ('bond-the-duck-2026', 'telegram:trenchobot', 'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'event', 'https://t.me/trenchobot'),
    ('bond-the-duck-2026', 'telegram:bbtrendingbot', 'PROOF_SUPPORTED', 3600, 'PENDING_CERTIFICATION', null, 'event', 'https://t.me/BBtrendingbot'),
    ('bond-the-duck-2026', 'telegram:drokiatrendsbot', 'PROOF_SUPPORTED', 3600, 'PENDING_CERTIFICATION', null, 'event', 'https://t.me/drokiatrendsbot')
  on conflict (campaign_id, source_key) do nothing;

  select count(*) into matching_bots
  from public.verification_sources
  where campaign_id = 'bond-the-duck-2026'
    and source = 'event'
    and classification = 'PROOF_SUPPORTED'
    and cooldown_seconds = case source_key
      when 'telegram:majorbuybot' then 7200
      when 'telegram:wtftrending' then 3600
      when 'telegram:trenchobot' then 86400
      when 'telegram:bbtrendingbot' then 3600
      when 'telegram:drokiatrendsbot' then 3600
    end
    and health = 'PENDING_CERTIFICATION'
    and checked_at is null
    and target_url in (
      'https://t.me/majorbuybot', 'https://t.me/wtftrending', 'https://t.me/trenchobot',
      'https://t.me/BBtrendingbot', 'https://t.me/drokiatrendsbot'
    )
    and source_key in (
      'telegram:majorbuybot', 'telegram:wtftrending', 'telegram:trenchobot',
      'telegram:bbtrendingbot', 'telegram:drokiatrendsbot'
    );
  select count(*) into registered_bot_total
  from public.verification_sources
  where campaign_id = 'bond-the-duck-2026' and source = 'event';

  if matching_bots <> 5 or registered_bot_total <> 5 then
    raise exception 'Bond the Duck Telegram bot registry does not match the five approved handles';
  end if;
end;
$register_bots$;
