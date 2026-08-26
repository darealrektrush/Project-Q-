-- Register the nine founder-supplied Bond the Duck voting destinations.
-- These are target registrations only: none is marked healthy, certified or
-- XP-eligible until its real voting and receipt behavior is tested.

do $register_voting_websites$
declare
  matching_websites integer;
  registered_website_total integer;
begin
  insert into public.verification_sources (
    campaign_id, source_key, classification, cooldown_seconds, health,
    checked_at, source, target_url
  ) values
    ('bond-the-duck-2026', 'web:geckoterminal', 'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'vote', 'https://www.geckoterminal.com/solana/pools/5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM'),
    ('bond-the-duck-2026', 'web:top100token', 'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'vote', 'https://top100token.com/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump'),
    ('bond-the-duck-2026', 'web:coinmooner', 'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'vote', 'https://coinmooner.com/coins/fawk-q-fawkq'),
    ('bond-the-duck-2026', 'web:gemfinder', 'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'vote', 'https://gemfinder.cc/gem/29742'),
    ('bond-the-duck-2026', 'web:coinsniper', 'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'vote', 'https://coinsniper.net/coin/92949'),
    ('bond-the-duck-2026', 'web:coinmun', 'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'vote', 'https://coinmun.com/coins/fawk-q'),
    ('bond-the-duck-2026', 'web:coinboom', 'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'vote', 'https://coinboom.net/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump'),
    ('bond-the-duck-2026', 'web:coinbuzzer', 'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'vote', 'https://coinbuzzer.me/coin/860'),
    ('bond-the-duck-2026', 'web:coinscope', 'PROOF_SUPPORTED', 86400, 'PENDING_CERTIFICATION', null, 'vote', 'https://www.coinscope.co/coin/fawkq')
  on conflict (campaign_id, source_key) do nothing;

  select count(*) into matching_websites
  from public.verification_sources
  where campaign_id = 'bond-the-duck-2026'
    and source = 'vote'
    and classification = 'PROOF_SUPPORTED'
    and cooldown_seconds = 86400
    and health = 'PENDING_CERTIFICATION'
    and checked_at is null
    and (source_key, target_url) in (
      ('web:geckoterminal', 'https://www.geckoterminal.com/solana/pools/5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM'),
      ('web:top100token', 'https://top100token.com/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump'),
      ('web:coinmooner', 'https://coinmooner.com/coins/fawk-q-fawkq'),
      ('web:gemfinder', 'https://gemfinder.cc/gem/29742'),
      ('web:coinsniper', 'https://coinsniper.net/coin/92949'),
      ('web:coinmun', 'https://coinmun.com/coins/fawk-q'),
      ('web:coinboom', 'https://coinboom.net/solana/GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump'),
      ('web:coinbuzzer', 'https://coinbuzzer.me/coin/860'),
      ('web:coinscope', 'https://www.coinscope.co/coin/fawkq')
    );
  select count(*) into registered_website_total
  from public.verification_sources
  where campaign_id = 'bond-the-duck-2026' and source = 'vote';

  if matching_websites <> 9 or registered_website_total <> 9 then
    raise exception 'Bond the Duck website registry does not match the nine approved voting URLs';
  end if;
end;
$register_voting_websites$;
