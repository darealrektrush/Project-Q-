-- Bond the Duck deterministic cycle draw evidence.
-- Seed is fixed by pre-open commitment hash + deterministic cutoff block.
-- Reveal proves the commitment preimage but never changes the winner seed.

create table if not exists public.campaign_cycle_draw_commitments (
  campaign_id text not null,
  cycle_id integer not null check (cycle_id between 1 and 5),
  protocol_version text not null default 'bond-draw-v1',
  commit_hash text not null check (commit_hash ~ '^[0-9a-f]{64}$'),
  committed_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (campaign_id, cycle_id),
  foreign key (campaign_id, cycle_id) references public.cycles(campaign_id, cycle_id)
);

create table if not exists public.campaign_cycle_draw_cutoffs (
  campaign_id text not null,
  cycle_id integer not null check (cycle_id between 1 and 5),
  previous_slot bigint not null check (previous_slot > 0),
  previous_blockhash text not null,
  previous_block_time timestamptz not null,
  cutoff_slot bigint not null check (cutoff_slot > 0),
  cutoff_blockhash text not null,
  cutoff_block_time timestamptz not null,
  resolver_version text not null default 'first-finalized-block-at-or-after-v1',
  resolved_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (campaign_id, cycle_id),
  foreign key (campaign_id, cycle_id) references public.cycles(campaign_id, cycle_id),
  check (previous_slot < cutoff_slot),
  check (previous_block_time <= cutoff_block_time)
);

create table if not exists public.campaign_cycle_draw_reveals (
  campaign_id text not null,
  cycle_id integer not null check (cycle_id between 1 and 5),
  reveal_value text not null check (reveal_value ~ '^[0-9a-f]{64}$'),
  revealed_at timestamptz not null,
  on_time boolean not null,
  created_at timestamptz not null default now(),
  primary key (campaign_id, cycle_id),
  foreign key (campaign_id, cycle_id) references public.cycles(campaign_id, cycle_id)
);

create table if not exists public.campaign_cycle_draw_finalizations (
  campaign_id text not null,
  cycle_id integer not null check (cycle_id between 1 and 5),
  protocol_version text not null default 'bond-draw-v1',
  public_seed text not null check (public_seed ~ '^[0-9a-f]{64}$'),
  fallback_used boolean not null,
  finalized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (campaign_id, cycle_id),
  foreign key (campaign_id, cycle_id) references public.cycles(campaign_id, cycle_id)
);

create index if not exists cycle_draw_commitments_hash_idx
  on public.campaign_cycle_draw_commitments(campaign_id, commit_hash);
create index if not exists cycle_draw_cutoffs_slot_idx
  on public.campaign_cycle_draw_cutoffs(campaign_id, cutoff_slot);

alter table public.campaign_cycle_draw_commitments enable row level security;
alter table public.campaign_cycle_draw_cutoffs enable row level security;
alter table public.campaign_cycle_draw_reveals enable row level security;
alter table public.campaign_cycle_draw_finalizations enable row level security;

revoke all on public.campaign_cycle_draw_commitments,
  public.campaign_cycle_draw_cutoffs,
  public.campaign_cycle_draw_reveals,
  public.campaign_cycle_draw_finalizations
from public, anon, authenticated;

grant select, insert on public.campaign_cycle_draw_commitments to service_role;
grant select, insert on public.campaign_cycle_draw_cutoffs to service_role;
grant select, insert on public.campaign_cycle_draw_reveals to service_role;
grant select, insert on public.campaign_cycle_draw_finalizations to service_role;

create trigger campaign_cycle_draw_commitments_immutable
before update or delete on public.campaign_cycle_draw_commitments
for each row execute function public.reject_campaign_ledger_mutation();

create trigger campaign_cycle_draw_cutoffs_immutable
before update or delete on public.campaign_cycle_draw_cutoffs
for each row execute function public.reject_campaign_ledger_mutation();

create trigger campaign_cycle_draw_reveals_immutable
before update or delete on public.campaign_cycle_draw_reveals
for each row execute function public.reject_campaign_ledger_mutation();

create trigger campaign_cycle_draw_finalizations_immutable
before update or delete on public.campaign_cycle_draw_finalizations
for each row execute function public.reject_campaign_ledger_mutation();

