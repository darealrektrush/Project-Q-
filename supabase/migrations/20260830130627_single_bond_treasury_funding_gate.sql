begin;

-- The Bond Squads vault begins with the complete 15M FAWKQ campaign pool.
-- After Streamflow unlock, both founders add 1.25M FAWKQ to the same vault
-- for Diamond Duck, producing the second recognized balance of 17.5M FAWKQ.
create or replace function public.transition_campaign_state(
  p_campaign_id text, p_expected_state text, p_next_state text,
  p_evidence jsonb, p_authorized_signers integer default 0,
  p_automatic_security_pause boolean default false
) returns public.campaigns language plpgsql security invoker set search_path = public as $$
declare result public.campaigns;
begin
  if p_evidence is null or p_evidence = '{}'::jsonb then raise exception 'exit evidence required'; end if;
  if p_expected_state = 'DRAFT' and p_next_state = 'READINESS_BLOCKED'
     and not (p_evidence ?& array['rulesHash','rulesetVersion']) then
    raise exception 'rules hash and ruleset version evidence required';
  end if;
  if p_expected_state = 'READINESS_BLOCKED' and p_next_state = 'FUNDED' then
    if not (p_evidence ?& array['fundedBaseUnits','expectedFundedBaseUnits','treasuryVaultBaseUnits',
      'treasuryVaultAddress','vaultVerifiedAt']) then
      raise exception 'complete funding evidence required';
    end if;
    if (p_evidence->>'fundedBaseUnits')::numeric <> 15000000000000
       or (p_evidence->>'expectedFundedBaseUnits')::numeric <> 15000000000000
       or (p_evidence->>'treasuryVaultBaseUnits')::numeric not in (15000000000000, 17500000000000)
       or nullif(btrim(p_evidence->>'treasuryVaultAddress'), '') is null
       or nullif(btrim(p_evidence->>'vaultVerifiedAt'), '') is null then
      raise exception 'funding evidence does not reconcile';
    end if;
  end if;
  if p_expected_state = 'FUNDED' and p_next_state = 'SCHEDULED'
     and not (p_evidence ?& array['registryHash','sourcesCertifiedAt','publicTimesPublishedAt']) then
    raise exception 'registry, source certification and public schedule evidence required';
  end if;
  if p_expected_state = 'SCHEDULED' and p_next_state = 'ACTIVE'
     and (not (p_evidence ?& array['readinessReportVersion','readinessReportHash','founderApprovals'])
       or (p_evidence->>'founderApprovals')::integer <> 2) then
    raise exception 'versioned readiness report and two founder approvals required';
  end if;
  if p_expected_state = 'ACTIVE' and p_next_state = 'VERIFYING'
     and not (p_evidence ?& array['campaignClosedAt','cutoffSlot']) then
    raise exception 'campaign close and cutoff evidence required';
  end if;
  if p_expected_state = 'VERIFYING' and p_next_state = 'ALLOCATIONS_FROZEN'
     and not (p_evidence ?& array['manifestHash','appealsClosedAt','verificationCompleteAt']) then
    raise exception 'manifest, appeals and verification evidence required';
  end if;
  if p_expected_state = 'ALLOCATIONS_FROZEN' and p_next_state = 'DISTRIBUTING'
     and (not (p_evidence ?& array['proposalRef','founderApprovals'])
       or (p_evidence->>'founderApprovals')::integer <> 2) then
    raise exception 'proposal and two founder approvals required';
  end if;
  if p_expected_state = 'DISTRIBUTING' and p_next_state = 'COMPLETED'
     and not (p_evidence ? 'reconciliationHash') then
    raise exception 'reconciliation evidence required';
  end if;
  if p_next_state = 'ARCHIVED'
     and (not (p_evidence ?& array['closeoutHash','founderApprovals'])
       or (p_evidence->>'founderApprovals')::integer <> 2) then
    raise exception 'closeout and two founder approvals required';
  end if;
  if not (
    (p_expected_state = 'DRAFT' and p_next_state = 'READINESS_BLOCKED') or
    (p_expected_state = 'READINESS_BLOCKED' and p_next_state = 'FUNDED') or
    (p_expected_state = 'FUNDED' and p_next_state = 'SCHEDULED') or
    (p_expected_state = 'SCHEDULED' and p_next_state = 'ACTIVE') or
    (p_expected_state = 'ACTIVE' and p_next_state = 'VERIFYING') or
    (p_expected_state = 'VERIFYING' and p_next_state = 'ALLOCATIONS_FROZEN') or
    (p_expected_state = 'ALLOCATIONS_FROZEN' and p_next_state = 'DISTRIBUTING') or
    (p_expected_state = 'DISTRIBUTING' and p_next_state = 'COMPLETED') or
    (p_expected_state = 'COMPLETED' and p_next_state = 'ARCHIVED') or
    (p_expected_state = 'TERMINATED' and p_next_state = 'ARCHIVED') or
    (p_next_state = 'PAUSED' and p_expected_state in
      ('READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING','ALLOCATIONS_FROZEN','DISTRIBUTING')) or
    (p_next_state = 'TERMINATED' and p_expected_state in
      ('READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING','ALLOCATIONS_FROZEN','DISTRIBUTING','PAUSED')) or
    (p_expected_state = 'PAUSED' and p_next_state in
      ('READINESS_BLOCKED','FUNDED','SCHEDULED','ACTIVE','VERIFYING','ALLOCATIONS_FROZEN','DISTRIBUTING'))
  ) then raise exception 'invalid campaign state transition: % -> %', p_expected_state, p_next_state;
  end if;
  if p_next_state in ('PAUSED','TERMINATED')
     and not (p_next_state = 'PAUSED' and p_automatic_security_pause)
     and p_authorized_signers <> 2 then
    raise exception '% requires two authorized signers', p_next_state;
  end if;
  if p_expected_state = 'PAUSED' and p_next_state <> 'TERMINATED'
     and p_authorized_signers <> 2 then
    raise exception 'resuming requires two founder approvals';
  end if;
  update public.campaigns
    set state = p_next_state,
        resume_state = case
          when p_next_state = 'PAUSED' then p_expected_state
          when p_expected_state = 'PAUSED' then null
          else resume_state
        end,
        updated_at = now()
    where id = p_campaign_id
      and state = p_expected_state
      and (p_expected_state <> 'PAUSED' or p_next_state = 'TERMINATED' or resume_state = p_next_state)
    returning * into result;
  if not found then raise exception 'campaign state changed or campaign missing'; end if;
  insert into public.campaign_state_transitions
    (campaign_id, from_state, to_state, evidence, authorized_signers, automatic_security_pause)
  values (p_campaign_id, p_expected_state, p_next_state, p_evidence,
          p_authorized_signers, p_automatic_security_pause);
  return result;
end;
$$;

revoke all on function public.transition_campaign_state(text,text,text,jsonb,integer,boolean)
  from public, anon, authenticated;
grant execute on function public.transition_campaign_state(text,text,text,jsonb,integer,boolean)
  to service_role;

commit;
