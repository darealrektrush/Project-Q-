-- Bond the Duck holder eligibility gate.
-- Persists server-verified FAWKQ holdings using raw Token-2022 balances and
-- fixed-scale USD pricing. Positive campaign XP is blocked unless the latest
-- recorded holder observation is eligible. This migration does not connect
-- wallets, move funds, activate Bond, or allocate rewards.

create table if not exists public.campaign_holder_eligibility_events (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  telegram_user_id bigint not null,
  profile_id uuid not null references public.crabstar_profiles(profile_id),
  reward_wallet text not null,
  token_account text,
  balance_base_units numeric(39,0) not null check (balance_base_units >= 0),
  price_usd_scaled numeric(39,0) not null check (price_usd_scaled > 0),
  price_scale smallint not null check (price_scale between 6 and 18),
  minimum_usd_cents integer not null default 200 check (minimum_usd_cents = 200),
  eligible boolean not null,
  observed_at timestamptz not null,
  source text not null default 'HELIUS_DAS_SOLANA_RPC',
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (campaign_id, telegram_user_id, observed_at)
);

create index if not exists campaign_holder_eligibility_latest_idx
  on public.campaign_holder_eligibility_events
    (campaign_id, telegram_user_id, observed_at desc, id desc);

create index if not exists campaign_holder_eligibility_wallet_idx
  on public.campaign_holder_eligibility_events
    (campaign_id, reward_wallet, observed_at desc, id desc);

alter table public.campaign_holder_eligibility_events enable row level security;
revoke all on public.campaign_holder_eligibility_events from public, anon, authenticated;
grant select, insert on public.campaign_holder_eligibility_events to service_role;
grant usage, select on sequence public.campaign_holder_eligibility_events_id_seq to service_role;

create trigger campaign_holder_eligibility_events_immutable
before update or delete on public.campaign_holder_eligibility_events
for each row execute function public.reject_campaign_ledger_mutation();

create or replace function public.record_campaign_holder_eligibility(
  p_campaign_id text,
  p_telegram_user_id bigint,
  p_profile_id uuid,
  p_reward_wallet text,
  p_token_account text,
  p_balance_base_units numeric,
  p_price_usd_scaled numeric,
  p_price_scale integer,
  p_observed_at timestamptz,
  p_idempotency_key text
) returns public.campaign_holder_eligibility_events
language plpgsql
security invoker
set search_path = '' as $$
declare
  identity_row public.identity_links;
  campaign_row public.campaigns;
  result public.campaign_holder_eligibility_events;
  computed_eligible boolean;
  threshold_product numeric(60,0);
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_telegram_user_id is null or p_telegram_user_id <= 0
    or p_profile_id is null
    or p_reward_wallet is null or p_reward_wallet !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    or (p_token_account is not null and p_token_account !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$')
    or p_balance_base_units is null or p_balance_base_units < 0
    or p_price_usd_scaled is null or p_price_usd_scaled <= 0
    or p_price_scale is null or p_price_scale not between 6 and 18
    or p_observed_at is null or p_observed_at > now() + interval '5 minutes'
    or p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid holder eligibility observation';
  end if;

  select * into result
  from public.campaign_holder_eligibility_events
  where idempotency_key = p_idempotency_key;
  if found then
    if result.campaign_id is distinct from p_campaign_id
      or result.telegram_user_id is distinct from p_telegram_user_id
      or result.profile_id is distinct from p_profile_id
      or result.reward_wallet is distinct from p_reward_wallet
      or result.token_account is distinct from p_token_account
      or result.balance_base_units is distinct from p_balance_base_units
      or result.price_usd_scaled is distinct from p_price_usd_scaled
      or result.price_scale is distinct from p_price_scale
      or result.observed_at is distinct from p_observed_at
    then
      raise exception 'holder eligibility idempotency key was reused';
    end if;
    return result;
  end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id;
  if not found or campaign_row.state in ('ARCHIVED','TERMINATED') then
    raise exception 'campaign is not accepting holder eligibility observations';
  end if;

  select * into identity_row
  from public.identity_links
  where campaign_id = p_campaign_id
    and telegram_user_id = p_telegram_user_id;

  if not found
    or identity_row.profile_id is distinct from p_profile_id
    or identity_row.reward_wallet is distinct from p_reward_wallet
    or identity_row.wallet_verified_at is null
    or identity_row.x_verified_at is null
  then
    raise exception 'holder eligibility is not bound to verified campaign identity';
  end if;

  -- balance is Token-2022 raw units (6 decimals).
  -- price_usd_scaled is USD/token * 10^price_scale.
  -- $2.00 threshold => 2 * 10^(6 + price_scale).
  threshold_product := 2::numeric * power(10::numeric, 6 + p_price_scale);
  computed_eligible := p_token_account is not null
    and (p_balance_base_units * p_price_usd_scaled) >= threshold_product;

  insert into public.campaign_holder_eligibility_events (
    campaign_id, telegram_user_id, profile_id, reward_wallet, token_account,
    balance_base_units, price_usd_scaled, price_scale, minimum_usd_cents,
    eligible, observed_at, idempotency_key
  ) values (
    p_campaign_id, p_telegram_user_id, p_profile_id, p_reward_wallet,
    p_token_account, p_balance_base_units, p_price_usd_scaled, p_price_scale,
    200, computed_eligible, p_observed_at, p_idempotency_key
  )
  returning * into result;

  if p_token_account is not null then
    update public.identity_links
    set fawkq_token_account = p_token_account
    where campaign_id = p_campaign_id
      and telegram_user_id = p_telegram_user_id
      and reward_wallet = p_reward_wallet;
  end if;

  return result;
end;
$$;

revoke all on function public.record_campaign_holder_eligibility(
  text,bigint,uuid,text,text,numeric,numeric,integer,timestamptz,text
) from public, anon, authenticated;
grant execute on function public.record_campaign_holder_eligibility(
  text,bigint,uuid,text,text,numeric,numeric,integer,timestamptz,text
) to service_role;

create or replace function public.enforce_bond_holder_eligibility_for_xp()
returns trigger
language plpgsql
security invoker
set search_path = '' as $$
declare
  latest_eligibility public.campaign_holder_eligibility_events;
begin
  if new.campaign_id <> 'bond-the-duck-2026' or new.amount <= 0 then
    return new;
  end if;

  select * into latest_eligibility
  from public.campaign_holder_eligibility_events
  where campaign_id = new.campaign_id
    and telegram_user_id = new.telegram_user_id
  order by observed_at desc, id desc
  limit 1;

  if not found or not latest_eligibility.eligible then
    raise exception 'participant does not satisfy the $2 FAWKQ holder gate';
  end if;

  return new;
end;
$$;

drop trigger if exists xp_ledger_bond_holder_eligibility
  on public.xp_ledger;
create trigger xp_ledger_bond_holder_eligibility
before insert on public.xp_ledger
for each row execute function public.enforce_bond_holder_eligibility_for_xp();

revoke all on function public.enforce_bond_holder_eligibility_for_xp()
  from public, anon, authenticated;
