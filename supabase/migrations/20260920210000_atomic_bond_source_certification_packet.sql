-- Atomic Bond source certification packet.
-- Commits all 14 current source certifications in one transaction or none.

create or replace function public.record_bond_source_certification_packet(
  p_campaign_id text,
  p_founder_user_id bigint,
  p_packets jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = '' as $$
declare
  packet jsonb;
  expected_keys text[];
  supplied_keys text[];
  inserted_count integer := 0;
begin
  if p_campaign_id is distinct from 'bond-the-duck-2026'
    or p_founder_user_id is null or p_founder_user_id <= 0
    or p_packets is null or jsonb_typeof(p_packets) <> 'array'
    or jsonb_array_length(p_packets) <> 14
  then raise exception 'invalid Bond source certification packet'; end if;

  if not exists (
    select 1 from public.campaigns
    where id = p_campaign_id
      and state in ('DRAFT','READINESS_BLOCKED','FUNDED','SCHEDULED')
  ) then raise exception 'campaign is not accepting launch source certifications'; end if;

  if not exists (
    select 1 from public.campaign_founders
    where campaign_id = p_campaign_id
      and founder_user_id = p_founder_user_id
      and enabled
  ) then raise exception 'founder is not authorized for this campaign'; end if;

  select array_agg(source_key order by source_key)
  into expected_keys
  from public.verification_sources
  where campaign_id = p_campaign_id;

  select array_agg(source_key order by source_key)
  into supplied_keys
  from (
    select btrim(value->>'sourceKey') source_key
    from jsonb_array_elements(p_packets) value
  ) q;

  if array_length(expected_keys,1) <> 14
    or supplied_keys is distinct from expected_keys
  then raise exception 'source certification packet does not match the exact 14-source registry'; end if;

  if exists (
    select 1
    from (
      select btrim(value->>'sourceKey') source_key, count(*) count
      from jsonb_array_elements(p_packets) value
      group by btrim(value->>'sourceKey')
    ) d
    where count <> 1
  ) then raise exception 'source certification packet contains duplicate source keys'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_campaign_id || ':source-certification-packet')
  );

  for packet in select value from jsonb_array_elements(p_packets)
  loop
    perform public.record_verification_source_certification(
      p_campaign_id,
      btrim(packet->>'sourceKey'),
      packet->>'sourceKind',
      packet->>'classification',
      packet->>'health',
      packet->>'evidenceUrl',
      packet->>'evidenceHash',
      (packet->>'checkedAt')::timestamptz,
      (packet->>'expiresAt')::timestamptz,
      p_founder_user_id,
      packet->>'idempotencyKey'
    );
    inserted_count := inserted_count + 1;
  end loop;

  return jsonb_build_object(
    'campaignId',p_campaign_id,
    'founderUserId',p_founder_user_id,
    'certificationCount',inserted_count,
    'complete',inserted_count=14
  );
end;
$$;

revoke all on function public.record_bond_source_certification_packet(text,bigint,jsonb)
  from public, anon, authenticated;
grant execute on function public.record_bond_source_certification_packet(text,bigint,jsonb)
  to service_role;
