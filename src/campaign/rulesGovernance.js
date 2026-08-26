import { createHash } from 'node:crypto';

import { campaignRulesGovernanceEnabled } from '../lib/featureFlags.js';
import { inspectBondCampaignRules } from './rules.js';

const DECISIONS = new Set(['APPROVE', 'HOLD']);
const HASH = /^[0-9a-f]{64}$/;

function positiveInteger(value, label) {
  const normalized = String(value || '');
  if (!/^[1-9]\d*$/.test(normalized)) throw new Error(`${label} must be a positive integer`);
  return normalized;
}

function firstRow(result) {
  return Array.isArray(result) ? result[0] ?? null : result;
}

export function rulesGovernanceIdempotencyKey({ action, callbackQueryId, campaignId, founderUserId }) {
  const values = [action, callbackQueryId, campaignId, founderUserId].map((value) => String(value || '').trim());
  if (values.some((value) => !value) || !/^\d+$/.test(values[3])) {
    throw new Error('invalid rules governance identity');
  }
  return createHash('sha256').update(values.join(':')).digest('hex');
}

export async function getCampaignRulesGovernanceState(client, campaignId = 'bond-the-duck-2026') {
  const id = String(campaignId || '').trim();
  if (!id) throw new Error('campaign id is required');
  const [campaignRows, founders, proposals, finalizations] = await Promise.all([
    client.select('campaigns', `?id=eq.${encodeURIComponent(id)}&select=id,state,ruleset_version,rules_hash&limit=1`),
    client.select('campaign_founders', `?campaign_id=eq.${encodeURIComponent(id)}&enabled=eq.true&select=founder_user_id,founder_label&order=founder_label.asc`),
    client.select('campaign_ruleset_proposals', `?campaign_id=eq.${encodeURIComponent(id)}&select=id,version,rules_json,rules_hash,proposed_by,created_at&order=created_at.desc,id.desc&limit=20`),
    client.select('campaign_ruleset_finalizations', `?campaign_id=eq.${encodeURIComponent(id)}&select=id,proposal_id,version,rules_hash,finalized_by,finalized_at&order=finalized_at.desc,id.desc&limit=20`),
  ]);
  const proposalIds = proposals.map(({ id: proposalId }) => positiveInteger(proposalId, 'proposal id'));
  const decisions = proposalIds.length ? await client.select(
    'campaign_ruleset_decisions',
    `?proposal_id=in.(${proposalIds.join(',')})&select=id,proposal_id,founder_user_id,decision,decided_at&order=decided_at.desc,id.desc&limit=200`
  ) : [];

  const enriched = proposals.map((proposal) => {
    const latest = new Map();
    for (const decision of decisions) {
      if (String(decision.proposal_id) !== String(proposal.id)) continue;
      const founderId = String(decision.founder_user_id);
      if (!latest.has(founderId)) latest.set(founderId, decision);
    }
    const founderDecisions = founders.map((founder) => ({
      founderUserId: String(founder.founder_user_id),
      label: String(founder.founder_label || 'Configured founder'),
      decision: latest.get(String(founder.founder_user_id))?.decision || 'PENDING',
    }));
    const approvalCount = founderDecisions.filter(({ decision }) => decision === 'APPROVE').length;
    const finalization = finalizations.find(({ proposal_id: proposalId }) => String(proposalId) === String(proposal.id)) ?? null;
    const inspection = inspectBondCampaignRules(proposal.rules_json);
    return {
      ...proposal,
      founderDecisions,
      approvalCount,
      semanticRulesValid: inspection.valid && inspection.rulesHash === proposal.rules_hash,
      finalized: Boolean(finalization),
      finalization,
      finalizable: !finalization && founders.length === 2 && approvalCount === 2
        && inspection.valid && inspection.rulesHash === proposal.rules_hash,
    };
  });

  return {
    campaign: campaignRows[0] ?? null,
    founders: founders.map((founder) => ({
      founderUserId: String(founder.founder_user_id),
      label: String(founder.founder_label || 'Configured founder'),
    })),
    proposals: enriched,
    latestProposal: enriched[0] ?? null,
    finalizations,
  };
}

export async function submitFinalRulesProposal(client, {
  campaignId,
  founderUserId,
  version,
  rules,
  idempotencyKey,
  env = process.env,
} = {}) {
  if (!campaignRulesGovernanceEnabled(env)) throw new Error('campaign rules governance disabled');
  const inspection = inspectBondCampaignRules(rules);
  const normalizedVersion = Number(version);
  if (!inspection.valid || String(campaignId || '') !== rules.campaignId
    || rules.rulesetVersion !== normalizedVersion
    || !HASH.test(String(idempotencyKey || ''))) {
    throw new Error(`invalid final campaign rules: ${inspection.blockers.join('; ')}`);
  }
  return firstRow(await client.rpc('submit_campaign_ruleset_proposal', {
    p_campaign_id: String(campaignId),
    p_founder_user_id: positiveInteger(founderUserId, 'founder id'),
    p_version: normalizedVersion,
    p_rules_json: rules,
    p_rules_hash: inspection.rulesHash,
    p_idempotency_key: String(idempotencyKey),
  }));
}

