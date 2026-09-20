-- Atomically record the exact five Bond draw commitments.
-- Uses the hardened server-time single-commitment RPC for each cycle inside
-- one PostgreSQL transaction. Any mismatch rolls back the entire packet.

create or replace function public.record_campaign_cycle_draw_commitment_packet(
  p_campaign_id text,
  p_commitments jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  item jsonb;
  cycle_id_value integer;
  commit_hash_value text;
  seen_cycles integer[] := array[]::integer[];
  result_rows jsonb;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_commitments is null
    or jsonb_typeof(p_commitments) is distinct from 'array'
    or jsonb_array_length(p_commitments) <> 5
  then
    raise exception 'invalid Bond draw commitment packet';
  end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for share;

  if not found or campaign_row.state <> 'SCHEDULED' then
    raise exception 'Bond draw commitment packet requires SCHEDULED campaign state';
  end if;

  for item in select value from jsonb_array_elements(p_commitments)
  loop
    cycle_id_value := nullif(item->>'cycleId','')::integer;
    commit_hash_value := btrim(item->>'commitHash');

    if cycle_id_value is null or cycle_id_value not between 1 and 5
      or commit_hash_value is null or commit_hash_value !~ '^[0-9a-f]{64}$'
      or cycle_id_value = any(seen_cycles)
    then
      raise exception 'invalid or duplicate Bond draw commitment entry';
    end if;

    seen_cycles := array_append(seen_cycles, cycle_id_value);
  end loop;

  if (select array_agg(value order by value) from unnest(seen_cycles) value)
     is distinct from array[1,2,3,4,5]::integer[]
  then
    raise exception 'Bond draw commitment packet must contain cycles 1 through 5 exactly once';
  end if;

  for item in
    select value
    from jsonb_array_elements(p_commitments)
    order by (value->>'cycleId')::integer
  loop
    perform public.record_campaign_cycle_draw_commitment(
      p_campaign_id,
      (item->>'cycleId')::integer,
      btrim(item->>'commitHash')
    );
  end loop;

  select jsonb_agg(
    jsonb_build_object(
      'cycleId', cycle_id,
      'commitHash', commit_hash,
      'protocolVersion', protocol_version,
      'committedAt', committed_at
    )
    order by cycle_id
  )
  into result_rows
  from public.campaign_cycle_draw_commitments
  where campaign_id = p_campaign_id;

  if jsonb_array_length(coalesce(result_rows, '[]'::jsonb)) <> 5 then
    raise exception 'Bond draw commitment packet did not reconcile to five rows';
  end if;

  return jsonb_build_object(
    'campaignId', p_campaign_id,
    'commitmentCount', 5,
    'commitments', result_rows
  );
end;
$$;

revoke all on function public.record_campaign_cycle_draw_commitment_packet(text,jsonb)
  from public, anon, authenticated;
grant execute on function public.record_campaign_cycle_draw_commitment_packet(text,jsonb)
  to service_role;
