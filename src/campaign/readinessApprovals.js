import { createHash } from 'node:crypto';
import { campaignReadinessApprovalsEnabled } from '../lib/featureFlags.js';

const DECISIONS = new Set(['APPROVE', 'HOLD']);
const REPORT_VERSION = /^[a-z0-9][a-z0-9-]{2,63}$/;
const HASH = /^[0-9a-f]{64}$/;

export function readinessDecisionIdempotencyKey({ callbackQueryId, campaignId, founderUserId }) {
  const callback = String(callbackQueryId || '').trim();
  const campaign = String(campaignId || '').trim();
  const founder = String(founderUserId || '').trim();
  if (!callback || !campaign || !/^\d+$/.test(founder)) {
    throw new Error('invalid readiness decision identity');
  }
  return createHash('sha256').update(`${campaign}:${founder}:${callback}`).digest('hex');
}

export async function getCampaignReadinessApprovalStatus(client, {
  campaignId,
  reportVersion,
  reportHash,
  readinessReady = false,
  campaignState = 'DRAFT',
} = {}) {
  const id = String(campaignId || '').trim();
  const version = String(reportVersion || '').trim();
  const hash = String(reportHash || '').trim();
  if (!id || !REPORT_VERSION.test(version) || !HASH.test(hash)) {
    throw new Error('invalid campaign readiness report');
  }
  const [founderRows, decisionRows] = await Promise.all([
    client.select(
      'campaign_founders',
      `?campaign_id=eq.${encodeURIComponent(id)}&enabled=eq.true` +
        '&select=founder_user_id,founder_label,enabled&order=founder_label.asc'
    ),
    client.select(
      'campaign_readiness_approvals',
      `?campaign_id=eq.${encodeURIComponent(id)}&report_version=eq.${encodeURIComponent(version)}` +
        `&report_hash=eq.${encodeURIComponent(hash)}` +
        '&select=id,founder_user_id,decision,decided_at&order=decided_at.desc,id.desc&limit=100'
    ),
  ]);
  const latest = new Map();
  for (const row of decisionRows) {
    const founderId = String(row.founder_user_id);
    if (!latest.has(founderId)) latest.set(founderId, row);
  }
  const founders = founderRows.map((founder) => {
    const decision = latest.get(String(founder.founder_user_id));
    return {
      founderUserId: String(founder.founder_user_id),
      label: String(founder.founder_label || 'Configured founder'),
      decision: decision?.decision || 'PENDING',
      decidedAt: decision?.decided_at || null,
    };
  });
  const approvalCount = founders.filter(({ decision }) => decision === 'APPROVE').length;
  const normalizedState = String(campaignState || 'DRAFT').toUpperCase();
  const exactApprovalsRecorded = founders.length === 2 && approvalCount === 2;
  return {
    campaignId: id,
    reportVersion: version,
    reportHash: hash,
    readinessReady: Boolean(readinessReady),
    campaignState: normalizedState,
    acceptingDecisions: Boolean(readinessReady && normalizedState === 'SCHEDULED'),
    founderCount: founders.length,
    approvalCount,
    founders,
    exactApprovalsRecorded,
    approved: Boolean(readinessReady && exactApprovalsRecorded),
  };
}

export async function recordCampaignReadinessDecision(client, {
  campaignId,
  founderUserId,
  reportVersion,
  reportHash,
  decision,
  idempotencyKey,
  env = process.env,
} = {}) {
  const normalizedDecision = String(decision || '').toUpperCase();
  if (!campaignReadinessApprovalsEnabled(env)) throw new Error('campaign readiness approvals disabled');
  if (!String(campaignId || '').trim() || !/^\d+$/.test(String(founderUserId || ''))
    || !REPORT_VERSION.test(String(reportVersion || '')) || !HASH.test(String(reportHash || ''))
    || !DECISIONS.has(normalizedDecision) || !HASH.test(String(idempotencyKey || ''))) {
    throw new Error('invalid campaign readiness decision');
  }
  return client.rpc('record_campaign_readiness_decision', {
    p_campaign_id: String(campaignId),
    p_founder_user_id: String(founderUserId),
    p_report_version: String(reportVersion),
    p_report_hash: String(reportHash),
    p_decision: normalizedDecision,
    p_idempotency_key: String(idempotencyKey),
  });
}

export function buildCampaignReadinessApprovalText(status) {
  const founderLines = status.founders.length
    ? status.founders.map(({ label, decision }) => `${decision === 'APPROVE' ? '✅' : decision === 'HOLD' ? '⛔' : '🔒'} ${label}: ${decision}`).join('\n')
    : '🔒 No campaign founders configured';
  const outcome = status.approved
    ? 'Two exact approvals are recorded. Activation remains a separate, founder-gated state transition.'
    : status.readinessReady && status.campaignState === 'SCHEDULED'
      ? 'Readiness passes, but two exact founder approvals are still required.'
      : status.readinessReady
        ? 'Readiness passes, but decisions open only when the campaign is SCHEDULED.'
      : 'Readiness does not pass. Approval controls remain fail-closed.';
  return [
    '🦆 *Bond the Duck // Launch Approvals*',
    '',
    `*Readiness:* ${status.readinessReady ? 'PASS' : 'BLOCKED'}`,
    `*Campaign state:* ${status.campaignState}`,
    `*Approvals:* ${status.approvalCount}/2`,
    `*Report:* \`${status.reportHash}\``,
    `*Version:* ${status.reportVersion}`,
    '',
    founderLines,
    '',
    outcome,
  ].join('\n');
}

export function buildCampaignReadinessApprovalKeyboard(status, {
  controlsEnabled = false,
  viewerUserId = null,
} = {}) {
  const viewerIsFounder = status.founders.some(({ founderUserId }) => String(founderUserId) === String(viewerUserId));
  const decisionRows = controlsEnabled && viewerIsFounder && status.acceptingDecisions
    ? [[
      { text: '✅ Approve exact report', callback_data: 'admin:launchdecision:APPROVE' },
      { text: '⛔ Hold launch', callback_data: 'admin:launchdecision:HOLD' },
    ]]
    : [];
  return {
    inline_keyboard: [
      ...decisionRows,
      [{ text: '🔄 Refresh', callback_data: 'admin:launchapprovals' }],
      [{ text: '⬅️ Back to Bond the Duck', callback_data: 'admin:campaign:bond' }],
    ],
  };
}
