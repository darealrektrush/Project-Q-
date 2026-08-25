-- Reusable Project Q Earn to Burn foundation. This migration creates no
-- program, milestone, proposal or receipt rows and cannot execute a token
-- burn. All objects remain server-only and fail closed until deliberately
-- configured, funded, rehearsed and enabled.

create table if not exists public.earn_to_burn_programs (
  id text primary key,
  campaign_id text not null references public.campaigns(id),
  state text not null default 'DRAFT'
    check (state in ('DRAFT','ENABLED','PAUSED','COMPLETED','ARCHIVED')),
  mint text not null,
  token_program_id text not null
    check (token_program_id in (
      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    )),
  decimals smallint not null check (decimals between 0 and 18),
  original_supply_base_units numeric(30,0) not null check (original_supply_base_units > 0),
  observed_start_supply_base_units numeric(30,0)
    check (observed_start_supply_base_units > 0),
  hard_cap_base_units numeric(30,0) not null check (hard_cap_base_units > 0),
  max_single_burn_base_units numeric(30,0) not null check (max_single_burn_base_units > 0),
  rules_hash text not null check (rules_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, mint),
  check (hard_cap_base_units <= original_supply_base_units),
  check (max_single_burn_base_units <= hard_cap_base_units)
);

create table if not exists public.burn_source_accounts (
  program_id text not null references public.earn_to_burn_programs(id),
  token_account text not null,
  authority_label text not null,
  source_type text not null check (source_type in ('CREATOR_WALLET_RESERVE','CREATOR_BUYBACK_RESERVE','BUYBACK_RESERVE')),
  approved boolean not null default false,
  evidence_url text,
  verified_at timestamptz,
  primary key (program_id, token_account)
);

create table if not exists public.burn_program_founders (
  program_id text not null references public.earn_to_burn_programs(id),
  founder_user_id bigint not null,
  created_at timestamptz not null default now(),
  primary key (program_id, founder_user_id)
);

create table if not exists public.burn_milestones (
  id text primary key,
  program_id text not null references public.earn_to_burn_programs(id),
  sequence integer not null check (sequence > 0),
  label text not null,
  progress_target_units bigint not null check (progress_target_units > 0),
  burn_amount_base_units numeric(30,0) not null check (burn_amount_base_units > 0),
  burn_type text not null check (burn_type in ('RESERVE_BURN','BUYBACK_AND_BURN')),
  state text not null default 'LOCKED'
    check (state in ('DRAFT','LOCKED','UNLOCKED','APPROVAL_PENDING','APPROVED','AWAITING_CONFIRMATION','CONFIRMED','HELD','CANCELLED')),
  rules_hash text not null check (rules_hash ~ '^[0-9a-f]{64}$'),
  unlocked_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (program_id, sequence)
);

create table if not exists public.burn_progress_events (
  id bigserial primary key,
  program_id text not null references public.earn_to_burn_programs(id),
  campaign_id text not null references public.campaigns(id),
  source_kind text not null
    check (source_kind in ('XP_LEDGER','ORACLE_RAID','PARTICIPATION','BAGWORK','BUY_TO_EARN','MANUAL_CORRECTION')),
  source_ref text not null,
  telegram_user_id bigint,
  units bigint not null check (units <> 0),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (program_id, source_kind, source_ref)
);

