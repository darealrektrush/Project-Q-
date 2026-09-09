import test from 'node:test';
import assert from 'node:assert/strict';
import { rehearseBondLifecycle, validateCyclePoolPlan } from '../src/campaign/lifecycleRehearsal.js';

const profiles = Array.from({ length: 25 }, (_, index) => ({
  telegramUserId: String(900000 + index),
  score: 250 - (index * 7),
  weight: (index % 3) + 1,
  eligible: true,
  admin: false,
}));
const testOnlyBalancedPools = Array(5).fill('3000000000000');
const publicSeeds = Array.from({ length: 5 }, (_, index) => `bond-lifecycle-rehearsal-public-seed-${index + 1}`);
const base = {
  profiles,
  cyclePoolBaseUnits: testOnlyBalancedPools,
  publicSeeds,
  activeOpensAt: '2026-10-01T15:00:00.000Z',
  postReviewClearedAt: '2026-10-17T15:00:00.000Z',
  recoveryObservedAt: '2026-10-17T16:00:00.000Z',
  retryIntervalsSeconds: [60, 300, 900],
  maxAttempts: 4,
};

test('requires five explicit cycle pools totaling exactly 15M FAWKQ', () => {
  assert.deepEqual(validateCyclePoolPlan(testOnlyBalancedPools), testOnlyBalancedPools);
  assert.throws(() => validateCyclePoolPlan(testOnlyBalancedPools.slice(0, 4)), /five explicit/);
  assert.throws(() => validateCyclePoolPlan([...testOnlyBalancedPools.slice(0, 4), '2999999999999']), /15M/);
  assert.throws(() => validateCyclePoolPlan([...testOnlyBalancedPools.slice(0, 4), '02']), /canonical/);
});

test('rehearses the complete 25-profile lifecycle and reconciles all 15M base units', () => {
  const result = rehearseBondLifecycle(base);
  assert.equal(result.mode, 'BUILD_ONLY_NO_DATABASE_NO_SIGNING');
  assert.equal(result.profileCount, 25);
  assert.equal(result.cycleCount, 5);
  assert.equal(result.winnerCount, 25);
  assert.equal(result.releaseCount, 175);
  assert.equal(result.allocatedBaseUnits, '15000000000000');
  assert.equal(result.scheduledBaseUnits, '15000000000000');
  assert.equal(result.recovery.actionable, 175);
  assert.equal(new Set(result.recovery.decisions.map(({ paymentKey }) => paymentKey)).size, 175);
});

test('the full lifecycle is deterministic across reordered profile input', () => {
  const first = rehearseBondLifecycle(base);
  const replay = rehearseBondLifecycle({ ...base, profiles: [...profiles].reverse() });
  assert.deepEqual(first, replay);
});

test('full lifecycle recovery never resubmits known transaction signatures', () => {
  const initial = rehearseBondLifecycle(base);
  const known = initial.recovery.decisions[0].paymentKey;
  const attemptsByPaymentKey = {
    [known]: [{
      status: 'SUBMITTED', amountBaseUnits: initial.cycles[0].releasePlans[0].releases[0].amountBaseUnits,
      attemptedAt: '2026-10-17T15:30:00.000Z', signature: '5'.repeat(88),
    }],
  };
  const recovered = rehearseBondLifecycle({ ...base, attemptsByPaymentKey });
  assert.equal(recovered.recovery.decisions.find(({ paymentKey }) => paymentKey === known).action, 'RECONCILE_SIGNATURE');
  assert.equal(recovered.recovery.actionable, 174);
});

test('rejects incomplete seeds and invalid rehearsal timing', () => {
  assert.throws(() => rehearseBondLifecycle({ ...base, publicSeeds: publicSeeds.slice(1) }), /five public/);
  assert.throws(() => rehearseBondLifecycle({
    ...base, postReviewClearedAt: base.activeOpensAt,
  }), /ordered rehearsal/);
});
