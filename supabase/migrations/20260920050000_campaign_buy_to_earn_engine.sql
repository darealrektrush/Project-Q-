-- Bond the Duck Buy-to-Earn v1.
-- Oracle remains the sole wallet/transaction intelligence authority. Project Q
-- accepts only authenticated, finalized trade facts and deterministically
-- maintains campaign positions. This migration does not allocate rewards,
-- activate the campaign, enable markets, or move funds.

create table if not exists public.campaign_buy_to_earn_markets (
  campaign_id text not null references public.campaigns(id),
  venue_key text not null
    check (venue_key ~ '^[a-z0-9][a-z0-9:_-]{1,63}$'),
  label text not null check (char_length(label) between 1 and 120),
  enabled boolean not null default false,
  evidence_url text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, venue_key),
  check (
    not enabled
    or (evidence_url is not null and verified_at is not null)
  )
);

create table if not exists public.campaign_buy_to_earn_events (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  cycle_id integer not null,
  telegram_user_id bigint not null,
  profile_id uuid not null,
  reward_wallet text not null,
  source_event_id text not null
    check (source_event_id ~ '^[A-Za-z0-9:_-]{8,160}$'),
  tx_signature text not null
    check (tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  slot bigint not null check (slot > 0),
  block_time timestamptz not null,
  direction text not null check (direction in ('BUY','SELL')),
  sol_lamports bigint not null check (sol_lamports > 0),
  token_base_units numeric(39,0) not null check (token_base_units > 0),
  venue_key text not null,
  route text check (route is null or char_length(route) between 1 and 240),
  created_at timestamptz not null default now(),
  unique (campaign_id, source_event_id),
  unique (campaign_id, tx_signature),
  foreign key (campaign_id, cycle_id)
    references public.cycles(campaign_id, cycle_id),
  foreign key (campaign_id, venue_key)
    references public.campaign_buy_to_earn_markets(campaign_id, venue_key),
  foreign key (campaign_id, profile_id)
    references public.identity_links(campaign_id, profile_id)
);

create index if not exists campaign_buy_to_earn_events_wallet_idx
  on public.campaign_buy_to_earn_events(campaign_id, reward_wallet, block_time, id);

create index if not exists campaign_buy_to_earn_events_profile_idx
  on public.campaign_buy_to_earn_events(campaign_id, profile_id, block_time, id);

alter table public.campaign_buy_to_earn_markets enable row level security;
alter table public.campaign_buy_to_earn_events enable row level security;

revoke all on public.campaign_buy_to_earn_markets from public, anon, authenticated;
revoke all on public.campaign_buy_to_earn_events from public, anon, authenticated;

grant select, insert, update, delete on public.campaign_buy_to_earn_markets to service_role;
grant select, insert on public.campaign_buy_to_earn_events to service_role;
grant usage, select on sequence public.campaign_buy_to_earn_events_id_seq to service_role;

create or replace function public.reject_campaign_buy_to_earn_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = '' as $$
begin
  raise exception 'campaign_buy_to_earn_events is append-only';
end;
$$;

drop trigger if exists campaign_buy_to_earn_events_immutable
  on public.campaign_buy_to_earn_events;
create trigger campaign_buy_to_earn_events_immutable
before update or delete on public.campaign_buy_to_earn_events
for each row execute function public.reject_campaign_buy_to_earn_event_mutation();

revoke all on function public.reject_campaign_buy_to_earn_event_mutation()
  from public, anon, authenticated;

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
    or p_reward_wallet is null
      or p_reward_wallet !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    or p_source_event_id is null
      or p_source_event_id !~ '^[A-Za-z0-9:_-]{8,160}$'
    or p_tx_signature is null
      or p_tx_signature !~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'
    or p_slot is null or p_slot <= 0
    or p_block_time is null
    or p_direction not in ('BUY','SELL')
    or p_sol_lamports is null or p_sol_lamports <= 0
    or p_token_base_units is null or p_token_base_units <= 0
    or p_venue_key is null
      or p_venue_key !~ '^[a-z0-9][a-z0-9:_-]{1,63}$'
    or (p_route is not null and char_length(p_route) not between 1 and 240)
  then
    raise exception 'invalid Buy-to-Earn trade fact';
  end if;

  if p_block_time > now() + interval '5 minutes' then
    raise exception 'Buy-to-Earn trade fact is future-dated';
  end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id;

  if not found or campaign_row.state not in ('ACTIVE','VERIFYING') then
    raise exception 'campaign is not accepting Buy-to-Earn trade facts';
  end if;

  select * into identity_row
  from public.identity_links
  where campaign_id = p_campaign_id
    and telegram_user_id = p_telegram_user_id;

  if not found
    or identity_row.profile_id is distinct from p_profile_id
    or identity_row.reward_wallet is distinct from p_reward_wallet
    or identity_row.wallet_verified_at is null
  then
    raise exception 'Buy-to-Earn trade fact is not bound to the verified campaign identity';
  end if;

  select * into market_row
  from public.campaign_buy_to_earn_markets
  where campaign_id = p_campaign_id
    and venue_key = p_venue_key;

  if not found
    or not market_row.enabled
    or market_row.evidence_url is null
    or market_row.verified_at is null
  then
    raise exception 'Buy-to-Earn venue is not approved';
  end if;

  select cycle_id into active_cycle
  from public.cycles
  where campaign_id = p_campaign_id
    and p_block_time >= opens_at
    and p_block_time < closes_at
  order by cycle_id
  limit 1;

  if active_cycle is null then
    raise exception 'Buy-to-Earn trade fact is outside an active campaign cycle';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_campaign_id || ':buy-to-earn:' || p_reward_wallet, 0)
  );

  select count(*) into matching_rows
  from public.campaign_buy_to_earn_events
  where campaign_id = p_campaign_id
    and (source_event_id = p_source_event_id or tx_signature = p_tx_signature);

  if matching_rows > 1 then
    raise exception 'conflicting Buy-to-Earn idempotency evidence exists';
  end if;

  select * into existing_row
  from public.campaign_buy_to_earn_events
  where campaign_id = p_campaign_id
    and (source_event_id = p_source_event_id or tx_signature = p_tx_signature)
  order by id
  limit 1;

  if found then
    if existing_row.cycle_id <> active_cycle
      or existing_row.telegram_user_id <> p_telegram_user_id
      or existing_row.profile_id <> p_profile_id
      or existing_row.reward_wallet <> p_reward_wallet
      or existing_row.source_event_id <> p_source_event_id
      or existing_row.tx_signature <> p_tx_signature
      or existing_row.slot <> p_slot
      or existing_row.block_time <> p_block_time
      or existing_row.direction <> p_direction
      or existing_row.sol_lamports <> p_sol_lamports
      or existing_row.token_base_units <> p_token_base_units
      or existing_row.venue_key <> p_venue_key
      or existing_row.route is distinct from p_route
    then
      raise exception 'Buy-to-Earn idempotency key is bound to different trade terms';
    end if;
    event_id := existing_row.id;
  else
    insert into public.campaign_buy_to_earn_events (
      campaign_id, cycle_id, telegram_user_id, profile_id, reward_wallet,
      source_event_id, tx_signature, slot, block_time, direction,
      sol_lamports, token_base_units, venue_key, route
    ) values (
      p_campaign_id, active_cycle, p_telegram_user_id, p_profile_id,
      p_reward_wallet, p_source_event_id, p_tx_signature, p_slot,
      p_block_time, p_direction, p_sol_lamports, p_token_base_units,
      p_venue_key, p_route
    )
    returning id into event_id;
  end if;

  select
    coalesce(sum(token_base_units) filter (where direction = 'BUY'), 0),
    coalesce(sum(token_base_units) filter (where direction = 'SELL'), 0),
    coalesce(sum(sol_lamports) filter (where direction = 'BUY'), 0)
      - coalesce(sum(sol_lamports) filter (where direction = 'SELL'), 0)
  into bought_base_units, sold_base_units, net_lamports_numeric
  from public.campaign_buy_to_earn_events
  where campaign_id = p_campaign_id
    and reward_wallet = p_reward_wallet;

  if net_lamports_numeric > 9223372036854775807
    or net_lamports_numeric < -9223372036854775808
  then
    raise exception 'Buy-to-Earn net position exceeds bigint range';
  end if;

  net_lamports := net_lamports_numeric::bigint;
  computed_tier := case
    when net_lamports >= 200000000 then 2
    when net_lamports >= 70000000 then 1
    else null
  end;
  computed_weight := case computed_tier when 2 then 3 when 1 then 1 else 0 end;
  computed_eligible := computed_tier is not null;

  insert into public.positions (
    campaign_id, reward_wallet, eligible_bought_base_units,
    eligible_sold_base_units, net_buy_lamports, tier, weight, eligible
  ) values (
    p_campaign_id, p_reward_wallet, bought_base_units, sold_base_units,
    net_lamports, computed_tier, computed_weight, computed_eligible
  )
  on conflict (campaign_id, reward_wallet) do update
  set eligible_bought_base_units = excluded.eligible_bought_base_units,
      eligible_sold_base_units = excluded.eligible_sold_base_units,
      net_buy_lamports = excluded.net_buy_lamports,
      tier = excluded.tier,
      weight = excluded.weight,
      eligible = excluded.eligible;

  return jsonb_build_object(
    'eventId', event_id,
    'campaignId', p_campaign_id,
    'cycleId', active_cycle,
    'profileId', p_profile_id,
    'rewardWallet', p_reward_wallet,
    'netBuyLamports', net_lamports::text,
    'tier', computed_tier,
    'weight', computed_weight,
    'eligible', computed_eligible,
    'tier1ThresholdLamports', '70000000',
    'tier2ThresholdLamports', '200000000',
    'replayed', existing_row.id is not null
  );
end;
$$;

revoke all on function public.ingest_campaign_buy_to_earn_trade(
  text,bigint,uuid,text,text,text,bigint,timestamptz,text,bigint,numeric,text,text
) from public, anon, authenticated;

grant execute on function public.ingest_campaign_buy_to_earn_trade(
  text,bigint,uuid,text,text,text,bigint,timestamptz,text,bigint,numeric,text,text
) to service_role;
