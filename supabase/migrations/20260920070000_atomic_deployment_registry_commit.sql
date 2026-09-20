-- Atomic deployment registry commit for Bond the Duck.
-- Commits one complete, evidence-backed registry version or nothing.
-- Does not schedule, activate, fund, or move assets.

create or replace function public.commit_campaign_deployment_registry(
  p_campaign_id text,
  p_version integer,
  p_entries jsonb,
  p_registry_hash text
) returns jsonb
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  required_fields constant text[] := array[
    'registry_version_hash','campaign_id_rules_hash','campaign_window',
    'fawkq_mint_decimals','squads_multisig','squads_community_vault',
    'squads_authority_policy','top_contributor_prize_funding',
    'offline_recovery_public_key','pump_fun_market','pump_swap_pool_migration',
    'approved_secondary_markets','pyth_sol_usd_feed','switchboard_sol_usd_feed',
    'jupiter_routing_rules','rpc_indexer_webhook','project_q_bot_identity',
    'oracle_bot_identity','supabase_schema_version','announcement_channel',
    'dashboard_url','reviewer_operator_accounts','website_source_certifications',
    'dexscreener_url','geckoterminal_url','telegram_bot_certifications',
    'winner_position_percentages','buy_to_earn_wallet_cap','buy_to_earn_schedule',
    'draw_reveal_fallback','payment_retry_intervals','priority_fee_ceiling',
    'legal_review','readiness_report'
  ];
  supplied_fields text[];
  existing_count integer;
  existing_hashes text[];
  entry jsonb;
  v_field text;
  v_value text;
  v_owner text;
  v_evidence_url text;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
    or p_version is null or p_version <= 0
    or p_registry_hash is null or p_registry_hash !~ '^[0-9a-f]{64}$'
    or p_entries is null or jsonb_typeof(p_entries) <> 'array'
    or jsonb_array_length(p_entries) <> array_length(required_fields, 1)
  then
    raise exception 'invalid deployment registry commit envelope';
  end if;

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'unknown campaign';
  end if;

  if campaign_row.state not in ('DRAFT','READINESS_BLOCKED','FUNDED') then
    raise exception 'campaign state does not permit registry commit';
  end if;

  if campaign_row.registry_version is not null
    and campaign_row.registry_version > p_version
  then
    raise exception 'cannot replace registry with an older version';
  end if;

  select array_agg(field order by field)
  into supplied_fields
  from (
    select btrim(value->>'field') as field
    from jsonb_array_elements(p_entries) value
  ) fields;

  if supplied_fields is distinct from (
    select array_agg(field order by field) from unnest(required_fields) field
  ) then
    raise exception 'deployment registry field set is incomplete or invalid';
  end if;

  if exists (
    select 1
    from (
      select btrim(value->>'field') field, count(*) count
      from jsonb_array_elements(p_entries) value
      group by btrim(value->>'field')
    ) duplicates
    where count <> 1
  ) then
    raise exception 'deployment registry contains duplicate fields';
  end if;

  select count(*), array_agg(distinct registry_hash)
  into existing_count, existing_hashes
  from public.deployment_registry
  where campaign_id = p_campaign_id and version = p_version;

  if existing_count > 0 then
    if existing_count <> array_length(required_fields, 1)
      or coalesce(array_length(existing_hashes, 1), 0) <> 1
      or existing_hashes[1] <> p_registry_hash
    then
      raise exception 'conflicting deployment registry version already exists';
    end if;

    if campaign_row.registry_version is distinct from p_version then
      update public.campaigns
      set registry_version = p_version,
          updated_at = now()
      where id = p_campaign_id;
    end if;

    return jsonb_build_object(
      'campaignId', p_campaign_id,
      'version', p_version,
      'registryHash', p_registry_hash,
      'fieldCount', existing_count,
      'replayed', true
    );
  end if;

  for entry in select value from jsonb_array_elements(p_entries)
  loop
    v_field := btrim(entry->>'field');
    v_value := btrim(entry->>'value');
    v_owner := btrim(entry->>'owner');
    v_evidence_url := btrim(entry->>'evidence_url');

    if v_value is null or v_value = ''
      or v_owner is null or v_owner = ''
      or v_evidence_url is null or v_evidence_url = ''
      or v_evidence_url !~* '^https://'
      or char_length(v_value) > 4096
      or char_length(v_owner) > 160
      or char_length(v_evidence_url) > 2048
    then
      raise exception 'deployment registry entry is incomplete: %', v_field;
    end if;

    if v_field ~* '(secret|private|seed|mnemonic|service[_ -]?role|api[_ -]?key|token)'
      or v_value ~* '(seed phrase|mnemonic|private key|service[_ -]?role|api[_ -]?key)'
    then
      raise exception 'secret-like deployment registry content rejected: %', v_field;
    end if;

    insert into public.deployment_registry (
      campaign_id, version, field, value, owner, evidence_url, registry_hash
    ) values (
      p_campaign_id, p_version, v_field, v_value, v_owner, v_evidence_url, p_registry_hash
    );
  end loop;

  update public.campaigns
  set registry_version = p_version,
      updated_at = now()
  where id = p_campaign_id;

  return jsonb_build_object(
    'campaignId', p_campaign_id,
    'version', p_version,
    'registryHash', p_registry_hash,
    'fieldCount', array_length(required_fields, 1),
    'replayed', false
  );
end;
$$;

revoke all on function public.commit_campaign_deployment_registry(text,integer,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.commit_campaign_deployment_registry(text,integer,jsonb,text)
  to service_role;