create or replace function public.record_campaign_cycle_draw_commitment(
  p_campaign_id text,
  p_cycle_id integer,
  p_commit_hash text,
  p_committed_at timestamptz
) returns public.campaign_cycle_draw_commitments
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  cycle_row public.cycles;
  result public.campaign_cycle_draw_commitments;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_cycle_id not between 1 and 5
    or p_commit_hash is null or p_commit_hash !~ '^[0-9a-f]{64}$'
    or p_committed_at is null or p_committed_at > now() + interval '5 minutes'
  then raise exception 'invalid cycle draw commitment'; end if;

  select * into result
  from public.campaign_cycle_draw_commitments
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;
  if found then
    if result.commit_hash is distinct from p_commit_hash
      or result.committed_at is distinct from p_committed_at
    then raise exception 'cycle draw commitment already exists with different terms'; end if;
    return result;
  end if;

  select * into campaign_row from public.campaigns where id = p_campaign_id;
  if not found or campaign_row.state <> 'SCHEDULED' then
    raise exception 'cycle draw commitments require SCHEDULED campaign state';
  end if;

  select * into cycle_row
  from public.cycles
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id
  for update;
  if not found then raise exception 'campaign cycle not found'; end if;
  if p_committed_at >= cycle_row.opens_at then
    raise exception 'cycle draw commitment must be recorded before cycle opens';
  end if;

  insert into public.campaign_cycle_draw_commitments(
    campaign_id, cycle_id, protocol_version, commit_hash, committed_at
  ) values (
    p_campaign_id, p_cycle_id, 'bond-draw-v1', p_commit_hash, p_committed_at
  ) returning * into result;

  update public.cycles
  set commit_hash = p_commit_hash
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;

  return result;
end;
$$;

create or replace function public.record_campaign_cycle_draw_cutoff(
  p_campaign_id text,
  p_cycle_id integer,
  p_previous_slot bigint,
  p_previous_blockhash text,
  p_previous_block_time timestamptz,
  p_cutoff_slot bigint,
  p_cutoff_blockhash text,
  p_cutoff_block_time timestamptz,
  p_resolved_at timestamptz
) returns public.campaign_cycle_draw_cutoffs
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  cycle_row public.cycles;
  result public.campaign_cycle_draw_cutoffs;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_cycle_id not between 1 and 5
    or p_previous_slot is null or p_previous_slot <= 0
    or p_cutoff_slot is null or p_cutoff_slot <= p_previous_slot
    or p_previous_blockhash is null or char_length(btrim(p_previous_blockhash)) not between 32 and 88
    or p_cutoff_blockhash is null or char_length(btrim(p_cutoff_blockhash)) not between 32 and 88
    or p_previous_block_time is null or p_cutoff_block_time is null
    or p_resolved_at is null or p_resolved_at > now() + interval '5 minutes'
  then raise exception 'invalid cycle draw cutoff evidence'; end if;

  select * into result
  from public.campaign_cycle_draw_cutoffs
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;
  if found then
    if result.previous_slot is distinct from p_previous_slot
      or result.previous_blockhash is distinct from btrim(p_previous_blockhash)
      or result.previous_block_time is distinct from p_previous_block_time
      or result.cutoff_slot is distinct from p_cutoff_slot
      or result.cutoff_blockhash is distinct from btrim(p_cutoff_blockhash)
      or result.cutoff_block_time is distinct from p_cutoff_block_time
    then raise exception 'cycle draw cutoff already exists with different evidence'; end if;
    return result;
  end if;

  select * into campaign_row from public.campaigns where id = p_campaign_id;
  if not found or campaign_row.state not in ('ACTIVE','VERIFYING') then
    raise exception 'campaign is not accepting cycle cutoff evidence';
  end if;

  select * into cycle_row
  from public.cycles
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id
  for update;
  if not found then raise exception 'campaign cycle not found'; end if;

  if not exists (
    select 1 from public.campaign_cycle_draw_commitments
    where campaign_id = p_campaign_id and cycle_id = p_cycle_id
  ) then raise exception 'cycle draw commitment is missing'; end if;

  if not (p_previous_block_time < cycle_row.closes_at
    and p_cutoff_block_time >= cycle_row.closes_at
    and p_previous_block_time <= p_cutoff_block_time)
  then raise exception 'cutoff blocks do not bracket cycle close'; end if;

  insert into public.campaign_cycle_draw_cutoffs(
    campaign_id, cycle_id, previous_slot, previous_blockhash, previous_block_time,
    cutoff_slot, cutoff_blockhash, cutoff_block_time, resolver_version, resolved_at
  ) values (
    p_campaign_id, p_cycle_id, p_previous_slot, btrim(p_previous_blockhash), p_previous_block_time,
    p_cutoff_slot, btrim(p_cutoff_blockhash), p_cutoff_block_time,
    'first-finalized-block-at-or-after-v1', p_resolved_at
  ) returning * into result;

  update public.cycles
  set cutoff_slot = p_cutoff_slot,
      cutoff_blockhash = btrim(p_cutoff_blockhash)
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;

  return result;
end;
$$;

