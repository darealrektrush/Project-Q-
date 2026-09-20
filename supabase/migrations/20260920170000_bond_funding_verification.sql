-- Bond the Duck audited funding verification.
-- Records evidence for the already-funded external Squads vault and only updates
-- campaigns.funded_base_units after two current founder approvals.
-- No token transfer, signing, vault mutation, or campaign state transition occurs.

create table if not exists public.campaign_funding_proposals (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  vault_address text not null check (vault_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  vault_base_units numeric(39,0) not null check (vault_base_units = 17500000000000),
  squads_approval_threshold integer not null check (squads_approval_threshold = 2),
  squads_member_count integer not null check (squads_member_count = 3),
  top_contributor_prize_lamports bigint not null check (top_contributor_prize_lamports = 1000000000),
  evidence_url text not null check (evidence_url ~* '^https://'),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  verified_at timestamptz not null,
  proposed_by bigint not null,
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (campaign_id, evidence_hash),
  foreign key (campaign_id, proposed_by)
    references public.campaign_founders(campaign_id, founder_user_id)
);

create table if not exists public.campaign_funding_decisions (
  id bigserial primary key,
  proposal_id bigint not null references public.campaign_funding_proposals(id),
  campaign_id text not null,
  founder_user_id bigint not null,
  decision text not null check (decision in ('APPROVE','HOLD')),
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  decided_at timestamptz not null default now(),
  foreign key (campaign_id, founder_user_id)
    references public.campaign_founders(campaign_id, founder_user_id)
);

create table if not exists public.campaign_funding_finalizations (
  id bigserial primary key,
  proposal_id bigint not null unique references public.campaign_funding_proposals(id),
  campaign_id text not null,
  finalized_by bigint not null,
  finalized_at timestamptz not null default now(),
  foreign key (campaign_id, finalized_by)
    references public.campaign_founders(campaign_id, founder_user_id)
);

create index if not exists campaign_funding_proposals_latest_idx
  on public.campaign_funding_proposals(campaign_id, created_at desc, id desc);
create index if not exists campaign_funding_decisions_latest_idx
  on public.campaign_funding_decisions(proposal_id, founder_user_id, decided_at desc, id desc);

alter table public.campaign_funding_proposals enable row level security;
alter table public.campaign_funding_decisions enable row level security;
alter table public.campaign_funding_finalizations enable row level security;

revoke all on public.campaign_funding_proposals,
  public.campaign_funding_decisions,
  public.campaign_funding_finalizations
from public, anon, authenticated;

grant select, insert on public.campaign_funding_proposals to service_role;
grant select, insert on public.campaign_funding_decisions to service_role;
grant select, insert on public.campaign_funding_finalizations to service_role;
grant usage, select on sequence public.campaign_funding_proposals_id_seq to service_role;
grant usage, select on sequence public.campaign_funding_decisions_id_seq to service_role;
grant usage, select on sequence public.campaign_funding_finalizations_id_seq to service_role;

create trigger campaign_funding_proposals_immutable
before update or delete on public.campaign_funding_proposals
for each row execute function public.reject_campaign_ledger_mutation();

create trigger campaign_funding_decisions_immutable
before update or delete on public.campaign_funding_decisions
for each row execute function public.reject_campaign_ledger_mutation();

create trigger campaign_funding_finalizations_immutable
before update or delete on public.campaign_funding_finalizations
for each row execute function public.reject_campaign_ledger_mutation();

create or replace function public.submit_campaign_funding_proposal(
  p_campaign_id text,
  p_founder_user_id bigint,
  p_vault_address text,
  p_evidence_url text,
  p_evidence_hash text,
  p_verified_at timestamptz,
  p_idempotency_key text
) returns public.campaign_funding_proposals
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  result public.campaign_funding_proposals;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_founder_user_id is null or p_founder_user_id <= 0
    or p_vault_address is null or btrim(p_vault_address) !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    or p_evidence_url is null or p_evidence_url !~* '^https://'
    or p_evidence_hash is null or p_evidence_hash !~ '^[0-9a-f]{64}$'
    or p_verified_at is null or p_verified_at > now() + interval '5 minutes'
    or p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid funding proposal';
  end if;

  select * into result
  from public.campaign_funding_proposals
  where idempotency_key = p_idempotency_key;
  if found then
    if result.campaign_id is distinct from p_campaign_id
      or result.proposed_by is distinct from p_founder_user_id
      or result.vault_address is distinct from btrim(p_vault_address)
      or result.evidence_url is distinct from p_evidence_url
      or result.evidence_hash is distinct from p_evidence_hash
      or result.verified_at is distinct from p_verified_at
    then
      raise exception 'funding proposal idempotency key was reused';
    end if;
    return result;
  end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for share;
  if not found or campaign_row.state not in ('DRAFT','READINESS_BLOCKED') then
    raise exception 'campaign is not accepting funding proposals';
  end if;

  if (select count(*) from public.campaign_founders
      where campaign_id = p_campaign_id and enabled) <> 2 then
    raise exception 'campaign requires exactly two enabled founders';
  end if;

  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = p_campaign_id
      and founder_user_id = p_founder_user_id
      and enabled
  ) then
    raise exception 'founder is not authorized for this campaign';
  end if;

  insert into public.campaign_funding_proposals (
    campaign_id, vault_address, vault_base_units,
    squads_approval_threshold, squads_member_count,
    top_contributor_prize_lamports, evidence_url, evidence_hash,
    verified_at, proposed_by, idempotency_key
  ) values (
    p_campaign_id, btrim(p_vault_address), 17500000000000,
    2, 3, 1000000000, p_evidence_url, p_evidence_hash,
    p_verified_at, p_founder_user_id, p_idempotency_key
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.record_campaign_funding_decision(
  p_proposal_id bigint,
  p_founder_user_id bigint,
  p_decision text,
  p_idempotency_key text
) returns public.campaign_funding_decisions
language plpgsql
security invoker
set search_path = '' as $$
declare
  proposal public.campaign_funding_proposals;
  result public.campaign_funding_decisions;
begin
  if p_proposal_id is null or p_proposal_id <= 0
    or p_founder_user_id is null or p_founder_user_id <= 0
    or p_decision not in ('APPROVE','HOLD')
    or p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid funding decision';
  end if;

  select * into result
  from public.campaign_funding_decisions
  where idempotency_key = p_idempotency_key;
  if found then
    if result.proposal_id is distinct from p_proposal_id
      or result.founder_user_id is distinct from p_founder_user_id
      or result.decision is distinct from p_decision
    then
      raise exception 'funding decision idempotency key was reused';
    end if;
    return result;
  end if;

  select * into proposal
  from public.campaign_funding_proposals
  where id = p_proposal_id;
  if not found then raise exception 'funding proposal not found'; end if;

  if not exists (
    select 1 from public.campaigns
    where id = proposal.campaign_id and state in ('DRAFT','READINESS_BLOCKED')
  ) then
    raise exception 'campaign is not accepting funding decisions';
  end if;

  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = proposal.campaign_id
      and founder_user_id = p_founder_user_id
      and enabled
  ) then
    raise exception 'founder is not authorized for this campaign';
  end if;

  insert into public.campaign_funding_decisions(
    proposal_id, campaign_id, founder_user_id, decision, idempotency_key
  ) values (
    proposal.id, proposal.campaign_id, p_founder_user_id, p_decision, p_idempotency_key
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.finalize_campaign_funding(
  p_proposal_id bigint,
  p_founder_user_id bigint
) returns public.campaigns
language plpgsql
security invoker
set search_path = '' as $$
declare
  proposal public.campaign_funding_proposals;
  campaign_row public.campaigns;
  approval_count integer;
  enabled_founders integer;
  result public.campaigns;
begin
  if p_proposal_id is null or p_proposal_id <= 0
    or p_founder_user_id is null or p_founder_user_id <= 0
  then raise exception 'invalid funding finalization'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('funding:' || p_proposal_id::text));

  if exists (
    select 1 from public.campaign_funding_finalizations
    where proposal_id = p_proposal_id
  ) then
    select c.* into result
    from public.campaigns c
    join public.campaign_funding_proposals p on p.campaign_id = c.id
    where p.id = p_proposal_id;
    return result;
  end if;

  select * into proposal
  from public.campaign_funding_proposals
  where id = p_proposal_id
  for share;
  if not found then raise exception 'funding proposal not found'; end if;

  select * into campaign_row
  from public.campaigns
  where id = proposal.campaign_id
  for update;
  if not found or campaign_row.state <> 'READINESS_BLOCKED' then
    raise exception 'funding can only finalize from READINESS_BLOCKED';
  end if;
  if campaign_row.funded_base_units not in (0,17500000000000) then
    raise exception 'campaign funding ledger contains conflicting amount';
  end if;

  if proposal.verified_at < now() - interval '72 hours' then
    raise exception 'funding evidence is stale';
  end if;

  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = proposal.campaign_id
      and founder_user_id = p_founder_user_id
      and enabled
  ) then
    raise exception 'founder is not authorized for this campaign';
  end if;

  select count(*) into enabled_founders
  from public.campaign_founders
  where campaign_id = proposal.campaign_id and enabled;
  if enabled_founders <> 2 then
    raise exception 'campaign requires exactly two enabled founders';
  end if;

  with latest as (
    select distinct on (d.founder_user_id)
      d.founder_user_id, d.decision
    from public.campaign_funding_decisions d
    join public.campaign_founders f
      on f.campaign_id = d.campaign_id
     and f.founder_user_id = d.founder_user_id
     and f.enabled
    where d.proposal_id = proposal.id
    order by d.founder_user_id, d.decided_at desc, d.id desc
  )
  select count(*) into approval_count
  from latest where decision = 'APPROVE';

  if approval_count <> 2 then
    raise exception 'two current founder approvals are required for funding finalization';
  end if;

  update public.campaigns
  set funded_base_units = 17500000000000,
      updated_at = now()
  where id = proposal.campaign_id
  returning * into result;

  insert into public.campaign_funding_finalizations(
    proposal_id, campaign_id, finalized_by
  ) values (
    proposal.id, proposal.campaign_id, p_founder_user_id
  );

  return result;
end;
$$;

revoke all on function public.submit_campaign_funding_proposal(text,bigint,text,text,text,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.record_campaign_funding_decision(bigint,bigint,text,text)
  from public, anon, authenticated;
revoke all on function public.finalize_campaign_funding(bigint,bigint)
  from public, anon, authenticated;

grant execute on function public.submit_campaign_funding_proposal(text,bigint,text,text,text,timestamptz,text)
  to service_role;
grant execute on function public.record_campaign_funding_decision(bigint,bigint,text,text)
  to service_role;
grant execute on function public.finalize_campaign_funding(bigint,bigint)
  to service_role;
