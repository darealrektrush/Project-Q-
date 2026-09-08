const BPS_DENOMINATOR = 10_000n;
const RELEASE_BPS = [2_500, 5_000, 500, 500, 500, 500, 500];

export const BOND_WINNER_POSITION_BPS = Object.freeze([3_500, 2_500, 2_000, 1_200, 800]);
export const BOND_PHASED_RELEASE_OFFSETS_DAYS = Object.freeze([6, 12, 18, 24, 30]);

function baseUnits(value, label) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`${label} must be a canonical non-negative base-unit string`);
  }
  return BigInt(value);
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} is required`);
  return value;
}

function validateBps(bps, expectedLength, label) {
  if (!Array.isArray(bps) || bps.length !== expectedLength
    || bps.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error(`${label} must contain ${expectedLength} positive integer values`);
  }
  if (bps.reduce((sum, value) => sum + value, 0) !== Number(BPS_DENOMINATOR)) {
    throw new Error(`${label} must total 10000 basis points`);
  }
}

function splitExact(total, bps) {
  const parts = bps.map((value, index) => {
    const numerator = total * BigInt(value);
    return { index, amount: numerator / BPS_DENOMINATOR, remainder: numerator % BPS_DENOMINATOR };
  });
  let undistributed = total - parts.reduce((sum, part) => sum + part.amount, 0n);
  const priority = [...parts].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1
  );
  for (let index = 0; index < priority.length && undistributed > 0n; index += 1) {
    priority[index].amount += 1n;
    undistributed -= 1n;
  }
  return parts.sort((a, b) => a.index - b.index).map(({ amount }) => amount);
}

function timestamp(value, label) {
  const date = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(date.getTime())) throw new Error(`${label} must be an ISO timestamp`);
  return date;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86_400_000).toISOString();
}

export function allocateCyclePool({ campaignId, cycleId, poolBaseUnits, winners, positionBps }) {
  nonEmpty(campaignId, 'campaign id');
  if (!Number.isInteger(cycleId) || cycleId < 1) throw new Error('invalid campaign cycle');
  const pool = baseUnits(poolBaseUnits, 'cycle pool');
  if (pool === 0n) throw new Error('cycle pool must be positive');
  validateBps(positionBps, 5, 'winner position percentages');
  if (!Array.isArray(winners) || winners.length !== 5) throw new Error('exactly five winners are required');

  const identities = new Set();
  const byPosition = new Map();
  for (const winner of winners) {
    const identity = String(winner.telegramUserId ?? '');
    if (!/^\d+$/.test(identity)) throw new Error('invalid winner Telegram user id');
    if (identities.has(identity)) throw new Error('duplicate winner Telegram user id');
    if (!Number.isInteger(winner.position) || winner.position < 1 || winner.position > 5
      || byPosition.has(winner.position)) throw new Error('winner positions must be unique from 1 through 5');
    identities.add(identity);
    byPosition.set(winner.position, winner);
  }
  if (byPosition.size !== 5) throw new Error('winner positions must be unique from 1 through 5');

  const amounts = splitExact(pool, positionBps);
  return {
    campaignId,
    cycleId,
    poolBaseUnits: pool.toString(),
    allocations: amounts.map((amount, index) => ({
      position: index + 1,
      telegramUserId: String(byPosition.get(index + 1).telegramUserId),
      positionBps: positionBps[index],
      grossBaseUnits: amount.toString(),
    })),
  };
}

export function buildReleasePlan({ campaignId, category, allocationKey, grossBaseUnits, verifiedAt, postReviewClearedAt }) {
  nonEmpty(campaignId, 'campaign id');
  nonEmpty(category, 'category');
  nonEmpty(allocationKey, 'allocation key');
  const gross = baseUnits(grossBaseUnits, 'gross allocation');
  if (gross === 0n) throw new Error('gross allocation must be positive');
  const verified = timestamp(verifiedAt, 'verified at');
  const cleared = timestamp(postReviewClearedAt, 'post-review cleared at');
  if (cleared < verified) throw new Error('post-review clearance cannot precede verification');

  const amounts = splitExact(gross, RELEASE_BPS);
  const scheduled = [verified.toISOString(), cleared.toISOString(),
    ...BOND_PHASED_RELEASE_OFFSETS_DAYS.map((days) => addDays(cleared, days))];
  const stages = ['verified-25', 'post-review-50', 'phased-05-1', 'phased-05-2', 'phased-05-3', 'phased-05-4', 'phased-05-5'];
  return {
    campaignId,
    category,
    allocationKey,
    grossBaseUnits: gross.toString(),
    releases: amounts.map((amount, index) => ({
      stage: stages[index],
      pct: RELEASE_BPS[index] / 100,
      scheduledAt: scheduled[index],
      amountBaseUnits: amount.toString(),
      paymentKey: `${campaignId}:${category}:${allocationKey}:${stages[index]}`,
    })),
  };
}

export function reconcileAllocationPlan({ poolBaseUnits, allocations, releasePlans }) {
  const pool = baseUnits(poolBaseUnits, 'cycle pool');
  if (!Array.isArray(allocations) || !Array.isArray(releasePlans)) throw new Error('allocations and release plans are required');
  const allocated = allocations.reduce((sum, row) => sum + baseUnits(row.grossBaseUnits, 'allocation'), 0n);
  if (allocated !== pool) throw new Error('allocation total does not reconcile to cycle pool');
  if (releasePlans.length !== allocations.length) throw new Error('every allocation requires one release plan');

  const paymentKeys = new Set();
  releasePlans.forEach((plan, index) => {
    const expected = baseUnits(allocations[index].grossBaseUnits, 'allocation');
    const released = plan.releases.reduce((sum, release) => {
      if (paymentKeys.has(release.paymentKey)) throw new Error('duplicate payment key');
      paymentKeys.add(release.paymentKey);
      return sum + baseUnits(release.amountBaseUnits, 'release');
    }, 0n);
    if (released !== expected) throw new Error('release total does not reconcile to allocation');
  });
  return { reconciled: true, poolBaseUnits: pool.toString(), paymentKeyCount: paymentKeys.size };
}
