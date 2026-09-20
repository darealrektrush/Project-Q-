-- Atomic Bond the Duck Earn-to-Burn provisioning and immutable configuration terms.
-- This migration provisions nothing by itself. It creates one audited RPC that
-- can run only after the selected campaign rules are FINAL and hash-matched.

create or replace function public.guard_bond_burn_config_insert()
returns trigger
language plpgsql
security invoker
set search_path = '' as $$
begin
  if current_setting('project_q.burn_provisioning', true) is distinct from 'on' then
    raise exception 'Bond Earn-to-Burn configuration inserts must use the atomic provisioning RPC';
  end if;
  return new;
end;
$$;

drop trigger if exists bond_burn_program_insert_guard on public.earn_to_burn_programs;
create trigger bond_burn_program_insert_guard
before insert on public.earn_to_burn_programs
for each row
when (new.campaign_id = 'bond-the-duck-2026')
execute function public.guard_bond_burn_config_insert();

drop trigger if exists bond_burn_source_insert_guard on public.burn_source_accounts;
create trigger bond_burn_source_insert_guard
before insert on public.burn_source_accounts
for each row
when (new.program_id = 'fawkq-earn-to-burn')
execute function public.guard_bond_burn_config_insert();

drop trigger if exists bond_burn_founder_insert_guard on public.burn_program_founders;
create trigger bond_burn_founder_insert_guard
before insert on public.burn_program_founders
for each row
when (new.program_id = 'fawkq-earn-to-burn')
execute function public.guard_bond_burn_config_insert();

drop trigger if exists bond_burn_milestone_insert_guard on public.burn_milestones;
create trigger bond_burn_milestone_insert_guard
before insert on public.burn_milestones
for each row
when (new.program_id = 'fawkq-earn-to-burn')
execute function public.guard_bond_burn_config_insert();

create or replace function public.protect_bond_burn_config_terms()
returns trigger
language plpgsql
security invoker
set search_path = '' as $$
begin
  if tg_table_name = 'earn_to_burn_programs' then
    if old.campaign_id <> 'bond-the-duck-2026' then return coalesce(new, old); end if;
    if tg_op = 'DELETE' then raise exception 'Bond Earn-to-Burn program cannot be deleted'; end if;
    if row(
      new.id,new.campaign_id,new.mint,new.token_program_id,new.decimals,
      new.original_supply_base_units,new.hard_cap_base_units,
      new.max_single_burn_base_units,new.rules_hash
    ) is distinct from row(
      old.id,old.campaign_id,old.mint,old.token_program_id,old.decimals,
      old.original_supply_base_units,old.hard_cap_base_units,
      old.max_single_burn_base_units,old.rules_hash
    ) then raise exception 'Bond Earn-to-Burn program terms are immutable'; end if;
    return new;
  end if;

  if tg_table_name = 'burn_source_accounts' then
    if old.program_id <> 'fawkq-earn-to-burn' then return coalesce(new, old); end if;
    raise exception 'Bond Earn-to-Burn source account terms are immutable';
  end if;

  if tg_table_name = 'burn_program_founders' then
    if old.program_id <> 'fawkq-earn-to-burn' then return coalesce(new, old); end if;
    raise exception 'Bond Earn-to-Burn founders are immutable';
  end if;

  if tg_table_name = 'burn_milestones' then
    if old.program_id <> 'fawkq-earn-to-burn' then return coalesce(new, old); end if;
    if tg_op = 'DELETE' then raise exception 'Bond Earn-to-Burn milestones cannot be deleted'; end if;
    if row(
      new.id,new.program_id,new.sequence,new.label,new.progress_target_units,
      new.burn_amount_base_units,new.burn_type,new.rules_hash
    ) is distinct from row(
      old.id,old.program_id,old.sequence,old.label,old.progress_target_units,
      old.burn_amount_base_units,old.burn_type,old.rules_hash
    ) then raise exception 'Bond Earn-to-Burn milestone terms are immutable'; end if;
    return new;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists bond_burn_program_terms_guard on public.earn_to_burn_programs;
