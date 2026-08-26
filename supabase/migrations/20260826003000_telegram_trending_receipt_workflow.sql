-- Numeric-ID Telegram trending receipt verification for Bond the Duck.
-- The five permanent bot identities and observed receipt patterns were
-- recovered from Telegram Web on 2026-08-25 and are stored independently from
-- the short-lived (maximum 72 hour) health certifications. This migration
-- activates no campaign, XP settlement, rewards, distributions or burns.

create table if not exists public.telegram_trending_source_configs (
  id bigserial primary key,
  campaign_id text not null,
  source_key text not null,
  telegram_bot_user_id bigint not null check (telegram_bot_user_id > 0),
  verification_mode text not null
    check (verification_mode in ('DIRECT_RECEIPT','PAIRED_CONTEXT')),
  success_markers text[] not null check (
    cardinality(success_markers) between 1 and 8
  ),
  context_markers text[] not null check (
    cardinality(context_markers) between 1 and 8
  ),
  receipt_max_age_seconds integer not null
    check (receipt_max_age_seconds between 60 and 1800),
  pair_max_gap_seconds integer check (
    pair_max_gap_seconds is null
      or pair_max_gap_seconds between 30 and 600
  ),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  configuration_source text not null check (
    configuration_source in ('VERIFIED_BROWSER_EVIDENCE','FOUNDER_CERTIFICATION')
  ),
  configured_by bigint check (configured_by is null or configured_by > 0),
  configured_at timestamptz not null default now(),
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  foreign key (campaign_id, source_key)
    references public.verification_sources(campaign_id, source_key),
  foreign key (campaign_id, configured_by)
    references public.campaign_founders(campaign_id, founder_user_id),
  check (
    (verification_mode = 'DIRECT_RECEIPT' and pair_max_gap_seconds is null)
    or (verification_mode = 'PAIRED_CONTEXT' and pair_max_gap_seconds is not null)
  ),
  check (
    (configuration_source = 'VERIFIED_BROWSER_EVIDENCE' and configured_by is null)
    or (configuration_source = 'FOUNDER_CERTIFICATION' and configured_by is not null)
  )
);

create index if not exists telegram_trending_source_configs_latest_idx
  on public.telegram_trending_source_configs
    (campaign_id, source_key, configured_at desc, id desc);
create index if not exists telegram_trending_source_configs_bot_id_idx
  on public.telegram_trending_source_configs
    (campaign_id, telegram_bot_user_id, configured_at desc, id desc);

create table if not exists public.telegram_trending_receipt_contexts (
  id bigserial primary key,
  campaign_id text not null,
  source_key text not null,
  telegram_user_id bigint not null check (telegram_user_id > 0),
  origin_bot_user_id bigint not null check (origin_bot_user_id > 0),
  original_message_at timestamptz not null,
  forwarded_at timestamptz not null,
  context_hash text not null check (context_hash ~ '^[0-9a-f]{64}$'),
  normalized_text_hash text not null check (normalized_text_hash ~ '^[0-9a-f]{64}$'),
  context_text text not null check (char_length(context_text) between 1 and 1500),
  received_at timestamptz not null default now(),
  foreign key (campaign_id, source_key)
    references public.verification_sources(campaign_id, source_key),
  unique (campaign_id, context_hash),
  check (forwarded_at >= original_message_at)
);

create index if not exists telegram_trending_context_match_idx
  on public.telegram_trending_receipt_contexts
    (campaign_id, source_key, telegram_user_id, forwarded_at desc);

create table if not exists public.telegram_trending_receipts (
  id bigserial primary key,
  campaign_id text not null,
  source_key text not null,
  telegram_user_id bigint not null check (telegram_user_id > 0),
  origin_bot_user_id bigint not null check (origin_bot_user_id > 0),
  original_message_at timestamptz not null,
  forwarded_at timestamptz not null,
  receipt_hash text not null check (receipt_hash ~ '^[0-9a-f]{64}$'),
  normalized_text_hash text not null check (normalized_text_hash ~ '^[0-9a-f]{64}$'),
  receipt_text text not null check (char_length(receipt_text) between 1 and 1500),
  context_id bigint references public.telegram_trending_receipt_contexts(id),
  participation_event_id bigint not null unique
    references public.campaign_participation_events(id),
  received_at timestamptz not null default now(),
  foreign key (campaign_id, source_key)
    references public.verification_sources(campaign_id, source_key),
  unique (campaign_id, receipt_hash),
  check (forwarded_at >= original_message_at)
);