export async function recordFinalRulesDecision(client, {
  proposalId,
  founderUserId,
  decision,
  idempotencyKey,
  env = process.env,
} = {}) {
  if (!campaignRulesGovernanceEnabled(env)) throw new Error('campaign rules governance disabled');
  const normalizedDecision = String(decision || '').toUpperCase();
  if (!DECISIONS.has(normalizedDecision) || !HASH.test(String(idempotencyKey || ''))) {
    throw new Error('invalid final rules decision');
  }
  return firstRow(await client.rpc('record_campaign_ruleset_decision', {
    p_proposal_id: positiveInteger(proposalId, 'proposal id'),
    p_founder_user_id: positiveInteger(founderUserId, 'founder id'),
    p_decision: normalizedDecision,
    p_idempotency_key: String(idempotencyKey),
  }));
}

export async function finalizeApprovedRules(client, {
  proposalId,
  founderUserId,
  env = process.env,
} = {}) {
  if (!campaignRulesGovernanceEnabled(env)) throw new Error('campaign rules governance disabled');
  return firstRow(await client.rpc('finalize_campaign_ruleset_proposal', {
    p_proposal_id: positiveInteger(proposalId, 'proposal id'),
    p_founder_user_id: positiveInteger(founderUserId, 'founder id'),
  }));
}

export function buildRulesGovernanceText(state) {
  if (!state.campaign) {
    return '📜 *BOND THE DUCK // FINAL RULES*\n\nCampaign draft is not provisioned. No rules action is available.';
  }
  const proposal = state.latestProposal;
  if (!proposal) {
    return [
      '📜 *BOND THE DUCK // FINAL RULES*',
      '',
      `*Campaign state:* ${state.campaign.state}`,
      `*Current rules:* v${state.campaign.ruleset_version}`,
      '*Proposal:* None',
      '',
      'The reviewed draft remains launch-blocked. A complete final-rules proposal must be prepared before founder review.',
    ].join('\n');
  }
  const decisions = proposal.founderDecisions.map(({ label, decision }) =>
    `${decision === 'APPROVE' ? '✅' : decision === 'HOLD' ? '⛔' : '🔒'} ${label}: ${decision}`
  ).join('\n');
  return [
    '📜 *BOND THE DUCK // FINAL RULES*',
    '',
    `*Campaign state:* ${state.campaign.state}`,
    `*Candidate version:* v${proposal.version}`,
    `*Exact hash:* \`${proposal.rules_hash}\``,
    `*Semantic validation:* ${proposal.semanticRulesValid ? 'PASS' : 'BLOCKED'}`,
    `*Founder approvals:* ${proposal.approvalCount}/2`,
    `*Finalized:* ${proposal.finalized ? 'YES' : 'NO'}`,
    '',
    decisions,
    '',
    proposal.finalized
      ? 'This exact ruleset is now the campaign pointer. Campaign state and funding were not changed.'
      : 'Approval records consent to this exact hash. Finalization remains a separate action and cannot fund or activate the campaign.',
  ].join('\n');
}

export function buildRulesGovernanceKeyboard(state, { controlsEnabled = false, viewerUserId = null } = {}) {
  const proposal = state.latestProposal;
  const viewerIsFounder = state.founders.some(({ founderUserId }) => String(founderUserId) === String(viewerUserId));
  const rows = [];
  if (controlsEnabled && viewerIsFounder && proposal && !proposal.finalized && proposal.semanticRulesValid) {
    rows.push([
      { text: '✅ Approve exact rules', callback_data: `admin:rulesdecide:${proposal.id}:APPROVE` },
      { text: '⛔ Hold', callback_data: `admin:rulesdecide:${proposal.id}:HOLD` },
    ]);
    if (proposal.finalizable) rows.push([{
      text: '🔒 Finalize approved rules', callback_data: `admin:rulesfinalize:${proposal.id}`,
    }]);
  }
  rows.push([{ text: '🔄 Refresh', callback_data: 'admin:rulesflow' }]);
  rows.push([{ text: '⬅️ Back to Bond the Duck', callback_data: 'admin:campaign:bond' }]);
  return { inline_keyboard: rows };
}
