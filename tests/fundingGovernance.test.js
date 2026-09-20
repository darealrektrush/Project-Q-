import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFundingGovernanceText,
  finalizeFunding,
  fundingDecisionIdempotencyKey,
  getFundingGovernanceState,
  recordFundingDecision,
} from '../src/campaign/fundingGovernance.js';

function clientFixture({
  campaignState = 'READINESS_BLOCKED',
  fundedBaseUnits = '0',
  decisions = [],
  verifiedAt = '2026-10-01T12:00:00Z',
  finalized = false,
} = {}) {
  return {
    async select(table) {
      if (table === 'campaigns') return [{
        id: 'bond-the-duck-2026',
        state: campaignState,
        funded_base_units: fundedBaseUnits,
      }];
      if (table === 'campaign_founders') return [
        { founder_user_id: 101, founder_label: 'Founder A' },
        { founder_user_id: 202, founder_label: 'Founder B' },
      ];
      if (table === 'campaign_funding_proposals') return [{
        id: 7,
        vault_address: '11111111111111111111111111111111',
        vault_base_units: '17500000000000',
        squads_approval_threshold: 2,
        squads_member_count: 3,
        top_contributor_prize_lamports: '1000000000',
        evidence_hash: 'a'.repeat(64),
        verified_at: verifiedAt,
        created_at: verifiedAt,
      }];
      if (table === 'campaign_funding_finalizations') return finalized
        ? [{ proposal_id: 7, finalized_by: 101, finalized_at: '2026-10-01T13:00:00Z' }]
        : [];
      if (table === 'campaign_funding_decisions') return decisions;
      throw new Error(`unexpected table ${table}`);
    },
  };
}

test('funding governance becomes finalizable only with two current approvals', async () => {
  const state = await getFundingGovernanceState(clientFixture({
    decisions: [
      { id: 4, founder_user_id: 101, decision: 'APPROVE', decided_at: '2026-10-01T12:30:00Z' },
      { id: 3, founder_user_id: 202, decision: 'APPROVE', decided_at: '2026-10-01T12:20:00Z' },
    ],
  }), 'bond-the-duck-2026', { now: '2026-10-01T13:00:00Z' });

  assert.equal(state.approvalCount, 2);
  assert.equal(state.holdCount, 0);
  assert.equal(state.finalizable, true);
  assert.equal(state.fundedBaseUnits, '0');
});

test('latest HOLD supersedes earlier APPROVE and blocks finalization', async () => {
  const state = await getFundingGovernanceState(clientFixture({
    decisions: [
      { id: 8, founder_user_id: 101, decision: 'HOLD', decided_at: '2026-10-01T12:50:00Z' },
      { id: 7, founder_user_id: 101, decision: 'APPROVE', decided_at: '2026-10-01T12:30:00Z' },
      { id: 6, founder_user_id: 202, decision: 'APPROVE', decided_at: '2026-10-01T12:20:00Z' },
    ],
  }), 'bond-the-duck-2026', { now: '2026-10-01T13:00:00Z' });

  assert.equal(state.approvalCount, 1);
  assert.equal(state.holdCount, 1);
  assert.equal(state.finalizable, false);
  assert.equal(state.founders.find(({ founderUserId }) => founderUserId === '101').decision, 'HOLD');
});

test('stale funding evidence cannot finalize even with two approvals', async () => {
  const state = await getFundingGovernanceState(clientFixture({
    verifiedAt: '2026-09-25T00:00:00Z',
    decisions: [
      { id: 2, founder_user_id: 101, decision: 'APPROVE', decided_at: '2026-10-01T12:30:00Z' },
      { id: 1, founder_user_id: 202, decision: 'APPROVE', decided_at: '2026-10-01T12:20:00Z' },
    ],
  }), 'bond-the-duck-2026', { now: '2026-10-01T13:00:00Z' });

  assert.equal(state.proposal.stale, true);
  assert.equal(state.finalizable, false);
});

test('funding governance text redacts full vault and evidence hash and exposes no URL', async () => {
  const state = await getFundingGovernanceState(clientFixture(), 'bond-the-duck-2026', {
    now: '2026-10-01T13:00:00Z',
  });
  const text = buildFundingGovernanceText(state);
  assert.match(text, /111111…111111/);
  assert.match(text, /aaaaaaaa…aaaaaaaa/);
  assert.doesNotMatch(text, /11111111111111111111111111111111/);
  assert.doesNotMatch(text, /a{64}/);
  assert.doesNotMatch(text, /https?:\/\//);
  assert.match(text, /No token movement or treasury signing/);
});

test('funding decision idempotency is deterministic and action-bound', () => {
  const input = {
    proposalId: 7,
    founderUserId: 101,
    decision: 'APPROVE',
    callbackQueryId: 'telegram-callback-1',
  };
  const key = fundingDecisionIdempotencyKey(input);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(fundingDecisionIdempotencyKey(input), key);
  assert.notEqual(fundingDecisionIdempotencyKey({ ...input, decision: 'HOLD' }), key);
  assert.throws(() => fundingDecisionIdempotencyKey({ ...input, proposalId: 'bad' }), /invalid/);
});

test('funding mutations are disabled by default and call only audited RPCs when enabled', async () => {
  const calls = [];
  const client = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      return [{ ok: true }];
    },
  };

  await assert.rejects(recordFundingDecision(client, {
    proposalId: 7,
    founderUserId: 101,
    decision: 'APPROVE',
    callbackQueryId: 'cb-1',
    env: {},
  }), /disabled/);

  await recordFundingDecision(client, {
    proposalId: 7,
    founderUserId: 101,
    decision: 'APPROVE',
    callbackQueryId: 'cb-1',
    env: { PROJECT_Q_FUNDING_GOVERNANCE_ENABLED: 'true' },
  });

  await assert.rejects(finalizeFunding(client, {
    proposalId: 7,
    founderUserId: 101,
    env: {},
  }), /disabled/);

  await finalizeFunding(client, {
    proposalId: 7,
    founderUserId: 101,
    env: { PROJECT_Q_FUNDING_GOVERNANCE_ENABLED: 'true' },
  });

  assert.equal(calls[0].fn, 'record_campaign_funding_decision');
  assert.equal(calls[1].fn, 'finalize_campaign_funding');
  assert.equal(calls.length, 2);
});


test('Render keeps funding governance mutations disabled by default', async () => {
  const { readFile } = await import('node:fs/promises');
  const yaml = await readFile(new URL('../render.yaml', import.meta.url), 'utf8');
  assert.match(yaml, /PROJECT_Q_FUNDING_GOVERNANCE_ENABLED[\s\S]*value: "false"/);
});