create index if not exists telegram_trending_receipts_participant_idx
  on public.telegram_trending_receipts
    (campaign_id, telegram_user_id, received_at desc);

drop trigger if exists telegram_trending_source_configs_immutable
  on public.telegram_trending_source_configs;
create trigger telegram_trending_source_configs_immutable
before update or delete on public.telegram_trending_source_configs
for each row execute function public.reject_campaign_ledger_mutation();

drop trigger if exists telegram_trending_receipt_contexts_immutable
  on public.telegram_trending_receipt_contexts;
create trigger telegram_trending_receipt_contexts_immutable
before update or delete on public.telegram_trending_receipt_contexts
for each row execute function public.reject_campaign_ledger_mutation();

drop trigger if exists telegram_trending_receipts_immutable
  on public.telegram_trending_receipts;
create trigger telegram_trending_receipts_immutable
before update or delete on public.telegram_trending_receipts
for each row execute function public.reject_campaign_ledger_mutation();

alter table public.telegram_trending_source_configs enable row level security;
alter table public.telegram_trending_receipt_contexts enable row level security;
alter table public.telegram_trending_receipts enable row level security;

revoke all on public.telegram_trending_source_configs,
  public.telegram_trending_receipt_contexts,
  public.telegram_trending_receipts
from public, anon, authenticated;

grant select, insert on public.telegram_trending_source_configs,
  public.telegram_trending_receipt_contexts,
  public.telegram_trending_receipts
to service_role;
grant usage, select on sequence public.telegram_trending_source_configs_id_seq,
  public.telegram_trending_receipt_contexts_id_seq,
  public.telegram_trending_receipts_id_seq
to service_role;

insert into public.telegram_trending_source_configs (
  campaign_id, source_key, telegram_bot_user_id, verification_mode,
  success_markers, context_markers, receipt_max_age_seconds,
  pair_max_gap_seconds, evidence_hash, configuration_source, configured_by,
  idempotency_key
) values
  (
    'bond-the-duck-2026', 'telegram:majorbuybot', 7098195052,
    'DIRECT_RECEIPT', array['thanks for your vote','has been counted'],
    array['fawkq'], 600, null,
    '3ed5849d70ece4687765e44e2e1fb4e6071f60f89e0a785c6fd292e92e4b2a91',
    'VERIFIED_BROWSER_EVIDENCE', null,
    '3ed5849d70ece4687765e44e2e1fb4e6071f60f89e0a785c6fd292e92e4b2a91'
  ),
  (
    'bond-the-duck-2026', 'telegram:wtftrending', 7812045152,
    'PAIRED_CONTEXT', array['your vote successfully added'],
    array['vote for fawk q'], 600, 300,
    '4bdb3f107a2333aadfaf5bfa6e0d280f80ce8c6b1173a54827e04ce98f1fe921',
    'VERIFIED_BROWSER_EVIDENCE', null,
    '4bdb3f107a2333aadfaf5bfa6e0d280f80ce8c6b1173a54827e04ce98f1fe921'
  ),
  (
    'bond-the-duck-2026', 'telegram:trenchobot', 8094927043,
    'DIRECT_RECEIPT', array['vote confirmed'], array['fawkq'], 600, null,
    '3dc1d147e7bbbf15fd69157d7ffbdac1c39d3ae01947e0ae7da3e7d7d2bf9a03',
    'VERIFIED_BROWSER_EVIDENCE', null,
    '3dc1d147e7bbbf15fd69157d7ffbdac1c39d3ae01947e0ae7da3e7d7d2bf9a03'
  ),
  (
    'bond-the-duck-2026', 'telegram:bbtrendingbot', 8196088162,
    'DIRECT_RECEIPT', array['successfully submitted'], array['fawkq'], 600, null,
    '443f0cc49e7a3942dca01b20b6357793fbfdf80cd0dcc83543b7c9881e4da4a0',
    'VERIFIED_BROWSER_EVIDENCE', null,
    '443f0cc49e7a3942dca01b20b6357793fbfdf80cd0dcc83543b7c9881e4da4a0'
  ),
  (
    'bond-the-duck-2026', 'telegram:drokiatrendsbot', 8500408157,
    'DIRECT_RECEIPT', array['vote successfully landed'],
    array['project: $$fawkq','fawkq'], 600, null,
    '6349405d06e18600af558a206007a16915ff50933b6580d6f2fad1783bfd6eb4',
    'VERIFIED_BROWSER_EVIDENCE', null,
    '6349405d06e18600af558a206007a16915ff50933b6580d6f2fad1783bfd6eb4'
  )
