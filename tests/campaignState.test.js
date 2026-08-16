import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition, canTransition, hashRuleset } from '../src/campaign/state.js';

test('ruleset hash is stable across object key order', () => {
  assert.equal(hashRuleset({ b: 2, a: { d: 4, c: 3 } }), hashRuleset({ a: { c: 3, d: 4 }, b: 2 }));
});

test('campaign follows the gated forward path and rejects skips', () => {
  assert.equal(canTransition('DRAFT', 'READINESS_BLOCKED'), true);
  assert.equal(canTransition('DRAFT', 'ACTIVE'), false);
  assert.throws(() => assertTransition('DRAFT', 'READINESS_BLOCKED'), /exit evidence/);
  assert.throws(
    () => assertTransition('DRAFT', 'READINESS_BLOCKED', { evidence: { rulesHash: 'abc' } }),
    /rulesetVersion/
  );
  assert.equal(assertTransition('DRAFT', 'READINESS_BLOCKED', {
    evidence: { rulesHash: 'abc', rulesetVersion: 1 },
  }), true);
});

test('pause and termination require two signers, except an automatic security pause', () => {
  assert.throws(() => assertTransition('ACTIVE', 'PAUSED', { evidence: { incident: 'x' }, authorizedSigners: 1 }), /two authorized/);
  assert.equal(assertTransition('ACTIVE', 'PAUSED', { evidence: { incident: 'x' }, authorizedSigners: 2 }), true);
  assert.equal(assertTransition('ACTIVE', 'PAUSED', { evidence: { incident: 'x' }, automaticSecurityPause: true }), true);
  assert.throws(
    () => assertTransition('ACTIVE', 'TERMINATED', { evidence: { incident: 'x' }, automaticSecurityPause: true }),
    /two authorized/
  );
});

test('paused campaign resumes only to recorded prior state with two founders', () => {
  assert.equal(canTransition('PAUSED', 'ACTIVE', { resumeState: 'ACTIVE' }), true);
  assert.throws(() => assertTransition('PAUSED', 'ACTIVE', { resumeState: 'ACTIVE', evidence: { resolved: true }, founderApprovals: 1 }), /two founder/);
  assert.equal(assertTransition('PAUSED', 'ACTIVE', { resumeState: 'ACTIVE', evidence: { resolved: true }, founderApprovals: 2 }), true);
});

test('funding gate reconciles the locked vault split and SOL operations balance', () => {
  const evidence = {
    expectedFundedBaseUnits: '15000000000000',
    fundedBaseUnits: '15000000000000',
    activationVaultBaseUnits: '1875000000000',
    scheduledVaultBaseUnits: '13125000000000',
    solOperationsLamports: '250000000',
    vaultsVerifiedAt: '2026-08-14T00:00:00Z',
  };
  assert.equal(assertTransition('READINESS_BLOCKED', 'FUNDED', { evidence }), true);
  assert.throws(
    () => assertTransition('READINESS_BLOCKED', 'FUNDED', {
      evidence: { ...evidence, scheduledVaultBaseUnits: '13124999999999' },
    }),
    /does not reconcile/
  );
});
