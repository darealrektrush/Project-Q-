-- Bond the Duck top-contributor prize + conservation impact receipt rail.
-- Project Q does not sign or send SOL. It deterministically finalizes the unique
-- top eligible contributor after verification freeze and records only externally
-- executed, service-verified finalized Solana receipts.

create table if not exists public.campaign_top_contributor_finalizations (
  campaign_id text primary key references public.campaigns(id),
  telegram_user_id bigint not null,
  profile_id uuid not null references public.crabstar_profiles(profile_id),
  reward_wallet text not null check (reward_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  total_xp bigint not null check (total_xp > 0),
  finalized_by bigint not null,
  finalized_at timestamptz not null default now(),
  foreign key (campaign_id, finalized_by)
    references public.campaign_founders(campaign_id, founder_user_id),
  foreign key (campaign_id, telegram_user_id)
    references public.identity_links(campaign_id, telegram_user_id)
);

create table if not exists public.campaign_impact_receipts (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  receipt_type text not null check (receipt_type in ('WINNER_PRIZE','CONSERVATION_IMPACT')),
  telegram_user_id bigint not null,
  profile_id uuid not null references public.crabstar_profiles(profile_id),
  recipient_address text not null check (recipient_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  amount_lamports bigint not null check (amount_lamports > 0),
  transaction_signature text not null unique
    check (transaction_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  slot bigint not null check (slot > 0),
  block_time timestamptz not null,
  proof jsonb not null check (jsonb_typeof(proof) = 'object'),
  proof_hash text not null check (proof_hash ~ '^[0-9a-f]{64}$'),
  recorded_by bigint not null,
  recorded_at timestamptz not null default now(),
  unique (campaign_id, receipt_type),
  foreign key (campaign_id, telegram_user_id)
    references public.identity_links(campaign_id, telegram_user_id),
  foreign key (campaign_id, recorded_by)
    references public.campaign_founders(campaign_id, founder_user_id)
);

create index if not exists campaign_impact_receipts_profile_idx
  on public.campaign_impact_receipts(campaign_id, profile_id, receipt_type);

alter table public.campaign_top_contributor_finalizations enable row level security;
alter table public.campaign_impact_receipts enable row level security;

revoke all on public.campaign_top_contributor_finalizations,
  public.campaign_impact_receipts
from public, anon, authenticated;

grant select, insert on public.campaign_top_contributor_finalizations to service_role;
grant select, insert on public.campaign_impact_receipts to service_role;
grant usage, select on sequence public.campaign_impact_receipts_id_seq to service_role;

create trigger campaign_top_contributor_finalizations_immutable
before update or delete on public.campaign_top_contributor_finalizations
for each row execute function public.reject_campaign_ledger_mutation();

create trigger campaign_impact_receipts_immutable
before update or delete on public.campaign_impact_receipts
for each row execute function public.reject_campaign_ledger_mutation();

create or replace function public.finalize_campaign_top_contributor(
  p_campaign_id text,
  p_finalized_by bigint
) returns public.campaign_top_contributor_finalizations
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  existing public.campaign_top_contributor_finalizations;
  winner_user_id bigint;
  winner_profile_id uuid;
  winner_wallet text;
  winner_xp bigint;
  tied_count integer;
  result public.campaign_top_contributor_finalizations;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_finalized_by is null or p_finalized_by <= 0
  then raise exception 'invalid top contributor finalization'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_campaign_id || ':top-contributor')
  );

  select * into existing
  from public.campaign_top_contributor_finalizations
  where campaign_id = p_campaign_id;
  if found then return existing; end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for update;
  if not found or campaign_row.state <> 'ALLOCATIONS_FROZEN' then
    raise exception 'top contributor can only finalize after verification freeze';
  end if;

  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = p_campaign_id
      and founder_user_id = p_finalized_by
      and enabled
  ) then raise exception 'founder is not authorized for this campaign'; end if;

  if not exists (
    select 1
    from public.campaign_funding_finalizations f
    join public.campaign_funding_proposals p on p.id = f.proposal_id
    where p.campaign_id = p_campaign_id
      and p.vault_base_units = 17500000000000
      and p.top_contributor_prize_lamports = 1000000000
      and p.conservation_contribution_lamports = 100000000
      and p.total_sol_commitment_lamports = 1100000000
      and p.conservation_attribution = 'TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY'
  ) then raise exception 'finalized campaign funding and impact evidence is required'; end if;

  with xp as (
    select telegram_user_id, sum(xp)::bigint total_xp
    from public.campaign_xp_totals
    where campaign_id = p_campaign_id
    group by telegram_user_id
  ),
  eligible as (
    select
      xp.telegram_user_id,
      xp.total_xp,
      i.profile_id,
      i.reward_wallet
    from xp
    join public.identity_links i
      on i.campaign_id = p_campaign_id
     and i.telegram_user_id = xp.telegram_user_id
    join lateral (
      select h.eligible, h.reward_wallet
      from public.campaign_holder_eligibility_events h
      where h.campaign_id = p_campaign_id
        and h.telegram_user_id = xp.telegram_user_id
      order by h.observed_at desc, h.id desc
      limit 1
    ) holder on holder.eligible
      and holder.reward_wallet = i.reward_wallet
    where xp.total_xp > 0
      and i.profile_id is not null
      and i.reward_wallet is not null
      and i.x_verified_at is not null
      and i.wallet_verified_at is not null
      and not exists (
        select 1 from public.campaign_founders f
        where f.campaign_id = p_campaign_id
          and f.founder_user_id = xp.telegram_user_id
          and f.enabled
      )
  ),
  maximum as (
    select max(total_xp) max_xp from eligible
  )
  select count(*)::integer
  into tied_count
  from eligible, maximum
  where eligible.total_xp = maximum.max_xp;

  if tied_count = 0 then
    raise exception 'no eligible top contributor exists';
  end if;
  if tied_count <> 1 then
    raise exception 'top contributor is tied and requires an explicit tie policy';
  end if;

  with xp as (
    select telegram_user_id, sum(xp)::bigint total_xp
    from public.campaign_xp_totals
    where campaign_id = p_campaign_id
    group by telegram_user_id
  ),
  eligible as (
    select
      xp.telegram_user_id,
      xp.total_xp,
      i.profile_id,
      i.reward_wallet
    from xp
    join public.identity_links i
      on i.campaign_id = p_campaign_id
     and i.telegram_user_id = xp.telegram_user_id
    join lateral (
      select h.eligible, h.reward_wallet
      from public.campaign_holder_eligibility_events h
      where h.campaign_id = p_campaign_id
        and h.telegram_user_id = xp.telegram_user_id
      order by h.observed_at desc, h.id desc
      limit 1
    ) holder on holder.eligible
      and holder.reward_wallet = i.reward_wallet
    where xp.total_xp > 0
      and i.profile_id is not null
      and i.reward_wallet is not null
      and i.x_verified_at is not null
      and i.wallet_verified_at is not null
      and not exists (
        select 1 from public.campaign_founders f
        where f.campaign_id = p_campaign_id
          and f.founder_user_id = xp.telegram_user_id
          and f.enabled
      )
    order by xp.total_xp desc
    limit 1
  )
  select telegram_user_id, profile_id, reward_wallet, total_xp
  into winner_user_id, winner_profile_id, winner_wallet, winner_xp
  from eligible;

  insert into public.campaign_top_contributor_finalizations(
    campaign_id, telegram_user_id, profile_id, reward_wallet,
    total_xp, finalized_by
  ) values (
    p_campaign_id, winner_user_id, winner_profile_id, winner_wallet,
    winner_xp, p_finalized_by
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.record_verified_campaign_impact_receipt(
  p_campaign_id text,
  p_receipt_type text,
  p_recipient_address text,
  p_amount_lamports bigint,
  p_transaction_signature text,
  p_slot bigint,
  p_block_time timestamptz,
  p_proof jsonb,
  p_recorded_by bigint
) returns public.campaign_impact_receipts
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  contributor public.campaign_top_contributor_finalizations;
  funding public.campaign_funding_proposals;
  expected_recipient text;
  expected_amount bigint;
  result public.campaign_impact_receipts;
  computed_proof_hash text;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_receipt_type not in ('WINNER_PRIZE','CONSERVATION_IMPACT')
    or p_recipient_address is null
      or p_recipient_address !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    or p_amount_lamports is null or p_amount_lamports <= 0
    or p_transaction_signature is null
      or p_transaction_signature !~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'
    or p_slot is null or p_slot <= 0
    or p_block_time is null
    or p_proof is null or jsonb_typeof(p_proof) <> 'object'
    or p_recorded_by is null or p_recorded_by <= 0
  then raise exception 'invalid impact receipt'; end if;

  select * into result
  from public.campaign_impact_receipts
  where campaign_id = p_campaign_id
    and receipt_type = p_receipt_type;
  if found then
    if result.recipient_address is distinct from p_recipient_address
      or result.amount_lamports is distinct from p_amount_lamports
      or result.transaction_signature is distinct from p_transaction_signature
      or result.slot is distinct from p_slot
      or result.block_time is distinct from p_block_time
    then raise exception 'impact receipt terms changed'; end if;
    return result;
  end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id;
  if not found or campaign_row.state not in ('DISTRIBUTING','COMPLETED') then
    raise exception 'campaign is not accepting impact receipts';
  end if;

  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = p_campaign_id
      and founder_user_id = p_recorded_by
      and enabled
  ) then raise exception 'founder is not authorized for this campaign'; end if;

  select * into contributor
  from public.campaign_top_contributor_finalizations
  where campaign_id = p_campaign_id;
  if not found then raise exception 'top contributor is not finalized'; end if;

  select p.* into funding
  from public.campaign_funding_finalizations f
  join public.campaign_funding_proposals p on p.id = f.proposal_id
  where p.campaign_id = p_campaign_id
  order by f.finalized_at desc
  limit 1;
  if not found then raise exception 'finalized funding proposal is missing'; end if;

  if p_receipt_type = 'WINNER_PRIZE' then
    expected_recipient := contributor.reward_wallet;
    expected_amount := 1000000000;
  else
    expected_recipient := funding.conservation_vault_address;
    expected_amount := 100000000;
  end if;

  if p_recipient_address <> expected_recipient
    or p_amount_lamports <> expected_amount
  then raise exception 'impact receipt does not match locked recipient and amount'; end if;

  if p_proof->>'recipient' is distinct from p_recipient_address
    or p_proof->>'amountLamports' is distinct from p_amount_lamports::text
    or p_proof->>'signature' is distinct from p_transaction_signature
    or p_proof->>'slot' is distinct from p_slot::text
    or (p_proof->>'blockTime')::timestamptz is distinct from p_block_time
    or p_proof->>'instructionType' is distinct from 'system-transfer'
    or p_proof->>'finalized' is distinct from 'true'
  then raise exception 'impact receipt proof does not reconcile'; end if;

  computed_proof_hash := encode(extensions.digest(p_proof::text, 'sha256'), 'hex');

  insert into public.campaign_impact_receipts(
    campaign_id, receipt_type, telegram_user_id, profile_id,
    recipient_address, amount_lamports, transaction_signature,
    slot, block_time, proof, proof_hash, recorded_by
  ) values (
    p_campaign_id, p_receipt_type, contributor.telegram_user_id, contributor.profile_id,
    p_recipient_address, p_amount_lamports, p_transaction_signature,
    p_slot, p_block_time, p_proof, computed_proof_hash, p_recorded_by
  )
  returning * into result;

  return result;
end;
$$;

revoke all on function public.finalize_campaign_top_contributor(text,bigint)
  from public, anon, authenticated;
revoke all on function public.record_verified_campaign_impact_receipt(
  text,text,text,bigint,text,bigint,timestamptz,jsonb,bigint
) from public, anon, authenticated;

grant execute on function public.finalize_campaign_top_contributor(text,bigint)
  to service_role;
grant execute on function public.record_verified_campaign_impact_receipt(
  text,text,text,bigint,text,bigint,timestamptz,jsonb,bigint
) to service_role;
