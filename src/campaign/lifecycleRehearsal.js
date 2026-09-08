import { allocateCyclePool, BOND_WINNER_POSITION_BPS, buildReleasePlan } from './allocationPlan.js';
import { reconcileRecoveryBatch } from './distributionRecovery.js';
import { selectCycleWinners } from './winnerSelection.js';

const CAMPAIGN_REWARD_BASE_UNITS = 15_000_000_000_000n;

function baseUnits(value, label) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`${label} must be a canonical positive base-unit string`);
  }
  return BigInt(value);
}

export function validateCyclePoolPlan(cyclePoolBaseUnits) {
  if (!Array.isArray(cyclePoolBaseUnits) || cyclePoolBaseUnits.length !== 7) {
    throw new Error('exactly seven explicit cycle pools are required');
  }
  const pools = cyclePoolBaseUnits.map((value, index) => baseUnits(value, `cycle ${index + 1} pool`));
  const total = pools.reduce((sum, value) => sum + value, 0n);
  if (total !== CAMPAIGN_REWARD_BASE_UNITS) {
    throw new Error('cycle pools must reconcile exactly to the 15M FAWKQ campaign reward pool');
  }
  return pools.map(String);
}

export function rehearseBondLifecycle({
  profiles, cyclePoolBaseUnits, publicSeeds, activeOpensAt, postReviewClearedAt,
  attemptsByPaymentKey = {}, recoveryObservedAt, retryIntervalsSeconds, maxAttempts,
}) {
  const pools = validateCyclePoolPlan(cyclePoolBaseUnits);
  if (!Array.isArray(publicSeeds) || publicSeeds.length !== 7) {
    throw new Error('exactly seven public draw seeds are required');
  }
  const activeOpen = new Date(activeOpensAt);
  const reviewClear = new Date(postReviewClearedAt);
  if (Number.isNaN(activeOpen.getTime()) || Number.isNaN(reviewClear.getTime()) || reviewClear <= activeOpen) {
    throw new Error('valid ordered rehearsal timestamps are required');
  }

  const cycles = pools.map((poolBaseUnits, index) => {
    const cycleId = index + 1;
    const selection = selectCycleWinners({
      campaignId: 'bond-the-duck-2026', cycleId, profiles, publicSeed: publicSeeds[index],
    });
    const allocation = allocateCyclePool({
      campaignId: selection.campaignId, cycleId, poolBaseUnits,
      winners: selection.winners, positionBps: BOND_WINNER_POSITION_BPS,
    });
    const cycleVerifiedAt = new Date(activeOpen.getTime() + cycleId * 48 * 60 * 60 * 1000).toISOString();
    const releasePlans = allocation.allocations.map((row) => buildReleasePlan({
      campaignId: selection.campaignId,
      category: 'activity',
      allocationKey: `cycle-${cycleId}:position-${row.position}`,
      grossBaseUnits: row.grossBaseUnits,
      verifiedAt: cycleVerifiedAt,
      postReviewClearedAt: reviewClear.toISOString(),
    }));
    return { cycleId, poolBaseUnits, selection, allocation, releasePlans };
  });

  const releases = cycles.flatMap(({ releasePlans }) => releasePlans.flatMap(({ releases: rows }) => rows));
  const recovery = reconcileRecoveryBatch({
    releases, attemptsByPaymentKey, now: recoveryObservedAt, retryIntervalsSeconds, maxAttempts,
  });
  const allocated = cycles.reduce((sum, { allocation }) =>
    sum + allocation.allocations.reduce((cycleSum, row) => cycleSum + BigInt(row.grossBaseUnits), 0n), 0n);
  const scheduled = releases.reduce((sum, row) => sum + BigInt(row.amountBaseUnits), 0n);
  if (allocated !== CAMPAIGN_REWARD_BASE_UNITS || scheduled !== CAMPAIGN_REWARD_BASE_UNITS) {
    throw new Error('lifecycle rehearsal does not reconcile to 15M FAWKQ');
  }

  return {
    mode: 'BUILD_ONLY_NO_DATABASE_NO_SIGNING',
    profileCount: profiles.length,
    cycleCount: cycles.length,
    winnerCount: cycles.reduce((sum, cycle) => sum + cycle.selection.winners.length, 0),
    releaseCount: releases.length,
    allocatedBaseUnits: allocated.toString(),
    scheduledBaseUnits: scheduled.toString(),
    recovery,
    cycles,
  };
}
