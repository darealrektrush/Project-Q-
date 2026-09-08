import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allocateCyclePool,
  BOND_WINNER_POSITION_BPS,
  buildReleasePlan,
  reconcileAllocationPlan,
} from '../src/campaign/allocationPlan.js';

const winners = Array.from({ length: 5 }, (_, index) => ({ position: index + 1, telegramUserId: String(900 + index) }));

function allocate(overrides = {}) {
  return allocateCyclePool({
    campaignId: 'bond-the-duck-2026', cycleId: 1, poolBaseUnits: '1500000000000',
    winners, positionBps: BOND_WINNER_POSITION_BPS, ...overrides,
  });
}

test('allocates the locked 35/25/20/12/8 winner split exactly', () => {
  const result = allocate();
  assert.deepEqual(result.allocations.map(({ grossBaseUnits }) => grossBaseUnits), [
    '525000000000', '375000000000', '300000000000', '180000000000', '120000000000',
  ]);
});

test('preserves every base unit using stable largest-remainder ordering', () => {
  const result = allocate({ poolBaseUnits: '11' });
  assert.deepEqual(result.allocations.map(({ grossBaseUnits }) => grossBaseUnits), ['4', '3', '2', '1', '1']);
  assert.equal(result.allocations.reduce((sum, row) => sum + BigInt(row.grossBaseUnits), 0n), 11n);
});

test('fails closed on missing economics, invalid totals, and duplicate winners', () => {
  assert.throws(() => allocate({ positionBps: undefined }), /5 positive integer/);
  assert.throws(() => allocate({ positionBps: [3500, 2500, 2000, 1200, 799] }), /total 10000/);
  assert.throws(() => allocate({ winners: winners.map((winner, index) => ({ ...winner, telegramUserId: index ? winner.telegramUserId : '901' })) }), /duplicate/);
  assert.throws(() => allocate({ poolBaseUnits: '01' }), /canonical/);
});

test('builds 25/50/five-by-5 releases with exact timestamps and base-unit reconciliation', () => {
  const plan = buildReleasePlan({
    campaignId: 'bond-the-duck-2026', category: 'activity', allocationKey: 'cycle-1:position-1',
    grossBaseUnits: '13', verifiedAt: '2026-09-03T16:00:00.000Z', postReviewClearedAt: '2026-09-19T15:00:00.000Z',
  });
  assert.deepEqual(plan.releases.map(({ pct }) => pct), [25, 50, 5, 5, 5, 5, 5]);
  assert.deepEqual(plan.releases.slice(2).map(({ scheduledAt }) => scheduledAt), [
    '2026-09-25T15:00:00.000Z', '2026-10-01T15:00:00.000Z', '2026-10-07T15:00:00.000Z',
    '2026-10-13T15:00:00.000Z', '2026-10-19T15:00:00.000Z',
  ]);
  assert.equal(plan.releases.reduce((sum, row) => sum + BigInt(row.amountBaseUnits), 0n), 13n);
  assert.equal(new Set(plan.releases.map(({ paymentKey }) => paymentKey)).size, 7);
});

test('reconciles a complete cycle and rejects duplicate payment keys or unexplained differences', () => {
  const allocation = allocate({ poolBaseUnits: '101' });
  const releasePlans = allocation.allocations.map((row) => buildReleasePlan({
    campaignId: allocation.campaignId, category: 'activity', allocationKey: `cycle-1:position-${row.position}`,
    grossBaseUnits: row.grossBaseUnits, verifiedAt: '2026-09-03T16:00:00.000Z', postReviewClearedAt: '2026-09-19T15:00:00.000Z',
  }));
  assert.deepEqual(reconcileAllocationPlan({ ...allocation, releasePlans }), {
    reconciled: true, poolBaseUnits: '101', paymentKeyCount: 35,
  });
  releasePlans[1].releases[0].paymentKey = releasePlans[0].releases[0].paymentKey;
  assert.throws(() => reconcileAllocationPlan({ ...allocation, releasePlans }), /duplicate payment key/);
  assert.throws(() => reconcileAllocationPlan({ poolBaseUnits: '102', allocations: allocation.allocations, releasePlans }), /does not reconcile/);
});

test('rejects invalid release inputs and review ordering', () => {
  const base = { campaignId: 'c', category: 'activity', allocationKey: 'a', grossBaseUnits: '1', verifiedAt: '2026-09-03T00:00:00Z', postReviewClearedAt: '2026-09-04T00:00:00Z' };
  assert.throws(() => buildReleasePlan({ ...base, grossBaseUnits: '-1' }), /canonical/);
  assert.throws(() => buildReleasePlan({ ...base, postReviewClearedAt: '2026-09-02T00:00:00Z' }), /cannot precede/);
});
