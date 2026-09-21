import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BOND_REHEARSAL_TOTALS,
  bondTeamBetaScenarios,
  buildBondRehearsalProfiles,
  runBondAutomatedRehearsal,
} from '../src/campaign/automatedRehearsal.js';

test('automated rehearsal reconciles the complete five-cycle Bond reward ledger', () => {
  const report = runBondAutomatedRehearsal();
  assert.equal(report.automatedReady, true);
  assert.equal(report.launchReady, false);
  assert.equal(report.lifecycle.cycleCount, 5);
  assert.equal(report.lifecycle.winnerCount, 25);
  assert.equal(report.lifecycle.releaseCount, 175);
  assert.equal(report.lifecycle.allocatedBaseUnits, '15000000000000');
  assert.equal(report.lifecycle.scheduledBaseUnits, '15000000000000');
  assert.equal(report.commitments.diamondDuckBaseUnits, '2500000000000');
  assert.equal(report.commitments.earnToBurnBaseUnits, '15000000000000');
  assert.equal(report.commitments.topContributorLamports, '1000000000');
  assert.equal(report.commitments.conservationLamports, '100000000');
  assert.equal(report.commitments.burnMilestones.length, 5);
  assert.match(report.reportFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(report.mutationsPerformed, false);
});

test('automated rehearsal covers recovery, conflict and idempotency decisions', () => {
  const report = runBondAutomatedRehearsal();
  assert.equal(report.gates.paymentKeysUnique, true);
  assert.equal(report.gates.deterministicReplay, true);
  assert.equal(report.gates.oneCycleCooldown, true);
  assert.equal(report.gates.recoveryPathsCovered, true);
  assert.deepEqual(report.recovery.coveredActions, [
    'BLOCK_CONFLICT', 'BLOCK_EXHAUSTED', 'COMPLETE', 'RECONCILE_SIGNATURE',
    'RETRY', 'SUBMIT', 'WAIT_FOR_APPROVAL',
  ]);
});

test('human beta and on-chain rehearsal remain explicit launch blockers', () => {
  const report = runBondAutomatedRehearsal();
  assert.equal(report.teamBeta.required, true);
  assert.equal(report.teamBeta.passed, false);
  assert.equal(report.onchainRehearsal.required, true);
  assert.equal(report.onchainRehearsal.passed, false);
  assert.equal(bondTeamBetaScenarios().length, 8);
});

test('rehearsal fixtures are bounded and commitments remain immutable', () => {
  assert.throws(() => buildBondRehearsalProfiles(19), /20 through 500/);
  assert.throws(() => buildBondRehearsalProfiles(501), /20 through 500/);
  assert.equal(Object.isFrozen(BOND_REHEARSAL_TOTALS), true);
});
