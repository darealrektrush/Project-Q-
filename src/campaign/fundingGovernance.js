import { createHash } from 'node:crypto';

import { isEnabled } from '../lib/featureFlags.js';

const CAMPAIGN_ID = 'bond-the-duck-2026';

function latestDecisionMap(rows = []) {
  const latest = new Map();
  for (const row of rows) {
    const key = String(row.founder_user_id);
    if (!latest.has(key)) latest.set(key, row);
  }
  return latest;
}

export function fundingDecisionIdempotencyKey({
  proposalId,
  founderUserId,
  decision,
  callbackQueryId,
} = {}) {
  const values = [proposalId, founderUserId, decision, callbackQueryId]
    .map((value) => String(value ?? '').trim());
  if (!/^\d+$/.test(values[0]) || !/^\d+$/.test(values[1])
    || !['APPROVE','HOLD'].includes(values[2]) || !values[3]) {
    throw new Error('invalid funding decision identity');
  }
  return createHash('sha256').update(values.join(':')).digest('hex');
}

export async function getFundingGovernanceState(client, campaignId = CAMPAIGN_ID, {
  now = new Date(),
} = {}) {
  const [campaignRows, founderRows, proposalRows, finalizationRows] = await Promise.all([
    client.select('campaigns',
      `?id=eq.${encodeURIComponent(campaignId)}&select=id,state,funded_base_units&limit=1`),
    client.select('campaign_founders',
      `?campaign_id=eq.${encodeURIComponent(campaignId)}&enabled=eq.true&select=founder_user_id,founder_label&order=founder_label.asc`),
    client.select('campaign_funding_proposals',
      `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=id,vault_address,vault_base_units,squads_approval_threshold,squads_member_count,top_contributor_prize_lamports,evidence_hash,verified_at,created_at&order=created_at.desc,id.desc&limit=20`),
    client.select('campaign_funding_finalizations',
      `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=proposal_id,finalized_by,finalized_at&order=finalized_at.desc&limit=20`),
  ]);

  const campaign = campaignRows[0] ?? null;
  const proposal = proposalRows[0] ?? null;
  const proposalId = proposal?.id == null ? null : Number(proposal.id);
  const decisions = proposalId
    ? await client.select('campaign_funding_decisions',
      `?proposal_id=eq.${proposalId}&select=id,founder_user_id,decision,decided_at&order=decided_at.desc,id.desc&limit=100`)
    : [];
  const latest = latestDecisionMap(decisions);
  const founders = founderRows.map((row) => ({
    founderUserId: String(row.founder_user_id),
    label: String(row.founder_label || 'Configured founder'),
    decision: latest.get(String(row.founder_user_id))?.decision || 'PENDING',
  }));
  const approvalCount = founders.filter(({ decision }) => decision === 'APPROVE').length;
  const holdCount = founders.filter(({ decision }) => decision === 'HOLD').length;
  const finalized = proposalId
    ? finalizationRows.find((row) => Number(row.proposal_id) === proposalId) || null
    : null;
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  const verifiedMs = Date.parse(proposal?.verified_at || '');
  const stale = proposal
    ? !Number.isFinite(nowMs) || !Number.isFinite(verifiedMs) || nowMs - verifiedMs > 72 * 60 * 60 * 1000
    : false;

  return {
    campaignId,
    campaignState: campaign?.state ?? 'UNKNOWN',
    fundedBaseUnits: String(campaign?.funded_base_units ?? '0'),
    founders,
    proposal: proposal ? {
      id: proposalId,
      vaultAddress: proposal.vault_address,
      vaultBaseUnits: String(proposal.vault_base_units),
      approvalThreshold: Number(proposal.squads_approval_threshold),
      memberCount: Number(proposal.squads_member_count),
      topContributorPrizeLamports: String(proposal.top_contributor_prize_lamports),
      evidenceHash: proposal.evidence_hash,
      verifiedAt: proposal.verified_at,
      createdAt: proposal.created_at,
      stale,
    } : null,
    approvalCount,
    holdCount,
    finalized: Boolean(finalized),
    finalizedAt: finalized?.finalized_at ?? null,
    finalizable: Boolean(
      proposal
      && !stale
      && !finalized
      && campaign?.state === 'READINESS_BLOCKED'
      && founders.length === 2
      && approvalCount === 2
      && holdCount === 0
    ),
  };
}

