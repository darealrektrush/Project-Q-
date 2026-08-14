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
  assert.equal(assertTransition('DRAFT', 'READINESS_BLOCKED', { evidence: { rulesHash: 'abc' } }), true);
});

test('pause and termination require two signers, except an automatic security pause', () => {
  assert.throws(() => assertTransition('ACTIVE', 'PAUSED', { evidence: { incident: 'x' }, authorizedSigners: 1 }), /two authorized/);
  assert.equal(assertTransition('ACTIVE', 'PAUSED', { evidence: { incident: 'x' }, authorizedSigners: 2 }), true);
  assert.equal(assertTransition('ACTIVE', 'PAUSED', { evidence: { incident: 'x' }, automaticSecurityPause: true }), true);
});

test('paused campaign resumes only to recorded prior state with two founders', () => {
  assert.equal(canTransition('PAUSED', 'ACTIVE', { resumeState: 'ACTIVE' }), true);
  assert.throws(() => assertTransition('PAUSED', 'ACTIVE', { resumeState: 'ACTIVE', evidence: { resolved: true }, founderApprovals: 1 }), /two founder/);
  assert.equal(assertTransition('PAUSED', 'ACTIVE', { resumeState: 'ACTIVE', evidence: { resolved: true }, founderApprovals: 2 }), true);
});

