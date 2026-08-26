-- Two-founder Bond the Duck readiness approvals. This migration creates no
-- founders, approvals or campaign state changes. It strengthens the existing
-- SCHEDULED -> ACTIVE transition with an exact, append-only approval check.

create table if not exists public.campaign_founders (
  campaign_id text not null references public.campaigns(id),
  founder_user_id bigint not null check (founder_user_id > 0),
  founder_label text not null check (char_length(founder_label) between 1 and 80),
  enabled boolean not null default true,
  configured_at timestamptz not null default now(),
  primary key (campaign_id, founder_user_id)
);

create table if not exists public.campaign_readiness_approvals (
  id bigserial primary key,
  campaign_id text not null,
  founder_user_id bigint not null,
  report_version text not null check (report_version ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  report_hash text not null check (report_hash ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('APPROVE','HOLD')),
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  decided_at timestamptz not null default now(),
  foreign key (campaign_id, founder_user_id)
    references public.campaign_founders(campaign_id, founder_user_id)
);

create index if not exists campaign_founders_enabled_idx
  on public.campaign_founders(campaign_id, enabled);
create index if not exists campaign_readiness_latest_idx
  on public.campaign_readiness_approvals
    (campaign_id, report_hash, founder_user_id, decided_at desc, id desc);

drop trigger if exists campaign_readiness_approvals_immutable
  on public.campaign_readiness_approvals;
create trigger campaign_readiness_approvals_immutable
before update or delete on public.campaign_readiness_approvals
for each row execute function public.reject_campaign_ledger_mutation();

create or replace function public.record_campaign_readiness_decision(
  p_campaign_id text,
  p_founder_user_id bigint,
  p_report_version text,
  p_report_hash text,
  p_decision text,
  p_idempotency_key text
) returns public.campaign_readiness_approvals
language plpgsql security invoker set search_path = '' as $$
declare
  result public.campaign_readiness_approvals;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_founder_user_id is null or p_founder_user_id <= 0
    or p_report_version is null or p_report_version !~ '^[a-z0-9][a-z0-9-]{2,63}$'
    or p_report_hash is null or p_report_hash !~ '^[0-9a-f]{64}$'
    or p_decision is null or p_decision not in ('APPROVE','HOLD')
    or p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid campaign readiness decision';
  end if;

  select * into result
  from public.campaign_readiness_approvals
  where idempotency_key = p_idempotency_key;
  if found then
    if result.campaign_id is distinct from p_campaign_id
      or result.founder_user_id is distinct from p_founder_user_id
      or result.report_version is distinct from p_report_version
      or result.report_hash is distinct from p_report_hash
      or result.decision is distinct from p_decision
    then
      raise exception 'readiness decision idempotency key was reused';
    end if;
    return result;
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
  if not exists (
    select 1 from public.campaigns
    where id = p_campaign_id and state = 'SCHEDULED'
  ) then
    raise exception 'campaign is not accepting readiness decisions';
  end if;

  insert into public.campaign_readiness_approvals
    (campaign_id, founder_user_id, report_version, report_hash, decision, idempotency_key)
  values
    (p_campaign_id, p_founder_user_id, p_report_version, p_report_hash, p_decision, p_idempotency_key)
  returning * into result;
  return result;
end;
$$;

create or replace function public.enforce_campaign_activation_approvals()
returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  enabled_founders integer;
  approval_count integer;
  required_report_hash text;
  required_report_version text;
begin
  if new.from_state <> 'SCHEDULED' or new.to_state <> 'ACTIVE' then
    return new;
  end if;

  required_report_hash := new.evidence->>'readinessReportHash';
  required_report_version := new.evidence->>'readinessReportVersion';
  if required_report_hash is null or required_report_hash !~ '^[0-9a-f]{64}$'
    or required_report_version is null or required_report_version !~ '^[a-z0-9][a-z0-9-]{2,63}$'
  then
    raise exception 'exact readiness report version and hash required';
  end if;

  select count(*) into enabled_founders
  from public.campaign_founders
  where campaign_id = new.campaign_id and enabled;
  if enabled_founders <> 2 then
    raise exception 'campaign requires exactly two enabled founders';
  end if;

  with latest_decisions as (
    select distinct on (approval.founder_user_id)
      approval.founder_user_id, approval.decision
    from public.campaign_readiness_approvals approval
    join public.campaign_founders founder
      on founder.campaign_id = approval.campaign_id
     and founder.founder_user_id = approval.founder_user_id
     and founder.enabled
    where approval.campaign_id = new.campaign_id
      and approval.report_version = required_report_version
      and approval.report_hash = required_report_hash
    order by approval.founder_user_id, approval.decided_at desc, approval.id desc
  )
  select count(*) into approval_count
  from latest_decisions where decision = 'APPROVE';

  if approval_count <> 2 then
    raise exception 'two current founder approvals for the exact readiness report are required';
  end if;
  return new;
end;
$$;

drop trigger if exists campaign_activation_approvals_required
  on public.campaign_state_transitions;
create trigger campaign_activation_approvals_required
before insert on public.campaign_state_transitions
for each row execute function public.enforce_campaign_activation_approvals();

alter table public.campaign_founders enable row level security;
alter table public.campaign_readiness_approvals enable row level security;

revoke all on public.campaign_founders, public.campaign_readiness_approvals
  from public, anon, authenticated;
revoke all on function public.record_campaign_readiness_decision(text,bigint,text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.enforce_campaign_activation_approvals()
  from public, anon, authenticated;

grant select, insert, update on public.campaign_founders to service_role;
grant select, insert on public.campaign_readiness_approvals to service_role;
grant usage, select on sequence public.campaign_readiness_approvals_id_seq to service_role;
grant execute on function public.record_campaign_readiness_decision(text,bigint,text,text,text,text)
  to service_role;