export async function recordFundingDecision(client, {
  proposalId,
  founderUserId,
  decision,
  callbackQueryId,
  env = process.env,
} = {}) {
  if (!isEnabled(env.PROJECT_Q_FUNDING_GOVERNANCE_ENABLED)) {
    throw new Error('campaign funding governance disabled');
  }
  const idempotencyKey = fundingDecisionIdempotencyKey({
    proposalId, founderUserId, decision, callbackQueryId,
  });
  return client.rpc('record_campaign_funding_decision', {
    p_proposal_id: Number(proposalId),
    p_founder_user_id: Number(founderUserId),
    p_decision: decision,
    p_idempotency_key: idempotencyKey,
  });
}

export async function finalizeFunding(client, {
  proposalId,
  founderUserId,
  env = process.env,
} = {}) {
  if (!isEnabled(env.PROJECT_Q_FUNDING_GOVERNANCE_ENABLED)) {
    throw new Error('campaign funding governance disabled');
  }
  if (!Number.isSafeInteger(Number(proposalId)) || Number(proposalId) <= 0
    || !/^\d+$/.test(String(founderUserId || ''))) {
    throw new Error('invalid funding finalization identity');
  }
  return client.rpc('finalize_campaign_funding', {
    p_proposal_id: Number(proposalId),
    p_founder_user_id: Number(founderUserId),
  });
}

function shortHash(value) {
  const text = String(value || '');
  return /^[0-9a-f]{64}$/.test(text) ? `${text.slice(0, 8)}…${text.slice(-8)}` : 'unavailable';
}

function shortAddress(value) {
  const text = String(value || '');
  return text.length > 12 ? `${text.slice(0, 6)}…${text.slice(-6)}` : text || 'unavailable';
}

export function buildFundingGovernanceText(state) {
  const proposal = state?.proposal;
  const founderLines = state?.founders?.length
    ? state.founders.map(({ label, decision }) =>
      `${decision === 'APPROVE' ? '✅' : decision === 'HOLD' ? '⛔' : '🔒'} ${label}: ${decision}`)
    : ['🔒 No configured founders'];

  return [
    '💰 *BOND THE DUCK // FUNDING VERIFICATION*',
    '',
    `*Campaign state:* ${state?.campaignState || 'UNKNOWN'}`,
    `*Funding ledger:* ${state?.fundedBaseUnits || '0'} / 17500000000000 base units`,
    '',
    proposal ? `*Proposal #${proposal.id}*` : '*No funding proposal recorded*',
    ...(proposal ? [
      `Vault: ${shortAddress(proposal.vaultAddress)}`,
      `Vault amount: ${proposal.vaultBaseUnits} base units`,
      `Squads authority: ${proposal.approvalThreshold}-of-${proposal.memberCount}`,
      `Top contributor: ${proposal.topContributorPrizeLamports} lamports`,
      `Evidence: ${shortHash(proposal.evidenceHash)}`,
      `Verified: ${proposal.verifiedAt}`,
      `Freshness: ${proposal.stale ? 'STALE' : 'CURRENT'}`,
    ] : []),
    '',
    '*Founder decisions:*',
    ...founderLines,
    '',
    state?.finalized
      ? `✅ Funding ledger finalized at ${state.finalizedAt}`
      : state?.finalizable
        ? '✅ Two approvals recorded. Funding ledger can be finalized.'
        : '🔒 Funding ledger remains unchanged.',
    '',
    '_No token movement or treasury signing occurs from this screen._',
  ].join('\n');
}