create table if not exists public.burn_proposals (
  id bigserial primary key,
  program_id text not null references public.earn_to_burn_programs(id),
  campaign_id text not null references public.campaigns(id),
  milestone_id text not null unique references public.burn_milestones(id),
  burn_type text not null check (burn_type in ('RESERVE_BURN','BUYBACK_AND_BURN')),
  mint text not null,
  token_program_id text not null,
  source_token_account text not null,
  amount_base_units numeric(30,0) not null check (amount_base_units > 0),
  rules_hash text not null check (rules_hash ~ '^[0-9a-f]{64}$'),
  state text not null default 'PENDING_APPROVAL'
    check (state in ('PENDING_APPROVAL','APPROVED','AWAITING_CONFIRMATION','CONFIRMED','HELD','CANCELLED','FAILED')),
  transaction_signature text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.burn_proposal_approvals (
  proposal_id bigint not null references public.burn_proposals(id),
  founder_user_id bigint not null,
  decision text not null check (decision in ('APPROVE','HOLD','CANCEL')),
  readiness_hash text not null check (readiness_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (proposal_id, founder_user_id)
);

create table if not exists public.burn_receipts (
  id bigserial primary key,
  receipt_code text not null unique check (receipt_code ~ '^ETB-[0-9]{4,8}$'),
  program_id text not null references public.earn_to_burn_programs(id),
  campaign_id text not null references public.campaigns(id),
  proposal_id bigint not null unique references public.burn_proposals(id),
  burn_type text not null check (burn_type in ('RESERVE_BURN','BUYBACK_AND_BURN')),
  mint text not null,
  token_program_id text not null,
  source_token_account text not null,
  amount_base_units numeric(30,0) not null check (amount_base_units > 0),
  supply_before_base_units numeric(30,0) not null check (supply_before_base_units > 0),
  supply_after_base_units numeric(30,0) not null check (supply_after_base_units >= 0),
  transaction_signature text not null unique,
  slot bigint not null check (slot > 0),
  block_time timestamptz not null,
  confirmed_at timestamptz not null default now(),
  proof jsonb not null,
  check (supply_before_base_units - supply_after_base_units = amount_base_units)
);

create table if not exists public.burn_publication_drafts (
  id bigserial primary key,
  receipt_id bigint not null references public.burn_receipts(id),
  platform text not null check (platform in ('PROJECT_Q','X','TELEGRAM','DISCORD','META','REDDIT','BLOG')),
  body text not null,
  body_hash text not null check (body_hash ~ '^[0-9a-f]{64}$'),
  state text not null default 'DRAFT'
    check (state in ('DRAFT','APPROVED','HELD','PUBLISHED','FAILED')),
  approved_by bigint,
  approved_at timestamptz,
  published_ref text,
  published_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (receipt_id, platform)
);

create table if not exists public.burn_audit_log (
  id bigserial primary key,
  program_id text not null references public.earn_to_burn_programs(id),
  proposal_id bigint references public.burn_proposals(id),
  action text not null,
  actor_type text not null check (actor_type in ('SYSTEM','FOUNDER','OPERATOR')),
  actor_ref text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists burn_progress_program_time_idx
  on public.burn_progress_events(program_id, occurred_at);
create index if not exists burn_progress_participant_idx
  on public.burn_progress_events(program_id, telegram_user_id, occurred_at);
create index if not exists burn_proposals_program_state_idx
  on public.burn_proposals(program_id, state, created_at);
create index if not exists burn_receipts_program_slot_idx
  on public.burn_receipts(program_id, slot);
create index if not exists burn_publication_state_idx
  on public.burn_publication_drafts(state, platform, created_at);
create index if not exists burn_audit_program_time_idx
  on public.burn_audit_log(program_id, created_at);

create or replace function public.validate_burn_publication_draft()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.state <> 'DRAFT' then
    raise exception 'burn publication drafts must begin in DRAFT';
  end if;
  if tg_op = 'UPDATE' and old.state <> 'DRAFT'
    and (new.body is distinct from old.body or new.body_hash is distinct from old.body_hash) then
    raise exception 'approved burn publication content is immutable';
  end if;
  if tg_op = 'UPDATE' and new.state is distinct from old.state and not (
    (old.state = 'DRAFT' and new.state in ('APPROVED','HELD'))
    or (old.state = 'HELD' and new.state in ('DRAFT','APPROVED'))
    or (old.state = 'APPROVED' and new.state in ('PUBLISHED','HELD','FAILED'))
    or (old.state = 'FAILED' and new.state in ('APPROVED','HELD'))
  ) then raise exception 'invalid burn publication state transition'; end if;
  if new.state in ('APPROVED','PUBLISHED') and (new.approved_by is null or new.approved_at is null) then
    raise exception 'burn publication approval evidence is required';
  end if;
  if new.state = 'PUBLISHED' and (new.published_ref is null or new.published_at is null) then
    raise exception 'burn publication receipt is required';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists burn_publication_guard on public.burn_publication_drafts;
create trigger burn_publication_guard before insert or update on public.burn_publication_drafts
for each row execute function public.validate_burn_publication_draft();

create or replace function public.reject_immutable_burn_ledger_mutation()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists burn_progress_immutable on public.burn_progress_events;
create trigger burn_progress_immutable before update or delete on public.burn_progress_events
for each row execute function public.reject_immutable_burn_ledger_mutation();
drop trigger if exists burn_receipts_immutable on public.burn_receipts;
create trigger burn_receipts_immutable before update or delete on public.burn_receipts
for each row execute function public.reject_immutable_burn_ledger_mutation();
drop trigger if exists burn_audit_immutable on public.burn_audit_log;
create trigger burn_audit_immutable before update or delete on public.burn_audit_log
for each row execute function public.reject_immutable_burn_ledger_mutation();

create or replace function public.validate_burn_proposal()
returns trigger language plpgsql set search_path = public as $$
declare
  program public.earn_to_burn_programs;
  milestone public.burn_milestones;
  committed numeric(30,0);
begin
  select * into program from public.earn_to_burn_programs where id = new.program_id;
  select * into milestone from public.burn_milestones where id = new.milestone_id;
  if program.state <> 'ENABLED' then raise exception 'earn-to-burn program is not enabled'; end if;
  if milestone.program_id <> new.program_id then
    raise exception 'burn milestone does not belong to this program';
  end if;
  if tg_op = 'INSERT' and milestone.state <> 'UNLOCKED' then
    raise exception 'burn milestone is not unlocked for this program';
  end if;
  if tg_op = 'UPDATE' and milestone.state not in (
    'UNLOCKED','APPROVAL_PENDING','APPROVED','AWAITING_CONFIRMATION','HELD'
  ) then
    raise exception 'burn milestone does not permit proposal updates';
  end if;
  if tg_op = 'UPDATE' and row(
    new.program_id, new.campaign_id, new.milestone_id, new.burn_type, new.mint,
    new.token_program_id, new.source_token_account, new.amount_base_units, new.rules_hash
  ) is distinct from row(
    old.program_id, old.campaign_id, old.milestone_id, old.burn_type, old.mint,
    old.token_program_id, old.source_token_account, old.amount_base_units, old.rules_hash
  ) then raise exception 'burn proposal terms are immutable'; end if;
  if tg_op = 'UPDATE' and new.state is distinct from old.state then
    if not (
      (old.state in ('PENDING_APPROVAL','HELD') and new.state in ('PENDING_APPROVAL','HELD','APPROVED','CANCELLED'))
      or (old.state = 'APPROVED' and new.state = 'AWAITING_CONFIRMATION')
      or (old.state = 'AWAITING_CONFIRMATION' and new.state in ('CONFIRMED','FAILED'))
    ) then raise exception 'invalid burn proposal state transition'; end if;
    if new.state = 'APPROVED' and (
      select count(*) from public.burn_proposal_approvals
      where proposal_id = new.id and decision = 'APPROVE'
    ) <> 2 then raise exception 'two founder approvals are required'; end if;
    if new.state = 'CANCELLED' and (
      select count(*) from public.burn_proposal_approvals
      where proposal_id = new.id and decision = 'CANCEL'
    ) <> 2 then raise exception 'two founder cancellations are required'; end if;
    if new.state = 'AWAITING_CONFIRMATION' and new.transaction_signature is null then
      raise exception 'external transaction signature is required';
    end if;
    if new.state = 'CONFIRMED' and not exists (
      select 1 from public.burn_receipts where proposal_id = new.id
    ) then raise exception 'verified burn receipt is required'; end if;
  end if;
  if tg_op = 'UPDATE' and new.transaction_signature is distinct from old.transaction_signature
    and not (old.state = 'APPROVED' and new.state = 'AWAITING_CONFIRMATION'
      and new.transaction_signature ~ '^[1-9A-HJ-NP-Za-km-z]{80,90}$') then
    raise exception 'burn transaction signature is immutable outside approved attachment';
  end if;
  if new.campaign_id <> program.campaign_id or new.mint <> program.mint
    or new.token_program_id <> program.token_program_id then
    raise exception 'burn proposal program identity mismatch';
  end if;
  if new.amount_base_units <> milestone.burn_amount_base_units
    or new.burn_type <> milestone.burn_type
    or new.rules_hash <> milestone.rules_hash
    or new.rules_hash <> program.rules_hash then
    raise exception 'burn proposal does not match locked milestone rules';
  end if;
  if new.amount_base_units > program.max_single_burn_base_units then
    raise exception 'burn proposal exceeds maximum single burn';
  end if;
  if not exists (
    select 1 from public.burn_source_accounts
    where program_id = new.program_id and token_account = new.source_token_account
      and approved and verified_at is not null and evidence_url is not null
  ) then raise exception 'burn source account is not approved and evidenced'; end if;
  select coalesce(sum(amount_base_units),0) into committed
  from public.burn_proposals
  where program_id = new.program_id
    and state not in ('CANCELLED','FAILED')
    and (tg_op = 'INSERT' or id <> new.id);
  if committed + new.amount_base_units > program.hard_cap_base_units then
    raise exception 'burn proposal exceeds hard program cap';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists burn_proposal_guard on public.burn_proposals;
create trigger burn_proposal_guard before insert or update on public.burn_proposals
for each row execute function public.validate_burn_proposal();

create or replace function public.sync_earn_to_burn_xp_progress(
  p_program_id text,
  p_limit integer default 1000
) returns table(inserted_events integer, total_progress_units bigint, unlocked_milestones integer)
language plpgsql security invoker set search_path = public as $$
declare
  program public.earn_to_burn_programs;
begin
  if p_limit < 1 or p_limit > 5000 then raise exception 'progress sync limit must be between 1 and 5000'; end if;
  perform pg_advisory_xact_lock(hashtext(p_program_id));
  select * into program from public.earn_to_burn_programs where id = p_program_id for update;
  if not found or program.state <> 'ENABLED' then raise exception 'earn-to-burn program is not enabled'; end if;
  if not exists (
    select 1 from public.campaigns where id = program.campaign_id and state = 'ACTIVE'
  ) then raise exception 'campaign is not active'; end if;

  with pending as (
    select x.id, x.campaign_id, x.telegram_user_id, x.amount, x.awarded_at,
           x.source, x.cap_bucket, x.mission_code, x.idempotency_key
    from public.xp_ledger x
    where x.campaign_id = program.campaign_id and x.amount > 0
      and not exists (
        select 1 from public.burn_progress_events b
        where b.program_id = p_program_id
          and b.source_kind = 'XP_LEDGER'
          and b.source_ref = 'xp_ledger:' || x.id::text
      )
    order by x.id
    limit p_limit
  ), inserted as (
    insert into public.burn_progress_events (
      program_id, campaign_id, source_kind, source_ref, telegram_user_id,
      units, occurred_at, metadata
    )
    select p_program_id, campaign_id, 'XP_LEDGER', 'xp_ledger:' || id::text,
           telegram_user_id, amount, awarded_at,
           jsonb_build_object('xpLedgerId', id, 'source', source, 'capBucket', cap_bucket,
                              'missionCode', mission_code, 'idempotencyKey', idempotency_key)
    from pending
    on conflict (program_id, source_kind, source_ref) do nothing
    returning 1
  ) select count(*)::integer into inserted_events from inserted;

  select coalesce(sum(units),0)::bigint into total_progress_units
  from public.burn_progress_events where program_id = p_program_id;

  with unlocked as (
    update public.burn_milestones
    set state = 'UNLOCKED', unlocked_at = now()
    where program_id = p_program_id and state = 'LOCKED'
      and progress_target_units <= total_progress_units
    returning id, label, progress_target_units
  ), audited as (
    insert into public.burn_audit_log(program_id, action, actor_type, actor_ref, evidence)
    select p_program_id, 'MILESTONE_UNLOCKED', 'SYSTEM', id,
           jsonb_build_object('milestoneId', id, 'label', label,
                              'progressTargetUnits', progress_target_units,
                              'totalProgressUnits', total_progress_units)
    from unlocked returning 1
  ) select count(*)::integer into unlocked_milestones from audited;

  return next;
end;
$$;

create or replace function public.create_burn_proposal(
  p_program_id text,
  p_milestone_id text,
  p_source_token_account text
) returns public.burn_proposals
language plpgsql security invoker set search_path = public as $$
declare
  program public.earn_to_burn_programs;
  milestone public.burn_milestones;
  proposal public.burn_proposals;
begin
  perform pg_advisory_xact_lock(hashtext(p_program_id));
  select * into program from public.earn_to_burn_programs where id = p_program_id;
  select * into milestone from public.burn_milestones
    where id = p_milestone_id and program_id = p_program_id for update;
  if not found or milestone.state <> 'UNLOCKED' then raise exception 'burn milestone is not unlocked'; end if;
  if (select count(*) from public.burn_program_founders where program_id = p_program_id) <> 2 then
    raise exception 'burn program requires exactly two configured founders';
  end if;
  insert into public.burn_proposals (
    program_id, campaign_id, milestone_id, burn_type, mint, token_program_id,
    source_token_account, amount_base_units, rules_hash, state
  ) values (
    program.id, program.campaign_id, milestone.id, milestone.burn_type,
    program.mint, program.token_program_id, p_source_token_account,
    milestone.burn_amount_base_units, milestone.rules_hash, 'PENDING_APPROVAL'
  ) returning * into proposal;
  update public.burn_milestones set state = 'APPROVAL_PENDING' where id = milestone.id;
  insert into public.burn_audit_log(program_id, proposal_id, action, actor_type, evidence)
  values (program.id, proposal.id, 'BURN_PROPOSAL_CREATED', 'OPERATOR',
          jsonb_build_object('milestoneId', milestone.id,
                             'sourceTokenAccount', p_source_token_account,
                             'amountBaseUnits', milestone.burn_amount_base_units));
  return proposal;
end;
$$;

create or replace function public.record_burn_proposal_decision(
  p_proposal_id bigint,
  p_founder_user_id bigint,
  p_decision text,
  p_readiness_hash text
) returns public.burn_proposals
language plpgsql security invoker set search_path = public as $$
declare
  proposal public.burn_proposals;
  approval_count integer;
  cancel_count integer;
begin
  select * into proposal from public.burn_proposals where id = p_proposal_id for update;
  if not found or proposal.state not in ('PENDING_APPROVAL','HELD') then
    raise exception 'proposal is not accepting founder decisions';
  end if;
  if p_decision not in ('APPROVE','HOLD','CANCEL') then raise exception 'invalid founder decision'; end if;
  if p_readiness_hash <> proposal.rules_hash then raise exception 'stale proposal readiness hash'; end if;
  if not exists (
    select 1 from public.burn_program_founders
    where program_id = proposal.program_id and founder_user_id = p_founder_user_id
  ) then raise exception 'founder is not authorized for this burn program'; end if;
  if (select count(*) from public.burn_program_founders where program_id = proposal.program_id) <> 2 then
    raise exception 'burn program requires exactly two configured founders';
  end if;
  if exists (
    select 1 from public.burn_proposal_approvals
    where proposal_id = p_proposal_id and founder_user_id = p_founder_user_id
      and decision = p_decision and readiness_hash = p_readiness_hash
  ) then
    return proposal;
  end if;

  insert into public.burn_proposal_approvals
    (proposal_id, founder_user_id, decision, readiness_hash, updated_at)
  values (p_proposal_id, p_founder_user_id, p_decision, p_readiness_hash, now())
  on conflict (proposal_id, founder_user_id) do update
    set decision = excluded.decision,
        readiness_hash = excluded.readiness_hash,
        updated_at = now();

  select count(*) filter (where decision = 'APPROVE'),
         count(*) filter (where decision = 'CANCEL')
  into approval_count, cancel_count
  from public.burn_proposal_approvals where proposal_id = p_proposal_id;

  update public.burn_proposals set state = case
    when cancel_count = 2 then 'CANCELLED'
    when p_decision = 'HOLD' then 'HELD'
    when approval_count = 2 then 'APPROVED'
    else 'PENDING_APPROVAL'
  end where id = p_proposal_id returning * into proposal;

  update public.burn_milestones set state = case proposal.state
    when 'APPROVED' then 'APPROVED'
    when 'HELD' then 'HELD'
    when 'CANCELLED' then 'CANCELLED'
    else 'APPROVAL_PENDING'
  end where id = proposal.milestone_id;

  insert into public.burn_audit_log(program_id, proposal_id, action, actor_type, actor_ref, evidence)
  values (proposal.program_id, proposal.id, 'FOUNDER_DECISION', 'FOUNDER', p_founder_user_id::text,
          jsonb_build_object('decision', p_decision, 'readinessHash', p_readiness_hash));
  return proposal;
end;
$$;

create or replace function public.attach_approved_burn_signature(
  p_proposal_id bigint,
  p_transaction_signature text
) returns public.burn_proposals
language plpgsql security invoker set search_path = public as $$
declare proposal public.burn_proposals;
begin
  if p_transaction_signature !~ '^[1-9A-HJ-NP-Za-km-z]{80,90}$' then
    raise exception 'invalid Solana transaction signature';
  end if;
  select * into proposal from public.burn_proposals where id = p_proposal_id for update;
  if not found or proposal.state <> 'APPROVED' then raise exception 'burn proposal is not approved'; end if;
  if (select count(*) from public.burn_proposal_approvals
      where proposal_id = p_proposal_id and decision = 'APPROVE') <> 2 then
    raise exception 'two founder approvals are required';
  end if;
  update public.burn_proposals
    set transaction_signature = p_transaction_signature,
        state = 'AWAITING_CONFIRMATION', updated_at = now()
  where id = p_proposal_id returning * into proposal;
  update public.burn_milestones set state = 'AWAITING_CONFIRMATION'
    where id = proposal.milestone_id;
  insert into public.burn_audit_log(program_id, proposal_id, action, actor_type, evidence)
  values (proposal.program_id, proposal.id, 'SIGNATURE_ATTACHED', 'OPERATOR',
          jsonb_build_object('transactionSignature', p_transaction_signature));
  return proposal;
end;
$$;

create or replace function public.confirm_verified_burn(
  p_proposal_id bigint,
  p_amount_base_units numeric,
  p_supply_before_base_units numeric,
  p_supply_after_base_units numeric,
  p_slot bigint,
  p_block_time timestamptz,
  p_proof jsonb
) returns public.burn_receipts
language plpgsql security invoker set search_path = public as $$
declare
  proposal public.burn_proposals;
  receipt public.burn_receipts;
  next_code text;
begin
  select * into proposal from public.burn_proposals where id = p_proposal_id for update;
  if not found or proposal.state <> 'AWAITING_CONFIRMATION' or proposal.transaction_signature is null then
    raise exception 'burn proposal is not awaiting confirmation';
  end if;
  if p_amount_base_units <> proposal.amount_base_units
    or p_supply_before_base_units - p_supply_after_base_units <> proposal.amount_base_units then
    raise exception 'verified burn proof does not reconcile';
  end if;
  if p_slot <= 0 or p_block_time is null or p_proof is null or p_proof = '{}'::jsonb then
    raise exception 'complete on-chain burn proof is required';
  end if;
  if (p_proof->>'signature') is distinct from proposal.transaction_signature
    or (p_proof->>'mint') is distinct from proposal.mint
    or (p_proof->>'tokenProgramId') is distinct from proposal.token_program_id
    or (p_proof->>'sourceTokenAccount') is distinct from proposal.source_token_account
    or (p_proof->>'amountBaseUnits')::numeric is distinct from proposal.amount_base_units
    or (p_proof->>'supplyBeforeBaseUnits')::numeric is distinct from p_supply_before_base_units
    or (p_proof->>'supplyAfterBaseUnits')::numeric is distinct from p_supply_after_base_units then
    raise exception 'verified burn proof identity mismatch';
  end if;
  perform pg_advisory_xact_lock(hashtext(proposal.program_id));
  next_code := 'ETB-' || lpad((
    1 + (select count(*) from public.burn_receipts where program_id = proposal.program_id)
  )::text, 4, '0');
  insert into public.burn_receipts (
    receipt_code, program_id, campaign_id, proposal_id, burn_type, mint,
    token_program_id, source_token_account, amount_base_units,
    supply_before_base_units, supply_after_base_units, transaction_signature,
    slot, block_time, proof
  ) values (
    next_code, proposal.program_id, proposal.campaign_id, proposal.id,
    proposal.burn_type, proposal.mint, proposal.token_program_id,
    proposal.source_token_account, proposal.amount_base_units,
    p_supply_before_base_units, p_supply_after_base_units,
    proposal.transaction_signature, p_slot, p_block_time, p_proof
  ) returning * into receipt;
  update public.burn_proposals set state = 'CONFIRMED', updated_at = now() where id = proposal.id;
  update public.burn_milestones set state = 'CONFIRMED', confirmed_at = now()
    where id = proposal.milestone_id;
  insert into public.burn_audit_log(program_id, proposal_id, action, actor_type, evidence)
  values (proposal.program_id, proposal.id, 'BURN_CONFIRMED', 'SYSTEM',
          jsonb_build_object('receiptCode', receipt.receipt_code,
                             'transactionSignature', receipt.transaction_signature,
                             'slot', receipt.slot));
  return receipt;
end;
$$;

create or replace function public.approve_burn_publication_draft(
  p_draft_id bigint,
  p_approver_user_id bigint,
  p_expected_body_hash text
) returns public.burn_publication_drafts
language plpgsql security invoker set search_path = public as $$
declare
  draft public.burn_publication_drafts;
  receipt public.burn_receipts;
begin
  select * into draft from public.burn_publication_drafts where id = p_draft_id for update;
  if not found or draft.state not in ('DRAFT','HELD','FAILED') then
    raise exception 'publication draft is not accepting approval';
  end if;
  if p_expected_body_hash is distinct from draft.body_hash then raise exception 'stale publication draft hash'; end if;
  select * into receipt from public.burn_receipts where id = draft.receipt_id;
  if not exists (
    select 1 from public.burn_program_founders
    where program_id = receipt.program_id and founder_user_id = p_approver_user_id
  ) then raise exception 'founder is not authorized to approve this publication'; end if;
  update public.burn_publication_drafts
    set state = 'APPROVED', approved_by = p_approver_user_id, approved_at = now(),
        published_ref = null, published_at = null, last_error = null
    where id = p_draft_id returning * into draft;
  insert into public.burn_audit_log(program_id, proposal_id, action, actor_type, actor_ref, evidence)
  values (receipt.program_id, receipt.proposal_id, 'BURN_PUBLICATION_APPROVED', 'FOUNDER',
          p_approver_user_id::text,
          jsonb_build_object('draftId', draft.id, 'platform', draft.platform,
                             'bodyHash', draft.body_hash));
  return draft;
end;
$$;

create or replace function public.mark_burn_publication_published(
  p_draft_id bigint,
  p_expected_body_hash text,
  p_published_ref text
) returns public.burn_publication_drafts
language plpgsql security invoker set search_path = public as $$
declare
  draft public.burn_publication_drafts;
  receipt public.burn_receipts;
begin
  if p_published_ref is null or btrim(p_published_ref) = '' then raise exception 'published reference is required'; end if;
  select * into draft from public.burn_publication_drafts where id = p_draft_id for update;
  if not found or draft.state <> 'APPROVED' then raise exception 'publication draft is not approved'; end if;
  if p_expected_body_hash is distinct from draft.body_hash then raise exception 'stale publication draft hash'; end if;
  select * into receipt from public.burn_receipts where id = draft.receipt_id;
  update public.burn_publication_drafts
    set state = 'PUBLISHED', published_ref = p_published_ref, published_at = now(),
        attempts = attempts + 1, last_error = null
    where id = p_draft_id returning * into draft;
  insert into public.burn_audit_log(program_id, proposal_id, action, actor_type, evidence)
  values (receipt.program_id, receipt.proposal_id, 'BURN_PUBLICATION_PUBLISHED', 'SYSTEM',
          jsonb_build_object('draftId', draft.id, 'platform', draft.platform,
                             'bodyHash', draft.body_hash, 'publishedRef', p_published_ref));
  return draft;
end;
$$;

alter table public.earn_to_burn_programs enable row level security;
alter table public.burn_source_accounts enable row level security;
alter table public.burn_program_founders enable row level security;
alter table public.burn_milestones enable row level security;
alter table public.burn_progress_events enable row level security;
alter table public.burn_proposals enable row level security;
alter table public.burn_proposal_approvals enable row level security;
alter table public.burn_receipts enable row level security;
alter table public.burn_publication_drafts enable row level security;
alter table public.burn_audit_log enable row level security;

revoke all on public.earn_to_burn_programs, public.burn_source_accounts,
  public.burn_program_founders, public.burn_milestones, public.burn_progress_events,
  public.burn_proposals, public.burn_proposal_approvals, public.burn_receipts,
  public.burn_publication_drafts, public.burn_audit_log from anon, authenticated;
revoke all on function public.reject_immutable_burn_ledger_mutation() from public, anon, authenticated;
revoke all on function public.validate_burn_proposal() from public, anon, authenticated;
revoke all on function public.sync_earn_to_burn_xp_progress(text,integer) from public, anon, authenticated;
revoke all on function public.create_burn_proposal(text,text,text) from public, anon, authenticated;
revoke all on function public.record_burn_proposal_decision(bigint,bigint,text,text) from public, anon, authenticated;
revoke all on function public.attach_approved_burn_signature(bigint,text) from public, anon, authenticated;
revoke all on function public.confirm_verified_burn(bigint,numeric,numeric,numeric,bigint,timestamptz,jsonb) from public, anon, authenticated;
revoke all on function public.validate_burn_publication_draft() from public, anon, authenticated;
revoke all on function public.approve_burn_publication_draft(bigint,bigint,text) from public, anon, authenticated;
revoke all on function public.mark_burn_publication_published(bigint,text,text) from public, anon, authenticated;

grant select, insert, update on public.earn_to_burn_programs, public.burn_source_accounts,
  public.burn_program_founders, public.burn_milestones, public.burn_proposals,
  public.burn_proposal_approvals, public.burn_publication_drafts to service_role;
grant select, insert on public.burn_progress_events, public.burn_receipts,
  public.burn_audit_log to service_role;
grant usage, select on sequence public.burn_progress_events_id_seq,
  public.burn_proposals_id_seq, public.burn_receipts_id_seq,
  public.burn_publication_drafts_id_seq, public.burn_audit_log_id_seq to service_role;
grant execute on function public.record_burn_proposal_decision(bigint,bigint,text,text) to service_role;
grant execute on function public.sync_earn_to_burn_xp_progress(text,integer) to service_role;
grant execute on function public.create_burn_proposal(text,text,text) to service_role;
grant execute on function public.attach_approved_burn_signature(bigint,text) to service_role;
grant execute on function public.confirm_verified_burn(bigint,numeric,numeric,numeric,bigint,timestamptz,jsonb) to service_role;
grant execute on function public.approve_burn_publication_draft(bigint,bigint,text) to service_role;
grant execute on function public.mark_burn_publication_published(bigint,text,text) to service_role;
