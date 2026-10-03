-- Project Q stores verified vault deposits independently of campaign XP or impact spending.
create table public.ocean_contribution_receipts (
  id bigint generated always as identity primary key,
  network text not null default 'solana-mainnet' check (network = 'solana-mainnet'),
  campaign_id text not null,
  telegram_user_id bigint not null,
  profile_id uuid not null,
  source_wallet text not null,
  vault_address text not null check (vault_address = 'J9J6MsSxicqmwTuzJGHitVUuUhRwP4iaDdTRgMAUDj4p'),
  transaction_signature text not null check (transaction_signature ~ '^[1-9A-HJ-NP-Za-km-z]{80,90}$'),
  asset text not null check (asset in ('SOL', 'USDC', 'FAWKQ')),
  amount_base_units numeric(20,0) not null check (amount_base_units > 0 and amount_base_units <= 18446744073709551615),
  decimals smallint not null check ((asset = 'SOL' and decimals = 9) or (asset in ('USDC','FAWKQ') and decimals = 6)),
  slot bigint not null check (slot > 0),
  block_time timestamptz not null,
  proof_version integer not null default 1 check (proof_version = 1),
  founder_deposit boolean not null,
  verified_at timestamptz not null default now(),
  unique (network, transaction_signature, asset)
);

create index ocean_contribution_receipts_profile_idx on public.ocean_contribution_receipts (profile_id, verified_at desc);
create index ocean_contribution_receipts_campaign_idx on public.ocean_contribution_receipts (campaign_id, verified_at desc);

alter table public.ocean_contribution_receipts enable row level security;
revoke all on table public.ocean_contribution_receipts from public, anon, authenticated, service_role;
grant select on table public.ocean_contribution_receipts to service_role;

-- Only the backend's service key can call this; it verifies the chain proof before doing so.
-- The function rechecks the canonical identity and wallet and rejects replays with changed facts.
create function public.record_ocean_contribution(
  p_campaign_id text, p_telegram_user_id bigint, p_wallet text,
  p_signature text, p_slot bigint, p_block_time timestamptz, p_transfers jsonb
) returns setof public.ocean_contribution_receipts
language plpgsql security definer set search_path = '' as $$
declare
  v_identity record;
  v_founder boolean;
  v_transfer jsonb;
  v_asset text;
  v_amount numeric;
  v_decimals integer;
  v_row public.ocean_contribution_receipts%rowtype;
begin
  if p_campaign_id is null or p_wallet is null or p_signature !~ '^[1-9A-HJ-NP-Za-km-z]{80,90}$'
    or p_slot is null or p_slot <= 0 or p_block_time is null or p_block_time > now() + interval '5 minutes'
    or jsonb_typeof(p_transfers) is distinct from 'array' or jsonb_array_length(p_transfers) not between 1 and 3 then
    raise exception 'invalid ocean contribution proof';
  end if;
  select profile_id, reward_wallet, wallet_verified_at into v_identity
    from public.identity_links where campaign_id = p_campaign_id and telegram_user_id = p_telegram_user_id;
  if not found or v_identity.profile_id is null or v_identity.wallet_verified_at is null
    or v_identity.reward_wallet is distinct from p_wallet then
    raise exception 'verified campaign wallet and profile required';
  end if;
  select exists(select 1 from public.campaign_founders where campaign_id = p_campaign_id
    and founder_user_id = p_telegram_user_id and enabled) into v_founder;
  for v_transfer in select value from jsonb_array_elements(p_transfers) loop
    if jsonb_typeof(v_transfer) <> 'object' or (select count(*) from jsonb_object_keys(v_transfer)) <> 3
      or not (v_transfer ?& array['asset','amountBaseUnits','decimals'])
      or jsonb_typeof(v_transfer->'asset') <> 'string'
      or jsonb_typeof(v_transfer->'amountBaseUnits') <> 'string'
      or jsonb_typeof(v_transfer->'decimals') <> 'number'
      or v_transfer->>'amountBaseUnits' !~ '^[1-9][0-9]{0,19}$'
      or v_transfer->>'decimals' !~ '^[0-9]+$' then
      raise exception 'invalid ocean contribution transfer';
    end if;
    v_asset := v_transfer->>'asset';
    v_amount := (v_transfer->>'amountBaseUnits')::numeric;
    v_decimals := (v_transfer->>'decimals')::integer;
    if v_amount > 18446744073709551615 or not (
       (v_asset = 'SOL' and v_decimals = 9) or (v_asset in ('USDC','FAWKQ') and v_decimals = 6)) then
      raise exception 'invalid ocean contribution asset';
    end if;
    insert into public.ocean_contribution_receipts (
      campaign_id, telegram_user_id, profile_id, source_wallet, vault_address,
      transaction_signature, asset, amount_base_units, decimals, slot, block_time, founder_deposit
    ) values (
      p_campaign_id, p_telegram_user_id, v_identity.profile_id, p_wallet,
      'J9J6MsSxicqmwTuzJGHitVUuUhRwP4iaDdTRgMAUDj4p', p_signature, v_asset,
      v_amount, v_decimals, p_slot, p_block_time, v_founder
    ) on conflict (network, transaction_signature, asset) do nothing returning * into v_row;
    if not found then
      select * into v_row from public.ocean_contribution_receipts
        where network = 'solana-mainnet' and transaction_signature = p_signature and asset = v_asset;
      if v_row.campaign_id is distinct from p_campaign_id
        or v_row.telegram_user_id is distinct from p_telegram_user_id
        or v_row.profile_id is distinct from v_identity.profile_id
        or v_row.source_wallet is distinct from p_wallet
        or v_row.amount_base_units is distinct from v_amount
        or v_row.decimals is distinct from v_decimals
        or v_row.slot is distinct from p_slot
        or v_row.block_time is distinct from p_block_time then
        raise exception 'ocean contribution receipt conflict';
      end if;
    end if;
    return next v_row;
  end loop;
end;
$$;

revoke all on function public.record_ocean_contribution(text,bigint,text,text,bigint,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.record_ocean_contribution(text,bigint,text,text,bigint,timestamptz,jsonb) to service_role;

-- Consent is private by default; no public identity or shout-out is inferred from a receipt.
create table public.ocean_recognition_preferences (
  profile_id uuid primary key,
  display_mode text not null default 'ANONYMOUS' check (display_mode in ('ANONYMOUS','PUBLIC','ALIAS')),
  display_alias text check (display_alias ~ '^[A-Za-z0-9_ .-]{3,30}$'),
  shoutout_opt_in boolean not null default false,
  updated_at timestamptz not null default now(),
  check (display_mode <> 'ALIAS' or display_alias is not null)
);
alter table public.ocean_recognition_preferences enable row level security;
revoke all on table public.ocean_recognition_preferences from public, anon, authenticated, service_role;
grant select, insert, update on table public.ocean_recognition_preferences to service_role;

comment on table public.ocean_contribution_receipts is 'Immutable finalized vault deposits; no XP or conservation expenditure is implied.';
comment on table public.ocean_recognition_preferences is 'Private by default. Public recognition and shout-outs require separate explicit consent.';
