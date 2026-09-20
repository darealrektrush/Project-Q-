-- Harden Bond Buy-to-Earn market identity.
-- Bind every trade to the FAWKQ mint plus one exact approved market address.
-- No markets are enabled and no trade/position rows are created by this migration.

alter table public.campaign_buy_to_earn_markets
  add column if not exists token_mint text,
  add column if not exists market_address text,
  add column if not exists evidence_hash text;

update public.campaign_buy_to_earn_markets
set token_mint = coalesce(token_mint, 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump')
where campaign_id='bond-the-duck-2026';

alter table public.campaign_buy_to_earn_markets
  alter column token_mint set not null,
  alter column market_address set not null,
  alter column evidence_hash set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.campaign_buy_to_earn_markets'::regclass
      and conname='campaign_bte_market_token_mint_check'
  ) then
    alter table public.campaign_buy_to_earn_markets
      add constraint campaign_bte_market_token_mint_check
      check (token_mint = 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.campaign_buy_to_earn_markets'::regclass
      and conname='campaign_bte_market_address_check'
  ) then
    alter table public.campaign_buy_to_earn_markets
      add constraint campaign_bte_market_address_check
      check (market_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.campaign_buy_to_earn_markets'::regclass
      and conname='campaign_bte_market_evidence_hash_check'
  ) then
    alter table public.campaign_buy_to_earn_markets
      add constraint campaign_bte_market_evidence_hash_check
      check (evidence_hash ~ '^[0-9a-f]{64}$');
  end if;
end $$;

alter table public.campaign_buy_to_earn_events
  add column if not exists token_mint text,
  add column if not exists market_address text;

