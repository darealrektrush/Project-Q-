import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BOND_EARN_TO_BURN_MILESTONES,
  inspectBondCampaignRules,
} from '../src/campaign/rules.js';
import {
  buildRulesGovernanceKeyboard,
  buildRulesGovernanceText,
  finalizeApprovedRules,
  getCampaignRulesGovernanceState,
  recordFinalRulesDecision,
  rulesGovernanceIdempotencyKey,
  submitFinalRulesProposal,
} from '../src/campaign/rulesGovernance.js';

async function finalRules() {
  const draft = JSON.parse(await readFile(
    new URL('../config/bond-the-duck-rules-v1.json', import.meta.url), 'utf8'
  ));
  return {
    ...draft,
    rulesetVersion: 2,
    status: 'FINAL',
    referrals: {
      ...draft.referrals,
      bonusXp: 10,
      xInviteMainPostId: '1234567890123456789',
      xInviteBonusXp: 5,
    },
    earnToBurn: {
      ...draft.earnToBurn,
      milestones: structuredClone(BOND_EARN_TO_BURN_MILESTONES),
    },
  };
}

function clientFixture({ decisions = [], finalized = false } = {}) {
  const calls = [];
  return {
    calls,
    async select(table) {
      if (table === 'campaigns') return [{
        id: 'bond-the-duck-2026', state: 'DRAFT', ruleset_version: 1, rules_hash: 'a'.repeat(64),
      }];
      if (table === 'campaign_founders') return [
        { founder_user_id: 101, founder_label: 'Founder A' },
        { founder_user_id: 202, founder_label: 'Founder B' },
      ];
      if (table === 'campaign_ruleset_proposals') {
        const rules = await finalRules();
        return [{
          id: 7, version: 2, rules_json: rules,
          rules_hash: inspectBondCampaignRules(rules).rulesHash,
          proposed_by: 101, created_at: '2026-08-25T22:00:00Z',
        }];
      }
      if (table === 'campaign_ruleset_finalizations') return finalized ? [{
        id: 3, proposal_id: 7, version: 2,
        rules_hash: inspectBondCampaignRules(await finalRules()).rulesHash,
        finalized_by: 101, finalized_at: '2026-08-25T23:00:00Z',
      }] : [];
      if (table === 'campaign_ruleset_decisions') return decisions;
      throw new Error(`unexpected table ${table}`);
    },
    async rpc(fn, args) {
      calls.push({ fn, args });
      return [{ id: 1, ...args }];
    },
  };
}

test('rules governance derives latest founder decisions for one immutable proposal', async () => {
  const state = await getCampaignRulesGovernanceState(clientFixture({ decisions: [
    { id: 4, proposal_id: 7, founder_user_id: 101, decision: 'HOLD', decided_at: '2026-08-25T23:04:00Z' },
    { id: 3, proposal_id: 7, founder_user_id: 202, decision: 'APPROVE', decided_at: '2026-08-25T23:03:00Z' },
    { id: 2, proposal_id: 7, founder_user_id: 101, decision: 'APPROVE', decided_at: '2026-08-25T23:02:00Z' },
  ] }));
  assert.equal(state.latestProposal.semanticRulesValid, true);
  assert.equal(state.latestProposal.approvalCount, 1);
  assert.equal(state.latestProposal.finalizable, false);
  assert.deepEqual(
    state.latestProposal.founderDecisions.map(({ decision }) => decision),
    ['HOLD', 'APPROVE']
  );
});

test('two current approvals reveal finalization without exposing activation controls', async () => {
  const state = await getCampaignRulesGovernanceState(clientFixture({ decisions: [
    { id: 2, proposal_id: 7, founder_user_id: 101, decision: 'APPROVE', decided_at: '2026-08-25T23:02:00Z' },
    { id: 3, proposal_id: 7, founder_user_id: 202, decision: 'APPROVE', decided_at: '2026-08-25T23:03:00Z' },
  ] }));
  const callbacks = buildRulesGovernanceKeyboard(state, {
    controlsEnabled: true, viewerUserId: 101,
  }).inline_keyboard.flat().map(({ callback_data: callback }) => callback);
  assert.equal(state.latestProposal.finalizable, true);
  assert.ok(callbacks.includes('admin:rulesfinalize:7'));
  assert.ok(callbacks.includes('admin:rulesdecide:7:APPROVE'));
  assert.ok(callbacks.includes('admin:rulesdecide:7:HOLD'));
  assert.doesNotMatch(callbacks.join(' '), /activate|fund|reward/i);
  assert.match(buildRulesGovernanceText(state), new RegExp(state.latestProposal.rules_hash));
});

test('rules governance mutations are independently feature-gated and call exact RPCs', async () => {
  const client = clientFixture();
  const rules = await finalRules();
  const disabled = {};
  const enabled = { PROJECT_Q_CAMPAIGN_RULES_GOVERNANCE_ENABLED: 'true' };
  await assert.rejects(submitFinalRulesProposal(client, {
    campaignId: 'bond-the-duck-2026', founderUserId: 101, version: 2, rules,
    idempotencyKey: 'a'.repeat(64), env: disabled,
  }), /governance disabled/);
  await submitFinalRulesProposal(client, {
    campaignId: 'bond-the-duck-2026', founderUserId: 101, version: 2, rules,
    idempotencyKey: 'a'.repeat(64), env: enabled,
  });
  await recordFinalRulesDecision(client, {
    proposalId: 7, founderUserId: 101, decision: 'APPROVE',
    idempotencyKey: 'b'.repeat(64), env: enabled,
  });
  await finalizeApprovedRules(client, { proposalId: 7, founderUserId: 101, env: enabled });
  assert.deepEqual(client.calls.map(({ fn }) => fn), [
    'submit_campaign_ruleset_proposal',
    'record_campaign_ruleset_decision',
    'finalize_campaign_ruleset_proposal',
  ]);
  assert.equal(client.calls[0].args.p_rules_hash, inspectBondCampaignRules(rules).rulesHash);
});

test('rules governance idempotency binds action, callback, campaign and founder', () => {
  const input = {
    action: 'rules-APPROVE', callbackQueryId: 'callback-1',
    campaignId: 'bond-the-duck-2026', founderUserId: 101,
  };
  const key = rulesGovernanceIdempotencyKey(input);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(rulesGovernanceIdempotencyKey(input), key);
  assert.notEqual(rulesGovernanceIdempotencyKey({ ...input, action: 'rules-HOLD' }), key);
});
