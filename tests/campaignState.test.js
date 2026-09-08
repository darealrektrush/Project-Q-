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

test('activation evidence binds two approvals to an exact versioned readiness report', () => {
  const evidence = {
    readinessReportVersion: 'bond-readiness-v1',
    readinessReportHash: 'a'.repeat(64),
    founderApprovals: 2,
  };
  assert.equal(assertTransition('SCHEDULED', 'ACTIVE', { evidence }), true);
  assert.throws(
    () => assertTransition('SCHEDULED', 'ACTIVE', {
      evidence: { readinessReportHash: evidence.readinessReportHash, founderApprovals: 2 },
    }),
    /readinessReportVersion/
  );
});

test('funding gate reconciles one 17.5M Squads vault, 2-of-3 authority, and separate 1 SOL prize', () => {
  const evidence = {
    expectedFundedBaseUnits: '17500000000000',
    fundedBaseUnits: '17500000000000',
    squadsCommunityVaultBaseUnits: '17500000000000',
    squadsApprovalThreshold: 2,
    squadsMemberCount: 3,
    topContributorPrizeLamports: '1000000000',
    vaultVerifiedAt: '2026-09-08T00:00:00Z',
  };
  assert.equal(assertTransition('READINESS_BLOCKED', 'FUNDED', { evidence }), true);
  assert.throws(
    () => assertTransition('READINESS_BLOCKED', 'FUNDED', {
      evidence: { ...evidence, squadsCommunityVaultBaseUnits: '17499999999999' },
    }),
    /does not reconcile/
  );
  assert.throws(() => assertTransition('READINESS_BLOCKED', 'FUNDED', {
    evidence: { ...evidence, squadsApprovalThreshold: 1 },
  }), /2-of-3/);
  assert.throws(() => assertTransition('READINESS_BLOCKED', 'FUNDED', {
    evidence: { ...evidence, topContributorPrizeLamports: '999999999' },
  }), /1 SOL/);
});
