-- Fail-closed website-vote verification for Bond the Duck. Registration is
-- not evidence: only a current healthy source certification plus a reviewed,
-- nonce-bound proof can create a participant-attributed event. This migration
-- activates no campaign, XP settlement, reward or external vote.

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'bond-vote-proofs', 'bond-vote-proofs', false, 2097152,
  array['image/jpeg','image/png','image/webp']
) on conflict (id) do nothing;

do $verify_vote_proof_bucket$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'bond-vote-proofs' and name = 'bond-vote-proofs'
      and public = false and file_size_limit = 2097152
      and allowed_mime_types @> array['image/jpeg','image/png','image/webp']
  ) then raise exception 'Bond website proof bucket is not private or correctly constrained'; end if;
end;
$verify_vote_proof_bucket$;

create table if not exists public.website_vote_attempts (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  source_key text not null,
  telegram_user_id bigint not null check (telegram_user_id > 0),
  challenge_hash text not null unique check (challenge_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'OPEN'
    check (status in ('OPEN','SUBMITTED','VERIFIED','REJECTED','EXPIRED')),
  baseline_vote_count bigint check (baseline_vote_count is null or baseline_vote_count >= 0),
  observed_vote_count bigint check (observed_vote_count is null or observed_vote_count >= 0),
  proof_storage_key text,
  proof_sha256 text check (proof_sha256 is null or proof_sha256 ~ '^[0-9a-f]{64}$'),
  proof_perceptual_hash text
    check (proof_perceptual_hash is null or proof_perceptual_hash ~ '^[0-9a-f]{16,128}$'),
  receipt_text text check (receipt_text is null or char_length(receipt_text) <= 500),
  started_at timestamptz not null,
  expires_at timestamptz not null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_user_id bigint check (reviewer_user_id is null or reviewer_user_id > 0),
  review_reason text check (review_reason is null or char_length(review_reason) <= 500),
  participation_event_id bigint references public.campaign_participation_events(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (campaign_id, source_key)
    references public.verification_sources(campaign_id, source_key),
  check (expires_at > started_at and expires_at <= started_at + interval '15 minutes'),
  check (submitted_at is null or submitted_at >= started_at),
  check (reviewed_at is null or submitted_at is not null),
  check ((status = 'OPEN' and submitted_at is null and reviewed_at is null)
    or (status = 'SUBMITTED' and submitted_at is not null and reviewed_at is null)
    or (status in ('VERIFIED','REJECTED') and submitted_at is not null and reviewed_at is not null)
    or status = 'EXPIRED')
);

create unique index if not exists website_vote_attempts_one_open_idx
  on public.website_vote_attempts(campaign_id, source_key, telegram_user_id)
  where status in ('OPEN','SUBMITTED');
create unique index if not exists website_vote_attempts_proof_sha_idx
  on public.website_vote_attempts(campaign_id, proof_sha256)
  where proof_sha256 is not null;
create index if not exists website_vote_attempts_perceptual_idx
  on public.website_vote_attempts(campaign_id, proof_perceptual_hash)
  where proof_perceptual_hash is not null;
create index if not exists website_vote_attempts_review_queue_idx
  on public.website_vote_attempts(campaign_id, status, submitted_at)
  where status = 'SUBMITTED';

create table if not exists public.website_vote_reviews (
  id bigserial primary key,
  attempt_id bigint not null references public.website_vote_attempts(id),
  campaign_id text not null references public.campaigns(id),
  source_key text not null,
  telegram_user_id bigint not null check (telegram_user_id > 0),
  reviewer_user_id bigint not null check (reviewer_user_id > 0),
  decision text not null check (decision in ('APPROVE','REJECT')),
  reason text not null check (char_length(reason) between 1 and 500),
  proof_sha256 text not null check (proof_sha256 ~ '^[0-9a-f]{64}$'),
  decided_at timestamptz not null,
  unique (attempt_id)
);

create index if not exists website_vote_reviews_campaign_idx
  on public.website_vote_reviews(campaign_id, decided_at desc);

drop trigger if exists website_vote_reviews_immutable on public.website_vote_reviews;
create trigger website_vote_reviews_immutable
before update or delete on public.website_vote_reviews
for each row execute function public.reject_campaign_ledger_mutation();

alter table public.website_vote_attempts enable row level security;
alter table public.website_vote_reviews enable row level security;
revoke all on public.website_vote_attempts, public.website_vote_reviews
  from public, anon, authenticated;
grant select, insert, update on public.website_vote_attempts to service_role;
grant select, insert on public.website_vote_reviews to service_role;
grant usage, select on sequence public.website_vote_attempts_id_seq to service_role;
grant usage, select on sequence public.website_vote_reviews_id_seq to service_role;

-- Strengthen the generic participation bridge: individual XP events require
-- an individual-verification classification AND a matching current healthy
-- certification. Backdated reviewed proofs may be accepted while the
-- campaign is VERIFYING, but their event timestamp must still fall in one of
-- the seven active cycles.
create or replace function public.ingest_campaign_participation_event(
  p_campaign_id text,
  p_source text,
  p_source_key text,
  p_telegram_user_id bigint,
  p_evidence_ref text,
  p_verified_at timestamptz,
  p_idempotency_key text
) returns public.campaign_participation_events
language plpgsql security invoker set search_path = '' as $$
declare
  result public.campaign_participation_events;
  active_cycle integer;
  source_row public.verification_sources;
  last_event_at timestamptz;
begin
  select * into result from public.campaign_participation_events
  where campaign_id = p_campaign_id and idempotency_key = p_idempotency_key;
  if found then
    if result.source is distinct from p_source
      or result.source_key is distinct from p_source_key
      or result.telegram_user_id is distinct from p_telegram_user_id
      or result.evidence_ref is distinct from p_evidence_ref
      or result.verified_at is distinct from p_verified_at
    then raise exception 'idempotency key was reused with a different participation event'; end if;
    return result;
  end if;

  if not exists (
    select 1 from public.campaigns
    where id = p_campaign_id and state in ('ACTIVE','VERIFYING')
  ) then raise exception 'campaign is not accepting participation verification'; end if;
  if p_verified_at is null or p_verified_at > now() + interval '5 minutes' then
    raise exception 'invalid verified event timestamp';
  end if;

  select * into source_row from public.verification_sources
  where campaign_id = p_campaign_id and source_key = p_source_key;
  if not found or source_row.classification not in ('MACHINE_VERIFIED','PROOF_SUPPORTED') then
    raise exception 'participation source is not individually verifiable';
  end if;
  if source_row.source is distinct from p_source then
    raise exception 'participation source type does not match registry';
  end if;
  if not exists (
    select 1 from (
      select certification.*
      from public.verification_source_certifications certification
      where certification.campaign_id = p_campaign_id
        and certification.source_key = p_source_key
      order by certification.checked_at desc, certification.id desc
      limit 1
    ) latest
    where latest.classification = source_row.classification
      and latest.health = 'HEALTHY'
      and latest.checked_at <= now() + interval '5 minutes'
      and latest.expires_at > now()
      and latest.expires_at <= latest.checked_at + interval '72 hours'
  ) then raise exception 'participation source certification is missing, stale or unhealthy'; end if;

  if not exists (
    select 1 from public.identity_links
    where campaign_id = p_campaign_id
      and telegram_user_id = p_telegram_user_id
      and x_verified_at is not null
  ) then raise exception 'campaign identity is not verified'; end if;

  if source_row.cooldown_seconds > 0 then
    select max(verified_at) into last_event_at
    from public.campaign_participation_events
    where campaign_id = p_campaign_id
      and source_key = p_source_key
      and telegram_user_id = p_telegram_user_id;
    if last_event_at is not null
      and p_verified_at < last_event_at + make_interval(secs => source_row.cooldown_seconds)
    then raise exception 'participation source is on cooldown for this participant'; end if;
  end if;

  select cycle_id into active_cycle from public.cycles
  where campaign_id = p_campaign_id
    and p_verified_at >= opens_at and p_verified_at < closes_at
  order by cycle_id limit 1;
  if active_cycle is null then raise exception 'verified event is outside an active cycle'; end if;

  insert into public.campaign_participation_events
    (campaign_id, cycle_id, source, source_key, telegram_user_id, evidence_ref,
     verified_at, idempotency_key, credited)
  values
    (p_campaign_id, active_cycle, p_source, p_source_key, p_telegram_user_id,
     p_evidence_ref, p_verified_at, p_idempotency_key, false)
  on conflict (campaign_id, idempotency_key) do nothing
  returning * into result;
  if result.id is null then
    select * into result from public.campaign_participation_events
    where campaign_id = p_campaign_id and idempotency_key = p_idempotency_key;
  end if;
  return result;
end;
$$;

create or replace function public.start_website_vote_attempt(
  p_campaign_id text,
  p_source_key text,
  p_telegram_user_id bigint,
  p_challenge_hash text,
  p_started_at timestamptz,
  p_expires_at timestamptz,
  p_baseline_vote_count bigint default null
) returns public.website_vote_attempts
language plpgsql security invoker set search_path = '' as $$
declare
  result public.website_vote_attempts;
  source_row public.verification_sources;
  last_event_at timestamptz;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_source_key is null or btrim(p_source_key) = ''
    or p_telegram_user_id is null or p_telegram_user_id <= 0
    or p_challenge_hash is null or p_challenge_hash !~ '^[0-9a-f]{64}$'
    or p_started_at is null or p_expires_at is null
    or p_started_at > now() + interval '5 minutes'
    or p_expires_at <= p_started_at
    or p_expires_at > p_started_at + interval '15 minutes'
    or (p_baseline_vote_count is not null and p_baseline_vote_count < 0)
  then raise exception 'invalid website vote attempt'; end if;

  if not exists (
    select 1 from public.campaigns where id = p_campaign_id and state = 'ACTIVE'
  ) then raise exception 'campaign is not active'; end if;
  if not exists (
    select 1 from public.identity_links
    where campaign_id = p_campaign_id
      and telegram_user_id = p_telegram_user_id
      and x_verified_at is not null
  ) then raise exception 'campaign identity is not verified'; end if;

  select * into source_row from public.verification_sources
  where campaign_id = p_campaign_id and source_key = p_source_key;
  if not found or source_row.source <> 'vote'
    or source_row.classification not in ('MACHINE_VERIFIED','PROOF_SUPPORTED')
  then raise exception 'website vote source is not individually verifiable'; end if;
  if not exists (
    select 1 from (
      select certification.*
      from public.verification_source_certifications certification
      where certification.campaign_id = p_campaign_id
        and certification.source_key = p_source_key
      order by certification.checked_at desc, certification.id desc
      limit 1
    ) latest
    where latest.classification = source_row.classification
      and latest.health = 'HEALTHY'
      and latest.checked_at <= now() + interval '5 minutes'
      and latest.expires_at > now()
  ) then raise exception 'website vote source certification is missing, stale or unhealthy'; end if;

  select max(verified_at) into last_event_at
  from public.campaign_participation_events
  where campaign_id = p_campaign_id
    and source_key = p_source_key
    and telegram_user_id = p_telegram_user_id;
  if last_event_at is not null
    and p_started_at < last_event_at + make_interval(secs => source_row.cooldown_seconds)
  then raise exception 'website vote source is on cooldown for this participant'; end if;

  update public.website_vote_attempts set status = 'EXPIRED', updated_at = now()
  where campaign_id = p_campaign_id and source_key = p_source_key
    and telegram_user_id = p_telegram_user_id and status in ('OPEN','SUBMITTED')
    and expires_at <= now();

  if (
    select count(*) from public.website_vote_attempts
    where campaign_id = p_campaign_id and telegram_user_id = p_telegram_user_id
      and created_at > now() - interval '1 hour'
  ) >= 12 then raise exception 'website vote attempt rate limit reached'; end if;

  insert into public.website_vote_attempts (
    campaign_id, source_key, telegram_user_id, challenge_hash,
    baseline_vote_count, started_at, expires_at
  ) values (
    p_campaign_id, p_source_key, p_telegram_user_id, p_challenge_hash,
    p_baseline_vote_count, p_started_at, p_expires_at
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.submit_website_vote_proof(
  p_attempt_id bigint,
  p_telegram_user_id bigint,
  p_challenge text,
  p_proof_storage_key text,
  p_proof_sha256 text,
  p_proof_perceptual_hash text default null,
  p_receipt_text text default null,
  p_observed_vote_count bigint default null,
  p_submitted_at timestamptz default now()
) returns public.website_vote_attempts
language plpgsql security invoker set search_path = '' as $$
declare
  result public.website_vote_attempts;
begin
  if p_attempt_id is null or p_attempt_id <= 0
    or p_telegram_user_id is null or p_telegram_user_id <= 0
    or p_challenge is null or p_challenge !~ '^[0-9a-f]{64}$'
    or p_proof_storage_key is null or char_length(p_proof_storage_key) not between 1 and 300
    or p_proof_sha256 is null or p_proof_sha256 !~ '^[0-9a-f]{64}$'
    or (p_proof_perceptual_hash is not null and p_proof_perceptual_hash !~ '^[0-9a-f]{16,128}$')
    or (p_receipt_text is not null and char_length(p_receipt_text) > 500)
    or (p_observed_vote_count is not null and p_observed_vote_count < 0)
    or p_submitted_at is null or p_submitted_at > now() + interval '5 minutes'
  then raise exception 'invalid website vote proof'; end if;

  select * into result from public.website_vote_attempts
  where id = p_attempt_id for update;
  if not found then raise exception 'unknown website vote attempt'; end if;
  if result.telegram_user_id <> p_telegram_user_id then
    raise exception 'website vote attempt does not belong to participant';
  end if;
  if encode(sha256(convert_to(p_challenge, 'UTF8')), 'hex') <> result.challenge_hash then
    raise exception 'website vote challenge does not match attempt';
  end if;
  if result.status <> 'OPEN' then raise exception 'website vote attempt is not open'; end if;
  if p_submitted_at < result.started_at or p_submitted_at > result.expires_at then
    update public.website_vote_attempts set status = 'EXPIRED', updated_at = now()
    where id = p_attempt_id returning * into result;
    return result;
  end if;

  update public.website_vote_attempts set
    status = 'SUBMITTED', proof_storage_key = p_proof_storage_key,
    proof_sha256 = p_proof_sha256, proof_perceptual_hash = p_proof_perceptual_hash,
    receipt_text = nullif(btrim(p_receipt_text), ''), observed_vote_count = p_observed_vote_count,
    submitted_at = p_submitted_at, updated_at = now()
  where id = p_attempt_id returning * into result;
  return result;
end;
$$;

create or replace function public.review_website_vote_proof(
  p_attempt_id bigint,
  p_reviewer_user_id bigint,
  p_decision text,
  p_reason text,
  p_reviewed_at timestamptz default now()
) returns public.website_vote_attempts
language plpgsql security invoker set search_path = '' as $$
declare
  result public.website_vote_attempts;
  participation public.campaign_participation_events;
  evidence_ref text;
  event_key text;
begin
  if p_attempt_id is null or p_attempt_id <= 0
    or p_reviewer_user_id is null or p_reviewer_user_id <= 0
    or p_decision is null or p_decision not in ('APPROVE','REJECT')
    or p_reason is null or char_length(btrim(p_reason)) not between 1 and 500
    or p_reviewed_at is null or p_reviewed_at > now() + interval '5 minutes'
  then raise exception 'invalid website vote review'; end if;

  select * into result from public.website_vote_attempts
  where id = p_attempt_id for update;
  if not found then raise exception 'unknown website vote attempt'; end if;
  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = result.campaign_id
      and founder_user_id = p_reviewer_user_id and enabled
  ) then raise exception 'reviewer is not authorized for this campaign'; end if;
  if result.status in ('VERIFIED','REJECTED') then
    if (result.status = 'VERIFIED' and p_decision <> 'APPROVE')
      or (result.status = 'REJECTED' and p_decision <> 'REJECT')
    then raise exception 'website vote attempt already has a different decision'; end if;
    return result;
  end if;
  if result.status <> 'SUBMITTED' or result.proof_sha256 is null then
    raise exception 'website vote attempt is not ready for review';
  end if;
  if p_reviewed_at < result.submitted_at then raise exception 'review predates proof submission'; end if;

  if p_decision = 'APPROVE' then
    evidence_ref := 'website-proof:' || result.id::text || ':' || result.proof_sha256;
    event_key := encode(sha256(convert_to(
      result.campaign_id || ':' || result.source_key || ':' || result.telegram_user_id::text || ':' || evidence_ref,
      'UTF8'
    )), 'hex');
    select * into participation from public.ingest_campaign_participation_event(
      result.campaign_id, 'vote', result.source_key, result.telegram_user_id,
      evidence_ref, result.submitted_at, event_key
    );
    update public.website_vote_attempts set
      status = 'VERIFIED', reviewer_user_id = p_reviewer_user_id,
      review_reason = btrim(p_reason), reviewed_at = p_reviewed_at,
      participation_event_id = participation.id, updated_at = now()
    where id = p_attempt_id returning * into result;
  else
    update public.website_vote_attempts set
      status = 'REJECTED', reviewer_user_id = p_reviewer_user_id,
      review_reason = btrim(p_reason), reviewed_at = p_reviewed_at, updated_at = now()
    where id = p_attempt_id returning * into result;
  end if;

  insert into public.website_vote_reviews (
    attempt_id, campaign_id, source_key, telegram_user_id,
    reviewer_user_id, decision, reason, proof_sha256, decided_at
  ) values (
    result.id, result.campaign_id, result.source_key, result.telegram_user_id,
    p_reviewer_user_id, p_decision, btrim(p_reason), result.proof_sha256, p_reviewed_at
  );
  return result;
end;
$$;

revoke all on function public.ingest_campaign_participation_event(text,text,text,bigint,text,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.start_website_vote_attempt(text,text,bigint,text,timestamptz,timestamptz,bigint)
  from public, anon, authenticated;
revoke all on function public.submit_website_vote_proof(bigint,bigint,text,text,text,text,text,bigint,timestamptz)
  from public, anon, authenticated;
revoke all on function public.review_website_vote_proof(bigint,bigint,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.ingest_campaign_participation_event(text,text,text,bigint,text,timestamptz,text)
  to service_role;
grant execute on function public.start_website_vote_attempt(text,text,bigint,text,timestamptz,timestamptz,bigint)
  to service_role;
grant execute on function public.submit_website_vote_proof(bigint,bigint,text,text,text,text,text,bigint,timestamptz)
  to service_role;
grant execute on function public.review_website_vote_proof(bigint,bigint,text,text,timestamptz)
  to service_role;

-- Encode the live read-only audit conservatively. PROOF_SUPPORTED rows remain
-- blocked by PENDING_CERTIFICATION until a healthy time-bounded certification
-- is recorded. Unavailable and aggregate-only sources cannot award XP.
update public.verification_sources set
  classification = case source_key
    when 'web:geckoterminal' then 'COMMUNITY_PROGRESS_ONLY'
    when 'web:coinmooner' then 'PROOF_SUPPORTED'
    when 'web:gemfinder' then 'PROOF_SUPPORTED'
    when 'web:coinmun' then 'PROOF_SUPPORTED'
    else 'SOURCE_UNAVAILABLE'
  end,
  cooldown_seconds = 86400,
  health = case source_key
    when 'web:geckoterminal' then 'OBSERVED_NO_USER_RECEIPT'
    when 'web:top100token' then 'CLOUDFLARE_BLOCKED'
    when 'web:coinmooner' then 'PENDING_CERTIFICATION'
    when 'web:gemfinder' then 'PENDING_CERTIFICATION'
    when 'web:coinsniper' then 'CLOUDFLARE_BLOCKED'
    when 'web:coinmun' then 'PENDING_CERTIFICATION'
    when 'web:coinboom' then 'NO_FREE_VOTE_OBSERVED'
    else 'OFFLINE'
  end,
  checked_at = null
where campaign_id = 'bond-the-duck-2026' and source = 'vote';

do $verify_website_vote_profiles$
declare
  profile_count integer;
  proof_supported_count integer;
begin
  select count(*), count(*) filter (where classification = 'PROOF_SUPPORTED')
  into profile_count, proof_supported_count
  from public.verification_sources
  where campaign_id = 'bond-the-duck-2026' and source = 'vote';
  if profile_count <> 9 or proof_supported_count <> 3 then
    raise exception 'Bond the Duck website verification profiles did not lock safely';
  end if;
end;
$verify_website_vote_profiles$;
