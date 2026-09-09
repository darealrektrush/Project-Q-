import test from 'node:test';
import assert from 'node:assert/strict';
import { decidePaymentRecovery, reconcileRecoveryBatch } from '../src/campaign/distributionRecovery.js';

const signature = (char = '5') => char.repeat(88);
const base = {
  paymentKey: 'bond:activity:cycle-1:position-1:verified-25',
  amountBaseUnits: '1000000',
  now: '2026-09-08T12:10:00.000Z',
  retryIntervalsSeconds: [60, 300, 900],
  maxAttempts: 4,
};
const attempt = (overrides = {}) => ({
  status: 'FAILED', amountBaseUnits: base.amountBaseUnits,
  attemptedAt: '2026-09-08T12:00:00.000Z', signature: null, ...overrides,
});

test('submits a never-attempted release and applies deterministic retry backoff', () => {
  assert.deepEqual(decidePaymentRecovery({ ...base, attempts: [] }), {
    paymentKey: base.paymentKey, action: 'SUBMIT', attemptNumber: 1,
  });
  const waiting = decidePaymentRecovery({ ...base, now: '2026-09-08T12:00:30.000Z', attempts: [attempt()] });
  assert.equal(waiting.action, 'WAIT_RETRY');
  assert.equal(waiting.retryAt, '2026-09-08T12:01:00.000Z');
  assert.equal(decidePaymentRecovery({ ...base, attempts: [attempt()] }).action, 'RETRY');
});

test('never retries a known signature until it has been reconciled', () => {
  const result = decidePaymentRecovery({ ...base, attempts: [attempt({ status: 'SUBMITTED', signature: signature() })] });
  assert.deepEqual(result, {
    paymentKey: base.paymentKey, action: 'RECONCILE_SIGNATURE', signature: signature(), attemptNumber: 1,
  });
});

test('marks one confirmed signature complete and reports recovered retries', () => {
  const result = decidePaymentRecovery({ ...base, attempts: [
    attempt(), attempt({ status: 'CONFIRMED', signature: signature(), attemptedAt: '2026-09-08T12:02:00.000Z' }),
  ] });
  assert.equal(result.action, 'COMPLETE');
  assert.equal(result.signature, signature());
  assert.equal(result.recovered, true);
});

test('fails closed on ambiguous confirmations, amount drift and malformed signatures', () => {
  const conflict = decidePaymentRecovery({ ...base, attempts: [
    attempt({ status: 'CONFIRMED', signature: signature('4') }),
    attempt({ status: 'CONFIRMED', signature: signature('5'), attemptedAt: '2026-09-08T12:01:00.000Z' }),
  ] });
  assert.equal(conflict.action, 'BLOCK_CONFLICT');
  assert.throws(() => decidePaymentRecovery({ ...base, attempts: [attempt({ amountBaseUnits: '999999' })] }), /does not match/);
  assert.throws(() => decidePaymentRecovery({ ...base, attempts: [attempt({ signature: 'not-a-signature' })] }), /invalid Solana/);
  assert.throws(() => decidePaymentRecovery({ ...base, attempts: [attempt({
    attemptedAt: '2026-09-08T12:11:00.000Z',
  })] }), /cannot be later/);
});

test('waits for Squads approval and blocks exhausted unsigned attempts', () => {
  assert.equal(decidePaymentRecovery({ ...base, attempts: [attempt({ status: 'PROPOSED' })] }).action, 'WAIT_FOR_APPROVAL');
  const attempts = [0, 1, 2, 3].map((index) => attempt({ attemptedAt: `2026-09-08T12:0${index}:00.000Z` }));
  assert.equal(decidePaymentRecovery({ ...base, attempts }).action, 'BLOCK_EXHAUSTED');
});

test('reconciles a 175-release campaign rehearsal with no duplicate payment decisions', () => {
  const releases = Array.from({ length: 175 }, (_, index) => ({
    paymentKey: `bond:release:${index + 1}`, amountBaseUnits: String(1_000_000 + index),
  }));
  const attemptsByPaymentKey = Object.fromEntries(releases.map((release, index) => {
    if (index % 5 === 0) return [release.paymentKey, [attempt({
      amountBaseUnits: release.amountBaseUnits, status: 'CONFIRMED', signature: signature(),
    })]];
    if (index % 5 === 1) return [release.paymentKey, [attempt({ amountBaseUnits: release.amountBaseUnits })]];
    if (index % 5 === 2) return [release.paymentKey, [attempt({
      amountBaseUnits: release.amountBaseUnits, status: 'SUBMITTED', signature: signature(),
    })]];
    return [release.paymentKey, []];
  }));
  const result = reconcileRecoveryBatch({
    releases, attemptsByPaymentKey, now: base.now,
    retryIntervalsSeconds: base.retryIntervalsSeconds, maxAttempts: base.maxAttempts,
  });
  assert.equal(result.releaseCount, 175);
  assert.equal(result.complete, 35);
  assert.equal(result.actionable, 105);
  assert.equal(result.blocked, 0);
  assert.equal(new Set(result.decisions.map(({ paymentKey }) => paymentKey)).size, 175);
});

test('rejects invalid retry policy and duplicate release keys', () => {
  assert.throws(() => decidePaymentRecovery({ ...base, attempts: [], retryIntervalsSeconds: [60, 60] }), /strictly increasing/);
  assert.throws(() => decidePaymentRecovery({ ...base, attempts: [], maxAttempts: 9 }), /interval count plus one/);
  const release = { paymentKey: 'same', amountBaseUnits: '1' };
  assert.throws(() => reconcileRecoveryBatch({
    releases: [release, release], attemptsByPaymentKey: {}, now: base.now,
    retryIntervalsSeconds: base.retryIntervalsSeconds, maxAttempts: base.maxAttempts,
  }), /duplicate release/);
});