create trigger bond_burn_program_terms_guard
before update or delete on public.earn_to_burn_programs
for each row execute function public.protect_bond_burn_config_terms();

drop trigger if exists bond_burn_source_terms_guard on public.burn_source_accounts;
create trigger bond_burn_source_terms_guard
before update or delete on public.burn_source_accounts
for each row execute function public.protect_bond_burn_config_terms();

drop trigger if exists bond_burn_founder_terms_guard on public.burn_program_founders;
create trigger bond_burn_founder_terms_guard
before update or delete on public.burn_program_founders
for each row execute function public.protect_bond_burn_config_terms();

drop trigger if exists bond_burn_milestone_terms_guard on public.burn_milestones;
create trigger bond_burn_milestone_terms_guard
before update or delete on public.burn_milestones
for each row execute function public.protect_bond_burn_config_terms();

create or replace function public.provision_bond_earn_to_burn(
  p_campaign_id text,
  p_source_evidence_url text,
  p_source_verified_at timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = '' as $$
declare
  campaign_row public.campaigns;
  ruleset_row public.ruleset_versions;
  program_row public.earn_to_burn_programs;
  founder_count integer;
  source_count integer;
  milestone_count integer;
begin
  if p_campaign_id is distinct from 'bond-the-duck-2026'
    or p_source_evidence_url is null or p_source_evidence_url !~* '^https://'
    or p_source_verified_at is null
    or p_source_verified_at > now() + interval '5 minutes'
    or p_source_verified_at < now() - interval '72 hours'
  then raise exception 'invalid Bond Earn-to-Burn provisioning evidence'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_campaign_id || ':earn-to-burn-provisioning')
  );

  select * into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for update;
  if not found or campaign_row.state not in ('DRAFT','READINESS_BLOCKED') then
    raise exception 'campaign is not in a provisioning-safe state';
  end if;
  if campaign_row.ruleset_version is null
    or campaign_row.rules_hash is null
    or campaign_row.rules_hash !~ '^[0-9a-f]{64}$'
  then raise exception 'selected FINAL campaign rules are required'; end if;

  select * into ruleset_row
  from public.ruleset_versions
  where campaign_id = p_campaign_id
    and version = campaign_row.ruleset_version
    and rules_hash = campaign_row.rules_hash
  limit 1;
  if not found
    or ruleset_row.rules_json->>'status' <> 'FINAL'
    or not public.validate_bond_campaign_final_rules(
      ruleset_row.rules_json,p_campaign_id,campaign_row.ruleset_version
    )
  then raise exception 'selected campaign rules are not valid FINAL Bond rules'; end if;

  select count(*) into founder_count
  from public.campaign_founders
  where campaign_id = p_campaign_id and enabled;
  if founder_count <> 2 then
    raise exception 'exactly two enabled campaign founders are required';
  end if;

  select * into program_row
  from public.earn_to_burn_programs
  where campaign_id = p_campaign_id
  limit 1;

  if found then
    if program_row.id <> 'fawkq-earn-to-burn'
      or program_row.state <> 'ENABLED'
      or program_row.mint <> 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump'
      or program_row.token_program_id <> 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
      or program_row.decimals <> 6
      or program_row.original_supply_base_units <> 1000000000000000
      or program_row.hard_cap_base_units <> 15000000000000
      or program_row.max_single_burn_base_units <> 3000000000000
      or program_row.rules_hash <> campaign_row.rules_hash
    then raise exception 'existing Bond Earn-to-Burn program conflicts with locked rules'; end if;

    select count(*) into source_count
    from public.burn_source_accounts
    where program_id = program_row.id
      and token_account = '3BZHPnTFuzxxaMFHo2Gv54uNP7Uw53cyoEMptnjZoxfa'
      and source_type = 'CREATOR_WALLET_RESERVE'
      and approved;
    select count(*) into milestone_count
    from public.burn_milestones
    where program_id = program_row.id
      and rules_hash = campaign_row.rules_hash;
    if source_count <> 1
      or (select count(*) from public.burn_program_founders where program_id = program_row.id) <> 2
      or milestone_count <> 5
    then raise exception 'existing Bond Earn-to-Burn provisioning is incomplete'; end if;

    return jsonb_build_object(
      'programId',program_row.id,'rulesHash',campaign_row.rules_hash,
      'sourceCount',source_count,'founderCount',2,'milestoneCount',milestone_count,
      'replayed',true
    );
  end if;

  perform pg_catalog.set_config('project_q.burn_provisioning','on',true);

  insert into public.earn_to_burn_programs(
    id,campaign_id,state,mint,token_program_id,decimals,
    original_supply_base_units,observed_start_supply_base_units,
    hard_cap_base_units,max_single_burn_base_units,rules_hash
  ) values (
    'fawkq-earn-to-burn',p_campaign_id,'ENABLED',
    'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',6,
    1000000000000000,null,15000000000000,3000000000000,campaign_row.rules_hash
  );

  insert into public.burn_source_accounts(
    program_id,token_account,authority_label,source_type,approved,evidence_url,verified_at
  ) values (
    'fawkq-earn-to-burn',
    '3BZHPnTFuzxxaMFHo2Gv54uNP7Uw53cyoEMptnjZoxfa',
    'FAWKQ_CREATOR_WALLET',
    'CREATOR_WALLET_RESERVE',
    true,p_source_evidence_url,p_source_verified_at
  );

  insert into public.burn_program_founders(program_id,founder_user_id)
  select 'fawkq-earn-to-burn', founder_user_id
  from public.campaign_founders
  where campaign_id = p_campaign_id and enabled
  order by founder_user_id;

  insert into public.burn_milestones(
    id,program_id,sequence,label,progress_target_units,
    burn_amount_base_units,burn_type,state,rules_hash
  ) values
    ('bond-burn-1','fawkq-earn-to-burn',1,'Burn Milestone 1',2000,3000000000000,'RESERVE_BURN','LOCKED',campaign_row.rules_hash),
    ('bond-burn-2','fawkq-earn-to-burn',2,'Burn Milestone 2',5000,3000000000000,'RESERVE_BURN','LOCKED',campaign_row.rules_hash),
    ('bond-burn-3','fawkq-earn-to-burn',3,'Burn Milestone 3',9000,3000000000000,'RESERVE_BURN','LOCKED',campaign_row.rules_hash),
    ('bond-burn-4','fawkq-earn-to-burn',4,'Burn Milestone 4',14000,3000000000000,'RESERVE_BURN','LOCKED',campaign_row.rules_hash),
    ('bond-burn-5','fawkq-earn-to-burn',5,'Burn Milestone 5',20000,3000000000000,'RESERVE_BURN','LOCKED',campaign_row.rules_hash);

  return jsonb_build_object(
    'programId','fawkq-earn-to-burn','rulesHash',campaign_row.rules_hash,
    'sourceCount',1,'founderCount',2,'milestoneCount',5,'replayed',false
  );
end;
$$;

revoke all on function public.guard_bond_burn_config_insert()
  from public, anon, authenticated;
revoke all on function public.protect_bond_burn_config_terms()
  from public, anon, authenticated;
revoke all on function public.provision_bond_earn_to_burn(text,text,timestamptz)
  from public, anon, authenticated;

grant execute on function public.provision_bond_earn_to_burn(text,text,timestamptz)
  to service_role;

revoke delete, truncate, trigger on public.earn_to_burn_programs from service_role;
revoke delete, truncate, trigger on public.burn_source_accounts from service_role;
revoke delete, truncate, trigger on public.burn_program_founders from service_role;
revoke delete, truncate, trigger on public.burn_milestones from service_role;
