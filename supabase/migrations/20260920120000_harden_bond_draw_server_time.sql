-- Harden Bond draw evidence so database server time is authoritative.
-- Direct inserts are revoked; every draw write must use the audited RPCs.

revoke insert on public.campaign_cycle_draw_commitments from service_role;
revoke insert on public.campaign_cycle_draw_cutoffs from service_role;
revoke insert on public.campaign_cycle_draw_reveals from service_role;
revoke insert on public.campaign_cycle_draw_finalizations from service_role;

grant select on public.campaign_cycle_draw_commitments to service_role;
grant select on public.campaign_cycle_draw_cutoffs to service_role;
grant select on public.campaign_cycle_draw_reveals to service_role;
grant select on public.campaign_cycle_draw_finalizations to service_role;

drop function if exists public.record_campaign_cycle_draw_commitment(text,integer,text,timestamptz);
drop function if exists public.record_campaign_cycle_draw_cutoff(text,integer,bigint,text,timestamptz,bigint,text,timestamptz,timestamptz);
drop function if exists public.record_campaign_cycle_draw_reveal(text,integer,text,timestamptz);

create function public.record_campaign_cycle_draw_commitment(
  p_campaign_id text,
  p_cycle_id integer,
  p_commit_hash text
) returns public.campaign_cycle_draw_commitments
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  cycle_row public.cycles;
  result public.campaign_cycle_draw_commitments;
  recorded_at timestamptz := clock_timestamp();
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_cycle_id not between 1 and 5
    or p_commit_hash is null or p_commit_hash !~ '^[0-9a-f]{64}$'
  then raise exception 'invalid cycle draw commitment'; end if;

  select * into result
  from public.campaign_cycle_draw_commitments
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;
  if found then
    if result.commit_hash is distinct from p_commit_hash then
      raise exception 'cycle draw commitment already exists with different terms';
    end if;
    return result;
  end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for share;
  if not found or campaign_row.state <> 'SCHEDULED' then
    raise exception 'cycle draw commitments require SCHEDULED campaign state';
  end if;

  select * into cycle_row
  from public.cycles
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id
  for update;
  if not found then raise exception 'campaign cycle not found'; end if;

  if recorded_at >= cycle_row.opens_at then
    raise exception 'cycle draw commitment must be recorded before cycle opens';
  end if;

  insert into public.campaign_cycle_draw_commitments(
    campaign_id, cycle_id, protocol_version, commit_hash, committed_at
  ) values (
    p_campaign_id, p_cycle_id, 'bond-draw-v1', p_commit_hash, recorded_at
  ) returning * into result;

  update public.cycles
  set commit_hash = p_commit_hash
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;

  return result;
end;
$$;

create function public.record_campaign_cycle_draw_cutoff(
  p_campaign_id text,
  p_cycle_id integer,
  p_previous_slot bigint,
  p_previous_blockhash text,
  p_previous_block_time timestamptz,
  p_cutoff_slot bigint,
  p_cutoff_blockhash text,
  p_cutoff_block_time timestamptz
) returns public.campaign_cycle_draw_cutoffs
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  cycle_row public.cycles;
  result public.campaign_cycle_draw_cutoffs;
  recorded_at timestamptz := clock_timestamp();
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_cycle_id not between 1 and 5
    or p_previous_slot is null or p_previous_slot <= 0
    or p_cutoff_slot is null or p_cutoff_slot <= p_previous_slot
    or p_previous_blockhash is null or char_length(btrim(p_previous_blockhash)) not between 32 and 88
    or p_cutoff_blockhash is null or char_length(btrim(p_cutoff_blockhash)) not between 32 and 88
    or p_previous_block_time is null or p_cutoff_block_time is null
    or p_previous_block_time > recorded_at + interval '5 minutes'
    or p_cutoff_block_time > recorded_at + interval '5 minutes'
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

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for share;
  if not found or campaign_row.state not in ('ACTIVE','VERIFYING') then
    raise exception 'campaign is not accepting cycle cutoff evidence';
  end if;

  select * into cycle_row
  from public.cycles
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id
  for update;
  if not found then raise exception 'campaign cycle not found'; end if;

  if recorded_at < cycle_row.closes_at then
    raise exception 'cycle cutoff cannot be recorded before cycle close';
  end if;

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
    'first-finalized-block-at-or-after-v1', recorded_at
  ) returning * into result;

  update public.cycles
  set cutoff_slot = p_cutoff_slot,
      cutoff_blockhash = btrim(p_cutoff_blockhash)
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;

  return result;
end;
$$;

create function public.record_campaign_cycle_draw_reveal(
  p_campaign_id text,
  p_cycle_id integer,
  p_reveal_value text
) returns public.campaign_cycle_draw_reveals
language plpgsql
security invoker
set search_path = '' as $$
declare
  commitment public.campaign_cycle_draw_commitments;
  cutoff public.campaign_cycle_draw_cutoffs;
  result public.campaign_cycle_draw_reveals;
  expected_commit text;
  recorded_at timestamptz := clock_timestamp();
  on_time_value boolean;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_cycle_id not between 1 and 5
    or p_reveal_value is null or p_reveal_value !~ '^[0-9a-f]{64}$'
  then raise exception 'invalid cycle draw reveal'; end if;

  select * into result
  from public.campaign_cycle_draw_reveals
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;
  if found then
    if result.reveal_value is distinct from p_reveal_value then
      raise exception 'cycle draw reveal already exists with different terms';
    end if;
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

  on_time_value := recorded_at <= cutoff.cutoff_block_time + interval '30 minutes';

  insert into public.campaign_cycle_draw_reveals(
    campaign_id, cycle_id, reveal_value, revealed_at, on_time
  ) values (
    p_campaign_id, p_cycle_id, p_reveal_value, recorded_at, on_time_value
  ) returning * into result;

  update public.cycles
  set reveal_value = p_reveal_value
  where campaign_id = p_campaign_id and cycle_id = p_cycle_id;

  return result;
end;
$$;

revoke all on function public.record_campaign_cycle_draw_commitment(text,integer,text)
  from public, anon, authenticated;
revoke all on function public.record_campaign_cycle_draw_cutoff(text,integer,bigint,text,timestamptz,bigint,text,timestamptz)
  from public, anon, authenticated;
revoke all on function public.record_campaign_cycle_draw_reveal(text,integer,text)
  from public, anon, authenticated;

grant execute on function public.record_campaign_cycle_draw_commitment(text,integer,text)
  to service_role;
grant execute on function public.record_campaign_cycle_draw_cutoff(text,integer,bigint,text,timestamptz,bigint,text,timestamptz)
  to service_role;
grant execute on function public.record_campaign_cycle_draw_reveal(text,integer,text)
  to service_role;
