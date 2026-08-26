-- Append-only operational certifications for the nine website-voting sources
-- and five Telegram bots used by Bond the Duck. This migration registers no
-- sources, creates no founders, and cannot fund, schedule or activate a
-- campaign.

create table if not exists public.verification_source_certifications (
  id bigserial primary key,
  campaign_id text not null,
  source_key text not null,
  source_kind text not null check (source_kind in ('WEBSITE_VOTE','TELEGRAM_BOT')),
  classification text not null check (classification in (
    'MACHINE_VERIFIED','PROOF_SUPPORTED','COMMUNITY_PROGRESS_ONLY',
    'SOURCE_UNAVAILABLE','REMOVED_FOR_INTEGRITY'
  )),
  health text not null check (health in ('HEALTHY','DEGRADED','OFFLINE','REMOVED')),
  evidence_url text not null check (
    char_length(evidence_url) between 9 and 2048 and evidence_url ~* '^https://'
  ),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  checked_at timestamptz not null,
  expires_at timestamptz not null,
  certified_by bigint not null check (certified_by > 0),
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (campaign_id, source_key)
    references public.verification_sources(campaign_id, source_key),
  foreign key (campaign_id, certified_by)
    references public.campaign_founders(campaign_id, founder_user_id),
  check (expires_at > checked_at and expires_at <= checked_at + interval '72 hours')
);

create index if not exists verification_source_certifications_latest_idx
  on public.verification_source_certifications
    (campaign_id, source_key, checked_at desc, id desc);

drop trigger if exists verification_source_certifications_immutable
  on public.verification_source_certifications;
create trigger verification_source_certifications_immutable
before update or delete on public.verification_source_certifications
for each row execute function public.reject_campaign_ledger_mutation();

create or replace function public.record_verification_source_certification(
  p_campaign_id text,
  p_source_key text,
  p_source_kind text,
  p_classification text,
  p_health text,
  p_evidence_url text,
  p_evidence_hash text,
  p_checked_at timestamptz,
  p_expires_at timestamptz,
  p_founder_user_id bigint,
  p_idempotency_key text
) returns public.verification_source_certifications
language plpgsql security invoker set search_path = '' as $$
declare
  source_row public.verification_sources;
  result public.verification_source_certifications;
  expected_kind text;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_source_key is null or char_length(btrim(p_source_key)) not between 1 and 128
    or p_source_kind is null or p_source_kind not in ('WEBSITE_VOTE','TELEGRAM_BOT')
    or p_classification is null or p_classification not in (
      'MACHINE_VERIFIED','PROOF_SUPPORTED','COMMUNITY_PROGRESS_ONLY',
      'SOURCE_UNAVAILABLE','REMOVED_FOR_INTEGRITY'
    )
    or p_health is null or p_health not in ('HEALTHY','DEGRADED','OFFLINE','REMOVED')
    or p_evidence_url is null or char_length(p_evidence_url) not between 9 and 2048
    or p_evidence_url !~* '^https://'
    or p_evidence_hash is null or p_evidence_hash !~ '^[0-9a-f]{64}$'
    or p_checked_at is null or p_checked_at > now() + interval '5 minutes'
    or p_expires_at is null or p_expires_at <= now()
    or p_expires_at <= p_checked_at
    or p_expires_at > p_checked_at + interval '72 hours'
    or p_founder_user_id is null or p_founder_user_id <= 0
    or p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$'
  then raise exception 'invalid verification source certification'; end if;

  select * into result
  from public.verification_source_certifications
  where idempotency_key = p_idempotency_key;
  if found then
    if result.campaign_id is distinct from p_campaign_id
      or result.source_key is distinct from btrim(p_source_key)
      or result.source_kind is distinct from p_source_kind
      or result.classification is distinct from p_classification
      or result.health is distinct from p_health
      or result.evidence_url is distinct from p_evidence_url
      or result.evidence_hash is distinct from p_evidence_hash
      or result.checked_at is distinct from p_checked_at
      or result.expires_at is distinct from p_expires_at
      or result.certified_by is distinct from p_founder_user_id
    then raise exception 'source certification idempotency key was reused'; end if;
    return result;
  end if;

  if not exists (
    select 1 from public.campaigns
    where id = p_campaign_id and state not in ('ARCHIVED','TERMINATED')
  ) then raise exception 'campaign is not accepting source certifications'; end if;
  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = p_campaign_id
      and founder_user_id = p_founder_user_id
      and enabled
  ) then raise exception 'founder is not authorized for this campaign'; end if;

  select * into source_row
  from public.verification_sources
  where campaign_id = p_campaign_id and source_key = btrim(p_source_key)
  for share;
  if not found then raise exception 'verification source is not registered'; end if;
  expected_kind := case source_row.source
    when 'vote' then 'WEBSITE_VOTE'
    when 'event' then 'TELEGRAM_BOT'
    else null
  end;
  if expected_kind is distinct from p_source_kind
    or source_row.classification is distinct from p_classification
  then raise exception 'certification does not match registered source'; end if;

  insert into public.verification_source_certifications
    (campaign_id, source_key, source_kind, classification, health,
     evidence_url, evidence_hash, checked_at, expires_at, certified_by, idempotency_key)
  values
    (p_campaign_id, btrim(p_source_key), p_source_kind, p_classification, p_health,
     p_evidence_url, p_evidence_hash, p_checked_at, p_expires_at,
     p_founder_user_id, p_idempotency_key)
  returning * into result;
  return result;
end;
$$;

alter table public.verification_source_certifications enable row level security;

revoke all on public.verification_source_certifications
  from public, anon, authenticated;
revoke all on function public.record_verification_source_certification(
  text,text,text,text,text,text,text,timestamptz,timestamptz,bigint,text
) from public, anon, authenticated;

grant select, insert on public.verification_source_certifications to service_role;
grant usage, select on sequence public.verification_source_certifications_id_seq to service_role;
grant execute on function public.record_verification_source_certification(
  text,text,text,text,text,text,text,timestamptz,timestamptz,bigint,text
) to service_role;