update public.campaign_buy_to_earn_events
set token_mint = coalesce(token_mint, 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump')
where campaign_id='bond-the-duck-2026';

alter table public.campaign_buy_to_earn_events
  alter column token_mint set not null,
  alter column market_address set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.campaign_buy_to_earn_events'::regclass
      and conname='campaign_bte_event_token_mint_check'
  ) then
    alter table public.campaign_buy_to_earn_events
      add constraint campaign_bte_event_token_mint_check
      check (token_mint = 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.campaign_buy_to_earn_events'::regclass
      and conname='campaign_bte_event_market_address_check'
  ) then
    alter table public.campaign_buy_to_earn_events
      add constraint campaign_bte_event_market_address_check
      check (market_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$');
  end if;
end $$;

revoke insert, update, delete on public.campaign_buy_to_earn_markets from service_role;
grant select on public.campaign_buy_to_earn_markets to service_role;

create or replace function public.register_campaign_buy_to_earn_market(
  p_campaign_id text,
  p_venue_key text,
  p_label text,
  p_market_address text,
  p_evidence_url text,
  p_evidence_hash text,
  p_verified_at timestamptz
) returns public.campaign_buy_to_earn_markets
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  existing public.campaign_buy_to_earn_markets;
  result public.campaign_buy_to_earn_markets;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_venue_key is null or p_venue_key !~ '^[a-z0-9][a-z0-9:_-]{1,63}$'
    or p_label is null or char_length(btrim(p_label)) not between 1 and 120
    or p_market_address is null or p_market_address !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    or p_evidence_url is null or p_evidence_url !~* '^https://'
    or p_evidence_hash is null or p_evidence_hash !~ '^[0-9a-f]{64}$'
    or p_verified_at is null or p_verified_at > now() + interval '5 minutes'
  then raise exception 'invalid Buy-to-Earn market registration'; end if;

  select * into campaign_row
  from public.campaigns where id=p_campaign_id for share;
  if not found or campaign_row.state not in ('DRAFT','READINESS_BLOCKED','FUNDED','SCHEDULED') then
    raise exception 'campaign state does not permit Buy-to-Earn market registration';
  end if;

  select * into existing
  from public.campaign_buy_to_earn_markets
  where campaign_id=p_campaign_id and venue_key=p_venue_key;

  if found then
    if existing.token_mint <> 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump'
      or existing.market_address <> p_market_address
      or existing.evidence_hash <> p_evidence_hash
      or existing.evidence_url <> p_evidence_url
    then
      raise exception 'Buy-to-Earn venue key already bound to different market evidence';
    end if;
    return existing;
  end if;

  insert into public.campaign_buy_to_earn_markets(
    campaign_id, venue_key, label, enabled,
    token_mint, market_address, evidence_url, evidence_hash, verified_at
  ) values (
    p_campaign_id, p_venue_key, btrim(p_label), false,
    'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump',
    p_market_address, p_evidence_url, p_evidence_hash, p_verified_at
  ) returning * into result;

  return result;
end;
$$;

create or replace function public.enable_campaign_buy_to_earn_market(
  p_campaign_id text,
  p_venue_key text
) returns public.campaign_buy_to_earn_markets
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  result public.campaign_buy_to_earn_markets;
begin
  select * into campaign_row
  from public.campaigns where id=p_campaign_id for share;
  if not found or campaign_row.state not in ('FUNDED','SCHEDULED') then
    raise exception 'Buy-to-Earn market can only be enabled after funding and before activation';
  end if;

  update public.campaign_buy_to_earn_markets
  set enabled=true, updated_at=now()
  where campaign_id=p_campaign_id
    and venue_key=p_venue_key
    and token_mint='GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump'
    and market_address is not null
    and evidence_url is not null
    and evidence_hash ~ '^[0-9a-f]{64}$'
    and verified_at >= now() - interval '72 hours'
  returning * into result;

  if not found then
    raise exception 'Buy-to-Earn market is missing current evidence';
  end if;
  return result;
end;
$$;

revoke all on function public.register_campaign_buy_to_earn_market(text,text,text,text,text,text,timestamptz)
  from public, anon, authenticated;
revoke all on function public.enable_campaign_buy_to_earn_market(text,text)
  from public, anon, authenticated;
grant execute on function public.register_campaign_buy_to_earn_market(text,text,text,text,text,text,timestamptz)
  to service_role;
grant execute on function public.enable_campaign_buy_to_earn_market(text,text)
  to service_role;

drop function if exists public.ingest_campaign_buy_to_earn_trade(
  text,bigint,uuid,text,text,text,bigint,timestamptz,text,bigint,numeric,text,text
);

create or replace function public.ingest_campaign_buy_to_earn_trade(
  p_campaign_id text,
  p_telegram_user_id bigint,
  p_profile_id uuid,
  p_reward_wallet text,
  p_source_event_id text,
  p_tx_signature text,
  p_slot bigint,
  p_block_time timestamptz,
  p_direction text,
  p_sol_lamports bigint,
  p_token_base_units numeric,
  p_venue_key text,
  p_token_mint text,
  p_market_address text,
  p_route text default null
) returns jsonb
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  identity_row public.identity_links;
  market_row public.campaign_buy_to_earn_markets;
  existing_row public.campaign_buy_to_earn_events;
  active_cycle integer;
  matching_rows integer;
  bought_base_units numeric(39,0);
  sold_base_units numeric(39,0);
  net_lamports_numeric numeric(39,0);
  net_lamports bigint;
  computed_tier integer;
  computed_weight integer;
  computed_eligible boolean;
  event_id bigint;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_telegram_user_id is null or p_telegram_user_id <= 0
    or p_profile_id is null
    or p_reward_wallet is null or p_reward_wallet !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    or p_source_event_id is null or p_source_event_id !~ '^[A-Za-z0-9:_-]{8,160}$'
    or p_tx_signature is null or p_tx_signature !~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'
    or p_slot is null or p_slot <= 0
    or p_block_time is null
    or p_direction not in ('BUY','SELL')
    or p_sol_lamports is null or p_sol_lamports <= 0
    or p_token_base_units is null or p_token_base_units <= 0
    or p_venue_key is null or p_venue_key !~ '^[a-z0-9][a-z0-9:_-]{1,63}$'
    or p_token_mint is distinct from 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump'
    or p_market_address is null or p_market_address !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    or (p_route is not null and char_length(p_route) not between 1 and 240)
  then raise exception 'invalid Buy-to-Earn trade fact'; end if;

  if p_block_time > now() + interval '5 minutes' then
    raise exception 'Buy-to-Earn trade fact is future-dated';
  end if;

  select * into campaign_row from public.campaigns where id=p_campaign_id;
  if not found or campaign_row.state not in ('ACTIVE','VERIFYING') then
    raise exception 'campaign is not accepting Buy-to-Earn trade facts';
  end if;

  select * into identity_row
  from public.identity_links
  where campaign_id=p_campaign_id and telegram_user_id=p_telegram_user_id;
  if not found
    or identity_row.profile_id is distinct from p_profile_id
    or identity_row.reward_wallet is distinct from p_reward_wallet
    or identity_row.wallet_verified_at is null
  then raise exception 'Buy-to-Earn trade fact is not bound to the verified campaign identity'; end if;

  select * into market_row
  from public.campaign_buy_to_earn_markets
  where campaign_id=p_campaign_id and venue_key=p_venue_key;
  if not found
    or not market_row.enabled
    or market_row.token_mint <> p_token_mint
    or market_row.market_address <> p_market_address
    or market_row.evidence_url is null
    or market_row.evidence_hash !~ '^[0-9a-f]{64}$'
    or market_row.verified_at is null
  then raise exception 'Buy-to-Earn market identity is not approved'; end if;

  select cycle_id into active_cycle
  from public.cycles
  where campaign_id=p_campaign_id and p_block_time>=opens_at and p_block_time<closes_at
  order by cycle_id limit 1;
  if active_cycle is null then raise exception 'Buy-to-Earn trade fact is outside an active campaign cycle'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id || ':buy-to-earn:' || p_reward_wallet,0));

  select count(*) into matching_rows
  from public.campaign_buy_to_earn_events
  where campaign_id=p_campaign_id and (source_event_id=p_source_event_id or tx_signature=p_tx_signature);
  if matching_rows>1 then raise exception 'conflicting Buy-to-Earn idempotency evidence exists'; end if;

  select * into existing_row
  from public.campaign_buy_to_earn_events
  where campaign_id=p_campaign_id and (source_event_id=p_source_event_id or tx_signature=p_tx_signature)
  order by id limit 1;

  if found then
    if existing_row.cycle_id<>active_cycle
      or existing_row.telegram_user_id<>p_telegram_user_id
      or existing_row.profile_id<>p_profile_id
      or existing_row.reward_wallet<>p_reward_wallet
      or existing_row.source_event_id<>p_source_event_id
      or existing_row.tx_signature<>p_tx_signature
      or existing_row.slot<>p_slot
      or existing_row.block_time<>p_block_time
      or existing_row.direction<>p_direction
      or existing_row.sol_lamports<>p_sol_lamports
      or existing_row.token_base_units<>p_token_base_units
      or existing_row.venue_key<>p_venue_key
      or existing_row.token_mint<>p_token_mint
      or existing_row.market_address<>p_market_address
      or existing_row.route is distinct from p_route
    then raise exception 'Buy-to-Earn idempotency key is bound to different trade terms'; end if;
    event_id:=existing_row.id;
  else
    insert into public.campaign_buy_to_earn_events(
      campaign_id,cycle_id,telegram_user_id,profile_id,reward_wallet,
      source_event_id,tx_signature,slot,block_time,direction,
      sol_lamports,token_base_units,venue_key,token_mint,market_address,route
    ) values(
      p_campaign_id,active_cycle,p_telegram_user_id,p_profile_id,p_reward_wallet,
      p_source_event_id,p_tx_signature,p_slot,p_block_time,p_direction,
      p_sol_lamports,p_token_base_units,p_venue_key,p_token_mint,p_market_address,p_route
    ) returning id into event_id;
  end if;

  select
    coalesce(sum(token_base_units) filter(where direction='BUY'),0),
    coalesce(sum(token_base_units) filter(where direction='SELL'),0),
    coalesce(sum(sol_lamports) filter(where direction='BUY'),0)
      - coalesce(sum(sol_lamports) filter(where direction='SELL'),0)
  into bought_base_units,sold_base_units,net_lamports_numeric
  from public.campaign_buy_to_earn_events
  where campaign_id=p_campaign_id and reward_wallet=p_reward_wallet;

  if net_lamports_numeric>9223372036854775807 or net_lamports_numeric< -9223372036854775808 then
    raise exception 'Buy-to-Earn net position exceeds bigint range';
  end if;

  net_lamports:=net_lamports_numeric::bigint;
  computed_tier:=case when net_lamports>=200000000 then 2 when net_lamports>=70000000 then 1 else null end;
  computed_weight:=case computed_tier when 2 then 3 when 1 then 1 else 0 end;
  computed_eligible:=computed_tier is not null;

  insert into public.positions(
    campaign_id,reward_wallet,eligible_bought_base_units,
    eligible_sold_base_units,net_buy_lamports,tier,weight,eligible
  ) values(
    p_campaign_id,p_reward_wallet,bought_base_units,sold_base_units,
    net_lamports,computed_tier,computed_weight,computed_eligible
  )
  on conflict(campaign_id,reward_wallet) do update
  set eligible_bought_base_units=excluded.eligible_bought_base_units,
      eligible_sold_base_units=excluded.eligible_sold_base_units,
      net_buy_lamports=excluded.net_buy_lamports,
      tier=excluded.tier,
      weight=excluded.weight,
      eligible=excluded.eligible;

  return jsonb_build_object(
    'eventId',event_id,'campaignId',p_campaign_id,'cycleId',active_cycle,
    'profileId',p_profile_id,'rewardWallet',p_reward_wallet,
    'venueKey',p_venue_key,'tokenMint',p_token_mint,'marketAddress',p_market_address,
    'netBuyLamports',net_lamports::text,'tier',computed_tier,'weight',computed_weight,
    'eligible',computed_eligible,'tier1ThresholdLamports','70000000',
    'tier2ThresholdLamports','200000000','replayed',existing_row.id is not null
  );
end;
$$;

revoke all on function public.ingest_campaign_buy_to_earn_trade(
  text,bigint,uuid,text,text,text,bigint,timestamptz,text,bigint,numeric,text,text,text,text
) from public, anon, authenticated;
grant execute on function public.ingest_campaign_buy_to_earn_trade(
  text,bigint,uuid,text,text,text,bigint,timestamptz,text,bigint,numeric,text,text,text,text
) to service_role;