on conflict (idempotency_key) do nothing;

do $verify_telegram_trending_config$
begin
  if (
    select count(*) from public.telegram_trending_source_configs
    where campaign_id = 'bond-the-duck-2026'
      and source_key in (
        'telegram:majorbuybot','telegram:wtftrending','telegram:trenchobot',
        'telegram:bbtrendingbot','telegram:drokiatrendsbot'
      )
  ) <> 5 then
    raise exception 'exact five-bot numeric Telegram configuration was not installed';
  end if;
end;
$verify_telegram_trending_config$;

create or replace function public.record_telegram_trending_source_config(
  p_campaign_id text,
  p_source_key text,
  p_telegram_bot_user_id bigint,
  p_verification_mode text,
  p_success_markers text[],
  p_context_markers text[],
  p_receipt_max_age_seconds integer,
  p_pair_max_gap_seconds integer,
  p_evidence_hash text,
  p_founder_user_id bigint,
  p_idempotency_key text
) returns public.telegram_trending_source_configs
language plpgsql security invoker set search_path = '' as $$
declare
  result public.telegram_trending_source_configs;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_source_key is null or btrim(p_source_key) = ''
    or p_telegram_bot_user_id is null or p_telegram_bot_user_id <= 0
    or p_verification_mode not in ('DIRECT_RECEIPT','PAIRED_CONTEXT')
    or p_success_markers is null or cardinality(p_success_markers) not between 1 and 8
    or p_context_markers is null or cardinality(p_context_markers) not between 1 and 8
    or p_receipt_max_age_seconds is null
    or p_receipt_max_age_seconds not between 60 and 1800
    or (p_verification_mode = 'DIRECT_RECEIPT' and p_pair_max_gap_seconds is not null)
    or (p_verification_mode = 'PAIRED_CONTEXT'
      and p_pair_max_gap_seconds not between 30 and 600)
    or p_evidence_hash is null or p_evidence_hash !~ '^[0-9a-f]{64}$'
    or p_founder_user_id is null or p_founder_user_id <= 0
    or p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$'
  then raise exception 'invalid Telegram trending source configuration'; end if;

  select * into result from public.telegram_trending_source_configs
  where idempotency_key = p_idempotency_key;
  if found then
    if result.campaign_id is distinct from p_campaign_id
      or result.source_key is distinct from p_source_key
      or result.telegram_bot_user_id is distinct from p_telegram_bot_user_id
      or result.verification_mode is distinct from p_verification_mode
      or result.success_markers is distinct from p_success_markers
      or result.context_markers is distinct from p_context_markers
      or result.receipt_max_age_seconds is distinct from p_receipt_max_age_seconds
      or result.pair_max_gap_seconds is distinct from p_pair_max_gap_seconds
      or result.evidence_hash is distinct from p_evidence_hash
      or result.configured_by is distinct from p_founder_user_id
    then raise exception 'Telegram source config idempotency key was reused'; end if;
    return result;
  end if;

  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = p_campaign_id
      and founder_user_id = p_founder_user_id and enabled
  ) then raise exception 'founder is not authorized for this campaign'; end if;
  if not exists (
    select 1 from public.verification_sources
    where campaign_id = p_campaign_id and source_key = p_source_key
      and source = 'event'
  ) then raise exception 'Telegram trending source is not registered'; end if;
  if exists (
    select 1 from public.telegram_trending_source_configs
    where campaign_id = p_campaign_id
      and telegram_bot_user_id = p_telegram_bot_user_id
      and source_key <> p_source_key
  ) then raise exception 'Telegram numeric bot ID is already bound to another source'; end if;

  insert into public.telegram_trending_source_configs (
    campaign_id, source_key, telegram_bot_user_id, verification_mode,
    success_markers, context_markers, receipt_max_age_seconds,
    pair_max_gap_seconds, evidence_hash, configuration_source, configured_by,
    idempotency_key
  ) values (
    p_campaign_id, p_source_key, p_telegram_bot_user_id, p_verification_mode,
    p_success_markers, p_context_markers, p_receipt_max_age_seconds,
    p_pair_max_gap_seconds, p_evidence_hash, 'FOUNDER_CERTIFICATION',
    p_founder_user_id, p_idempotency_key
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.record_telegram_trending_receipt_context(
  p_campaign_id text,
  p_source_key text,
  p_telegram_user_id bigint,
  p_origin_bot_user_id bigint,
  p_original_message_at timestamptz,
  p_forwarded_at timestamptz,
  p_context_hash text,
  p_normalized_text_hash text,
  p_context_text text
) returns public.telegram_trending_receipt_contexts
language plpgsql security invoker set search_path = '' as $$
declare
  config public.telegram_trending_source_configs;
  source_row public.verification_sources;
  result public.telegram_trending_receipt_contexts;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_source_key is null or btrim(p_source_key) = ''
    or p_telegram_user_id is null or p_telegram_user_id <= 0
    or p_origin_bot_user_id is null or p_origin_bot_user_id <= 0
    or p_original_message_at is null or p_forwarded_at is null
    or p_forwarded_at < p_original_message_at
    or p_forwarded_at > now() + interval '5 minutes'
    or p_forwarded_at < now() - interval '5 minutes'
    or p_context_hash is null or p_context_hash !~ '^[0-9a-f]{64}$'
    or p_normalized_text_hash is null or p_normalized_text_hash !~ '^[0-9a-f]{64}$'
    or p_context_text is null or char_length(p_context_text) not between 1 and 1500
  then raise exception 'invalid Telegram trending context'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id || ':' || p_context_hash, 0));
  select * into result from public.telegram_trending_receipt_contexts
  where campaign_id = p_campaign_id and context_hash = p_context_hash;
  if found then
    if result.source_key is distinct from p_source_key
      or result.telegram_user_id is distinct from p_telegram_user_id
      or result.origin_bot_user_id is distinct from p_origin_bot_user_id
      or result.original_message_at is distinct from p_original_message_at
      or result.forwarded_at is distinct from p_forwarded_at
      or result.normalized_text_hash is distinct from p_normalized_text_hash
      or result.context_text is distinct from p_context_text
    then raise exception 'Telegram context was reused with different evidence'; end if;
    return result;
  end if;

  if not exists (
    select 1 from public.campaigns where id = p_campaign_id and state = 'ACTIVE'
  ) then raise exception 'campaign is not accepting Telegram vote contexts'; end if;
  if not exists (
    select 1 from public.identity_links where campaign_id = p_campaign_id
      and telegram_user_id = p_telegram_user_id and x_verified_at is not null
  ) then raise exception 'campaign identity is not verified'; end if;

  select * into source_row from public.verification_sources
  where campaign_id = p_campaign_id and source_key = p_source_key;
  if not found or source_row.source <> 'event'
    or source_row.classification not in ('MACHINE_VERIFIED','PROOF_SUPPORTED')
  then raise exception 'Telegram trending source is not individually verifiable'; end if;
  select * into config from public.telegram_trending_source_configs
  where campaign_id = p_campaign_id and source_key = p_source_key
  order by configured_at desc, id desc limit 1;
  if not found or config.verification_mode <> 'PAIRED_CONTEXT'
    or config.telegram_bot_user_id <> p_origin_bot_user_id
  then raise exception 'Telegram trending context source is not configured'; end if;
  if p_forwarded_at - p_original_message_at
      > make_interval(secs => config.receipt_max_age_seconds)
  then raise exception 'Telegram trending context is outside the forwarding window'; end if;
  if not exists (
    select 1 from unnest(config.context_markers) marker
    where lower(p_context_text) like '%' || lower(marker) || '%'
  ) then raise exception 'Telegram trending context marker is missing'; end if;
  if not exists (
    select 1 from (
      select certification.*
      from public.verification_source_certifications certification
      where certification.campaign_id = p_campaign_id
        and certification.source_key = p_source_key
      order by certification.checked_at desc, certification.id desc
      limit 1
    ) latest
    where latest.source_kind = 'TELEGRAM_BOT'
      and latest.classification = source_row.classification
      and latest.health = 'HEALTHY'
      and latest.checked_at <= now() + interval '5 minutes'
      and latest.expires_at > now()
      and latest.expires_at <= latest.checked_at + interval '72 hours'
  ) then raise exception 'Telegram source certification is missing, stale or unhealthy'; end if;

  insert into public.telegram_trending_receipt_contexts (
    campaign_id, source_key, telegram_user_id, origin_bot_user_id,
    original_message_at, forwarded_at, context_hash, normalized_text_hash,
    context_text
  ) values (
    p_campaign_id, p_source_key, p_telegram_user_id, p_origin_bot_user_id,
    p_original_message_at, p_forwarded_at, p_context_hash,
    p_normalized_text_hash, p_context_text
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.ingest_telegram_trending_receipt(
  p_campaign_id text,
  p_source_key text,
  p_telegram_user_id bigint,
  p_origin_bot_user_id bigint,
  p_original_message_at timestamptz,
  p_forwarded_at timestamptz,
  p_receipt_hash text,
  p_normalized_text_hash text,
  p_receipt_text text
) returns public.telegram_trending_receipts
language plpgsql security invoker set search_path = '' as $$
declare
  config public.telegram_trending_source_configs;
  source_row public.verification_sources;
  context_row public.telegram_trending_receipt_contexts;
  event_row public.campaign_participation_events;
  result public.telegram_trending_receipts;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_source_key is null or btrim(p_source_key) = ''
    or p_telegram_user_id is null or p_telegram_user_id <= 0
    or p_origin_bot_user_id is null or p_origin_bot_user_id <= 0
    or p_original_message_at is null or p_forwarded_at is null
    or p_forwarded_at < p_original_message_at
    or p_forwarded_at > now() + interval '5 minutes'
    or p_forwarded_at < now() - interval '5 minutes'
    or p_receipt_hash is null or p_receipt_hash !~ '^[0-9a-f]{64}$'
    or p_normalized_text_hash is null or p_normalized_text_hash !~ '^[0-9a-f]{64}$'
    or p_receipt_text is null or char_length(p_receipt_text) not between 1 and 1500
  then raise exception 'invalid Telegram trending receipt'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id || ':' || p_receipt_hash, 0));
  select * into result from public.telegram_trending_receipts
  where campaign_id = p_campaign_id and receipt_hash = p_receipt_hash;
  if found then
    if result.source_key is distinct from p_source_key
      or result.telegram_user_id is distinct from p_telegram_user_id
      or result.origin_bot_user_id is distinct from p_origin_bot_user_id
      or result.original_message_at is distinct from p_original_message_at
      or result.forwarded_at is distinct from p_forwarded_at
      or result.normalized_text_hash is distinct from p_normalized_text_hash
      or result.receipt_text is distinct from p_receipt_text
    then raise exception 'Telegram receipt was reused with different evidence'; end if;
    return result;
  end if;

  select * into source_row from public.verification_sources
  where campaign_id = p_campaign_id and source_key = p_source_key;
  if not found or source_row.source <> 'event'
    or source_row.classification not in ('MACHINE_VERIFIED','PROOF_SUPPORTED')
  then raise exception 'Telegram trending source is not individually verifiable'; end if;
  select * into config from public.telegram_trending_source_configs
  where campaign_id = p_campaign_id and source_key = p_source_key
  order by configured_at desc, id desc limit 1;
  if not found or config.telegram_bot_user_id <> p_origin_bot_user_id
  then raise exception 'Telegram trending receipt source is not configured'; end if;
  if p_forwarded_at - p_original_message_at
      > make_interval(secs => config.receipt_max_age_seconds)
  then raise exception 'Telegram trending receipt is outside the forwarding window'; end if;
  if not exists (
    select 1 from unnest(config.success_markers) marker
    where lower(p_receipt_text) like '%' || lower(marker) || '%'
  ) then raise exception 'Telegram trending receipt success marker is missing'; end if;
  if not exists (
    select 1 from (
      select certification.*
      from public.verification_source_certifications certification
      where certification.campaign_id = p_campaign_id
        and certification.source_key = p_source_key
      order by certification.checked_at desc, certification.id desc
      limit 1
    ) latest
    where latest.source_kind = 'TELEGRAM_BOT'
      and latest.classification = source_row.classification
      and latest.health = 'HEALTHY'
      and latest.checked_at <= now() + interval '5 minutes'
      and latest.expires_at > now()
      and latest.expires_at <= latest.checked_at + interval '72 hours'
  ) then raise exception 'Telegram source certification is missing, stale or unhealthy'; end if;

  if config.verification_mode = 'DIRECT_RECEIPT' then
    if not exists (
      select 1 from unnest(config.context_markers) marker
      where lower(p_receipt_text) like '%' || lower(marker) || '%'
    ) then raise exception 'Telegram trending receipt FAWKQ context is missing'; end if;
  else
    select * into context_row
    from public.telegram_trending_receipt_contexts context
    where context.campaign_id = p_campaign_id
      and context.source_key = p_source_key
      and context.telegram_user_id = p_telegram_user_id
      and context.origin_bot_user_id = p_origin_bot_user_id
      and context.forwarded_at <= p_forwarded_at
      and context.received_at >= now() - make_interval(secs => config.receipt_max_age_seconds)
      and abs(extract(epoch from (context.original_message_at - p_original_message_at)))
        <= config.pair_max_gap_seconds
      and not exists (
        select 1 from public.telegram_trending_receipts used
        where used.context_id = context.id
      )
    order by context.forwarded_at desc, context.id desc
    limit 1;
    if not found then raise exception 'matching fresh FAWKQ context is required'; end if;
  end if;

  event_row := public.ingest_campaign_participation_event(
    p_campaign_id,
    'event',
    p_source_key,
    p_telegram_user_id,
    'telegram-receipt:' || p_receipt_hash,
    p_original_message_at,
    p_receipt_hash
  );

  insert into public.telegram_trending_receipts (
    campaign_id, source_key, telegram_user_id, origin_bot_user_id,
    original_message_at, forwarded_at, receipt_hash, normalized_text_hash,
    receipt_text, context_id, participation_event_id
  ) values (
    p_campaign_id, p_source_key, p_telegram_user_id, p_origin_bot_user_id,
    p_original_message_at, p_forwarded_at, p_receipt_hash,
    p_normalized_text_hash, p_receipt_text, context_row.id, event_row.id
  ) returning * into result;
  return result;
end;
$$;

revoke all on function public.record_telegram_trending_source_config(
  text,text,bigint,text,text[],text[],integer,integer,text,bigint,text
) from public, anon, authenticated;
revoke all on function public.record_telegram_trending_receipt_context(
  text,text,bigint,bigint,timestamptz,timestamptz,text,text,text
) from public, anon, authenticated;
revoke all on function public.ingest_telegram_trending_receipt(
  text,text,bigint,bigint,timestamptz,timestamptz,text,text,text
) from public, anon, authenticated;

grant execute on function public.record_telegram_trending_source_config(
  text,text,bigint,text,text[],text[],integer,integer,text,bigint,text
) to service_role;
grant execute on function public.record_telegram_trending_receipt_context(
  text,text,bigint,bigint,timestamptz,timestamptz,text,text,text
) to service_role;
grant execute on function public.ingest_telegram_trending_receipt(
  text,text,bigint,bigint,timestamptz,timestamptz,text,text,text
) to service_role;
