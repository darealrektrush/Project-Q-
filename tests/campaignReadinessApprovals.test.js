import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCampaignReadinessApprovalKeyboard,
  buildCampaignReadinessApprovalText,
  getCampaignReadinessApprovalStatus,
  readinessDecisionIdempotencyKey,
  recordCampaignReadinessDecision,
} from '../src/campaign/readinessApprovals.js';

const REPORT_HASH = 'a'.repeat(64);
const REPORT_VERSION = 'bond-readiness-v1';

function mockClient({ founders = [], decisions = [] } = {}) {
  const calls = [];
  return {
    calls,
    async select(table, query) {
      calls.push({ kind: 'select', table, query });
      if (table === 'campaign_founders') return founders;
      if (table === 'campaign_readiness_approvals') return decisions;
      throw new Error(`unexpected table ${table}`);
    },
    async rpc(fn, args) {
      calls.push({ kind: 'rpc', fn, args });
      return [{ id: 1, ...args }];
    },
  };
}

const FOUNDERS = [
  { founder_user_id: 101, founder_label: 'Founder A', enabled: true },
  { founder_user_id: 202, founder_label: 'Founder B', enabled: true },
];

test('readiness approval status uses only the latest exact-report decision per founder', async () => {
  const client = mockClient({
    founders: FOUNDERS,
    decisions: [
      { id: 4, founder_user_id: 101, decision: 'HOLD', decided_at: '2026-08-25T04:00:00Z' },
      { id: 3, founder_user_id: 202, decision: 'APPROVE', decided_at: '2026-08-25T03:00:00Z' },
      { id: 2, founder_user_id: 101, decision: 'APPROVE', decided_at: '2026-08-25T02:00:00Z' },
    ],
  });
  const status = await getCampaignReadinessApprovalStatus(client, {
    campaignId: 'bond-the-duck-2026',
    reportVersion: REPORT_VERSION,
    reportHash: REPORT_HASH,
    readinessReady: true,
    campaignState: 'SCHEDULED',
  });

  assert.equal(status.approvalCount, 1);
  assert.equal(status.exactApprovalsRecorded, false);
  assert.equal(status.approved, false);
  assert.equal(status.acceptingDecisions, true);
  assert.deepEqual(status.founders.map(({ decision }) => decision), ['HOLD', 'APPROVE']);
  const approvalQuery = client.calls.find(({ table }) => table === 'campaign_readiness_approvals').query;
  assert.match(approvalQuery, new RegExp(`report_hash=eq\.${REPORT_HASH}`));
  assert.match(approvalQuery, /report_version=eq\.bond-readiness-v1/);
});

test('two exact approvals authorize the report but decisions open only while scheduled', async () => {
  const decisions = FOUNDERS.map(({ founder_user_id: founderUserId }, index) => ({
    id: index + 1,
    founder_user_id: founderUserId,
    decision: 'APPROVE',
    decided_at: `2026-08-25T0${index + 1}:00:00Z`,
  }));
  const scheduled = await getCampaignReadinessApprovalStatus(mockClient({ founders: FOUNDERS, decisions }), {
    campaignId: 'bond-the-duck-2026', reportVersion: REPORT_VERSION,
    reportHash: REPORT_HASH, readinessReady: true, campaignState: 'SCHEDULED',
  });
  const draft = await getCampaignReadinessApprovalStatus(mockClient({ founders: FOUNDERS, decisions }), {
    campaignId: 'bond-the-duck-2026', reportVersion: REPORT_VERSION,
    reportHash: REPORT_HASH, readinessReady: true, campaignState: 'DRAFT',
  });

  assert.equal(scheduled.approved, true);
  assert.equal(scheduled.acceptingDecisions, true);
  assert.equal(draft.approved, true);
  assert.equal(draft.acceptingDecisions, false);
});

test('Telegram approval controls are private-gate inputs and never activate a campaign', async () => {
  const status = await getCampaignReadinessApprovalStatus(mockClient({ founders: FOUNDERS }), {
    campaignId: 'bond-the-duck-2026', reportVersion: REPORT_VERSION,
    reportHash: REPORT_HASH, readinessReady: true, campaignState: 'SCHEDULED',
  });
  const hidden = buildCampaignReadinessApprovalKeyboard(status, {
    controlsEnabled: false, viewerUserId: 101,
  }).inline_keyboard.flat().map(({ callback_data: callback }) => callback);
  const visible = buildCampaignReadinessApprovalKeyboard(status, {
    controlsEnabled: true, viewerUserId: 101,
  }).inline_keyboard.flat().map(({ callback_data: callback }) => callback);

  assert.doesNotMatch(hidden.join(' '), /launchdecision/);
  assert.ok(visible.includes('admin:launchdecision:APPROVE'));
  assert.ok(visible.includes('admin:launchdecision:HOLD'));
  assert.doesNotMatch(visible.join(' '), /activate/i);
  assert.match(buildCampaignReadinessApprovalText(status), new RegExp(REPORT_HASH));
  assert.match(buildCampaignReadinessApprovalText(status), /0\/2/);
});

test('readiness decision idempotency keys bind callback, campaign and founder', () => {
  const input = { callbackQueryId: 'telegram-callback-7', campaignId: 'bond-the-duck-2026', founderUserId: 101 };
  const key = readinessDecisionIdempotencyKey(input);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(readinessDecisionIdempotencyKey(input), key);
  assert.notEqual(readinessDecisionIdempotencyKey({ ...input, callbackQueryId: 'telegram-callback-8' }), key);
  assert.notEqual(readinessDecisionIdempotencyKey({ ...input, founderUserId: 202 }), key);
});

test('recording a readiness decision is disabled by default and calls only the ledger RPC', async () => {
  const client = mockClient();
  const input = {
    campaignId: 'bond-the-duck-2026', founderUserId: 101,
    reportVersion: REPORT_VERSION, reportHash: REPORT_HASH, decision: 'approve',
    idempotencyKey: 'b'.repeat(64),
  };
  await assert.rejects(
    recordCampaignReadinessDecision(client, { ...input, env: {} }),
    /approvals disabled/
  );
  await recordCampaignReadinessDecision(client, {
    ...input,
    env: { PROJECT_Q_CAMPAIGN_READINESS_APPROVALS_ENABLED: 'true' },
  });
  const rpc = client.calls.find(({ kind }) => kind === 'rpc');
  assert.equal(rpc.fn, 'record_campaign_readiness_decision');
  assert.deepEqual(rpc.args, {
    p_campaign_id: 'bond-the-duck-2026',
    p_founder_user_id: '101',
    p_report_version: REPORT_VERSION,
    p_report_hash: REPORT_HASH,
    p_decision: 'APPROVE',
    p_idempotency_key: 'b'.repeat(64),
  });
});