create or replace function public.record_campaign_cycle_draw_reveal(
  p_campaign_id text,
  p_cycle_id integer,
  p_reveal_value text,
  p_revealed_at timestamptz
) returns public.campaign_cycle_draw_reveals
language plpgsql
security invoker
set search_path = '' as $$
declare
  commitment public.campaign_cycle_draw_commitments;
  cutoff public.campaign_cycle_draw_cutoffs;
  result public.campaign_cycle_draw_reveals;
  expected_commit text;
  on_time_value boolean;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_cycle_id not between 1 and 5
    or p_reveal_value is null or p_reveal_value !~ '^[0-9a-f]{64}$'
    or p_revealed_at is null or p_revealed_at > now() + interval '5 minutes'
  then raise exception 'invalid cycle draw reveal'; end if;

  select * into result
  from public.campaign_cycle_draw_reveals
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;
  if found then
    if result.reveal_value is distinct from p_reveal_value
      or result.revealed_at is distinct from p_revealed_at
    then raise exception 'cycle draw reveal already exists with different terms'; end if;
    return result;
  end if;

  select * into commitment
  from public.campaign_cycle_draw_commitments
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;
  if not found then raise exception 'cycle draw commitment is missing'; end if;

  select * into cutoff
  from public.campaign_cycle_draw_cutoffs
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;
  if not found then raise exception 'cycle draw cutoff is missing'; end if;

  expected_commit := encode(extensions.digest(
    convert_to('bond-draw-commit-v1|' || p_campaign_id || '|' || p_cycle_id::text || '|' || p_reveal_value, 'UTF8'),
    'sha256'
  ), 'hex');
  if expected_commit <> commitment.commit_hash then
    raise exception 'cycle draw reveal does not match commitment';
  end if;

  on_time_value := p_revealed_at <= cutoff.cutoff_block_time + interval '30 minutes';

  insert into public.campaign_cycle_draw_reveals(
    campaign_id, cycle_id, reveal_value, revealed_at, on_time
  ) values (
    p_campaign_id, p_cycle_id, p_reveal_value, p_revealed_at, on_time_value
  ) returning * into result;

  update public.cycles
  set reveal_value = p_reveal_value
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;

  return result;
end;
$$;

create or replace function public.finalize_campaign_cycle_draw(
  p_campaign_id text,
  p_cycle_id integer
) returns public.campaign_cycle_draw_finalizations
language plpgsql
security invoker
set search_path = '' as $$
declare
  commitment public.campaign_cycle_draw_commitments;
  cutoff public.campaign_cycle_draw_cutoffs;
  reveal public.campaign_cycle_draw_reveals;
  result public.campaign_cycle_draw_finalizations;
  seed_value text;
  fallback_value boolean;
begin
  select * into result
  from public.campaign_cycle_draw_finalizations
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;
  if found then return result; end if;

  select * into commitment
  from public.campaign_cycle_draw_commitments
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;
  if not found then raise exception 'cycle draw commitment is missing'; end if;

  select * into cutoff
  from public.campaign_cycle_draw_cutoffs
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;
  if not found then raise exception 'cycle draw cutoff is missing'; end if;

  select * into reveal
  from public.campaign_cycle_draw_reveals
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;

  if not found and now() < cutoff.cutoff_block_time + interval '30 minutes' then
    raise exception 'cycle draw reveal window is still open';
  end if;

  fallback_value := not found or not reveal.on_time;

  seed_value := encode(extensions.digest(
    convert_to(
      'bond-draw-seed-v1|' || p_campaign_id || '|' || p_cycle_id::text || '|' ||
      commitment.commit_hash || '|' || cutoff.cutoff_slot::text || '|' || cutoff.cutoff_blockhash,
      'UTF8'
    ),
    'sha256'
  ), 'hex');

  insert into public.campaign_cycle_draw_finalizations(
    campaign_id, cycle_id, protocol_version, public_seed, fallback_used
  ) values (
    p_campaign_id, p_cycle_id, 'bond-draw-v1', seed_value, fallback_value
  ) returning * into result;

  update public.cycles
  set fallback_used = fallback_value
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;

  return result;
end;
$$;

create or replace function public.enforce_bond_draw_commitments_before_activation()
returns trigger
language plpgsql
security invoker
set search_path = '' as $$
declare
  commitment_count integer;
begin
  if old.id = 'bond-the-duck-2026'
    and old.state = 'SCHEDULED'
    and new.state = 'ACTIVE'
  then
    select count(*) into commitment_count
    from public.campaign_cycle_draw_commitments
    where campaign_id = old.id;
    if commitment_count <> 5 then
      raise exception 'Bond activation requires all five pre-open draw commitments';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists campaigns_bond_draw_commitments_before_activation
  on public.campaigns;
create trigger campaigns_bond_draw_commitments_before_activation
before update of state on public.campaigns
for each row execute function public.enforce_bond_draw_commitments_before_activation();

revoke all on function public.record_campaign_cycle_draw_commitment(text,integer,text,timestamptz)
  from public, anon, authenticated;
revoke all on function public.record_campaign_cycle_draw_cutoff(text,integer,bigint,text,timestamptz,bigint,text,timestamptz,timestamptz)
  from public, anon, authenticated;
revoke all on function public.record_campaign_cycle_draw_reveal(text,integer,text,timestamptz)
  from public, anon, authenticated;
revoke all on function public.finalize_campaign_cycle_draw(text,integer)
  from public, anon, authenticated;

grant execute on function public.record_campaign_cycle_draw_commitment(text,integer,text,timestamptz)
  to service_role;
grant execute on function public.record_campaign_cycle_draw_cutoff(text,integer,bigint,text,timestamptz,bigint,text,timestamptz,timestamptz)
  to service_role;
grant execute on function public.record_campaign_cycle_draw_reveal(text,integer,text,timestamptz)
  to service_role;
grant execute on function public.finalize_campaign_cycle_draw(text,integer)
  to service_role;
