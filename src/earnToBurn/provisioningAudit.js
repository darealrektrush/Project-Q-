import { createHash } from 'node:crypto';

import {
  FAWKQ_CREATOR_TOKEN_ACCOUNT,
  FAWKQ_CREATOR_WALLET,
  FAWKQ_DECIMALS,
  FAWKQ_MINT,
  TOKEN_2022_PROGRAM_ID,
  assertFawkqCreatorSourceIdentity,
} from './identity.js';

const EXPECTED_PROGRAM_ID = 'fawkq-earn-to-burn';
const EXPECTED_HARD_CAP = '15000000000000';
const EXPECTED_MAX_SINGLE = '3000000000000';
const EXPECTED_MILESTONES = [
  { id:'bond-burn-1', sequence:1, target:'2000', amount:'3000000000000', type:'RESERVE_BURN' },
  { id:'bond-burn-2', sequence:2, target:'5000', amount:'3000000000000', type:'RESERVE_BURN' },
  { id:'bond-burn-3', sequence:3, target:'9000', amount:'3000000000000', type:'RESERVE_BURN' },
  { id:'bond-burn-4', sequence:4, target:'14000', amount:'3000000000000', type:'RESERVE_BURN' },
  { id:'bond-burn-5', sequence:5, target:'20000', amount:'3000000000000', type:'RESERVE_BURN' },
];

export function auditBondBurnProvisioning({
  campaign = null,
  ruleset = null,
  program = null,
  sourceAccounts = [],
  founders = [],
  milestones = [],
} = {}) {
  const blockers = [];
  const rulesHash = String(campaign?.rules_hash || '');
  const rulesFinal = Boolean(
    ruleset
    && ruleset.rules_json?.status === 'FINAL'
    && /^[0-9a-f]{64}$/.test(rulesHash)
    && ruleset.rules_hash === rulesHash
    && Number(ruleset.version) === Number(campaign?.ruleset_version)
  );
  if (!rulesFinal) blockers.push('final campaign rules hash is not selected');

  try {
    assertFawkqCreatorSourceIdentity();
  } catch {
    blockers.push('configured creator wallet/token-account identity is invalid');
  }

  if (!program) {
    blockers.push('Earn-to-Burn program is not provisioned');
  } else {
    if (program.id !== EXPECTED_PROGRAM_ID) blockers.push('program id mismatch');
    if (program.campaign_id !== 'bond-the-duck-2026') blockers.push('program campaign mismatch');
    if (program.state !== 'ENABLED') blockers.push('program is not enabled');
    if (program.mint !== FAWKQ_MINT) blockers.push('program mint mismatch');
    if (program.token_program_id !== TOKEN_2022_PROGRAM_ID) blockers.push('program token program mismatch');
    if (Number(program.decimals) !== FAWKQ_DECIMALS) blockers.push('program decimals mismatch');
    if (String(program.hard_cap_base_units) !== EXPECTED_HARD_CAP) blockers.push('program hard cap must be 15M FAWKQ');
    if (String(program.max_single_burn_base_units) !== EXPECTED_MAX_SINGLE) blockers.push('single burn maximum must be 3M FAWKQ');
    if (rulesFinal && program.rules_hash !== rulesHash) blockers.push('program rules hash does not match final campaign rules');
  }

  const approvedCreatorSources = sourceAccounts.filter((row) =>
    row.source_type === 'CREATOR_WALLET_RESERVE'
    && row.approved === true
    && row.token_account === FAWKQ_CREATOR_TOKEN_ACCOUNT
    && Boolean(row.evidence_url)
    && Boolean(row.verified_at)
  );
  if (approvedCreatorSources.length !== 1) {
    blockers.push('exactly one evidenced creator-wallet reserve source must be approved');
  }

  const founderIds = [...new Set(founders.map((row) => String(row.founder_user_id)))].sort();
  if (founderIds.length !== 2 || founderIds.some((id) => !/^\d+$/.test(id))) {
    blockers.push('exactly two burn founders must be configured');
  }

  const normalizedMilestones = milestones
    .map((row) => ({
      id:String(row.id),
      sequence:Number(row.sequence),
      target:String(row.progress_target_units),
      amount:String(row.burn_amount_base_units),
      type:String(row.burn_type),
      rulesHash:String(row.rules_hash || ''),
      state:String(row.state || ''),
    }))
    .sort((a,b)=>a.sequence-b.sequence);

  if (normalizedMilestones.length !== 5) {
    blockers.push('exactly five burn milestones are required');
  } else {
    for (let i=0;i<EXPECTED_MILESTONES.length;i++) {
      const actual=normalizedMilestones[i];
      const expected=EXPECTED_MILESTONES[i];
      if (
        actual.id !== expected.id
        || actual.sequence !== expected.sequence
        || actual.target !== expected.target
        || actual.amount !== expected.amount
        || actual.type !== expected.type
        || actual.state !== 'LOCKED'
        || (rulesFinal && actual.rulesHash !== rulesHash)
      ) {
        blockers.push(`burn milestone ${expected.sequence} does not match the locked plan`);
      }
    }
  }

  const report = {
    campaignId:'bond-the-duck-2026',
    rulesHash:rulesFinal ? rulesHash : null,
    programId:program?.id || EXPECTED_PROGRAM_ID,
    creatorWallet:FAWKQ_CREATOR_WALLET,
    creatorTokenAccount:FAWKQ_CREATOR_TOKEN_ACCOUNT,
    founderCount:founderIds.length,
    milestoneCount:normalizedMilestones.length,
    hardCapBaseUnits:program ? String(program.hard_cap_base_units) : EXPECTED_HARD_CAP,
    maxSingleBurnBaseUnits:program ? String(program.max_single_burn_base_units) : EXPECTED_MAX_SINGLE,
    ready:blockers.length===0,
    blockers,
    mutationsPerformed:false,
  };
  return {
    ...report,
    reportHash:createHash('sha256').update(JSON.stringify(report)).digest('hex'),
  };
}
