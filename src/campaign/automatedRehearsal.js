import { createHash } from 'node:crypto';

import { reconcileRecoveryBatch } from './distributionRecovery.js';
import { rehearseBondLifecycle } from './lifecycleRehearsal.js';

export const BOND_REHEARSAL_TOTALS = Object.freeze({
  campaignRewardBaseUnits: '15000000000000',
  diamondDuckBaseUnits: '2500000000000',
  earnToBurnBaseUnits: '15000000000000',
  topContributorLamports: '1000000000',
  conservationLamports: '100000000',
  cycleCount: 5,
  winnersPerCycle: 5,
  releasesPerWinner: 7,
});

const RETRY_INTERVALS_SECONDS = Object.freeze([60, 300, 900]);
const MAX_ATTEMPTS = 4;
const SIGNATURE_A = '1'.repeat(64);
const SIGNATURE_B = '2'.repeat(64);

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function unique(values) {
  return new Set(values).size === values.length;
}

export function buildBondRehearsalProfiles(count = 30) {
  if (!Number.isSafeInteger(count) || count < 20 || count > 500) {
    throw new Error('rehearsal profile count must be an integer from 20 through 500');
  }
  return Array.from({ length: count }, (_, index) => ({
    telegramUserId: String(910_000 + index),
    score: 10_000 - (index * 137),
    weight: (index % 5) + 1,
    eligible: true,
    admin: false,
  }));
}

export function bondTeamBetaScenarios() {
  return Object.freeze([
    { id: 'happy-path', role: 'eligible-member', proves: 'join, identity, missions, XP, rank and rewards' },
    { id: 'below-holder-floor', role: 'ineligible-member', proves: '$2 holder gate fails closed' },
    { id: 'identity-replay', role: 'duplicate-identity', proves: 'one X, Telegram, wallet and profile mapping' },
    { id: 'founder-exclusion', role: 'founder-admin', proves: 'operators cannot earn or rank' },
    { id: 'website-review', role: 'evidence-reviewer', proves: 'approve, reject and stale-proof handling' },
    { id: 'cooldown-cap', role: 'high-activity-member', proves: 'daily caps and source cooldowns' },
    { id: 'referral-invite', role: 'referrer', proves: 'qualified referral and three-person X invite' },
    { id: 'recovery', role: 'operations-reviewer', proves: 'outage, replay and payout recovery' },
  ]);
}

function allReleases(lifecycle) {
  return lifecycle.cycles.flatMap(({ releasePlans }) =>
    releasePlans.flatMap(({ releases }) => releases));
}

export function buildBondLifecycleFixture({ profileCount = 30 } = {}) {
  const profiles = buildBondRehearsalProfiles(profileCount);
  const input = {
    profiles,
    cyclePoolBaseUnits: Array(5).fill('3000000000000'),
    publicSeeds: Array.from({ length: 5 }, (_, index) => `bond-automated-rehearsal-seed-${index + 1}`),
    activeOpensAt: '2030-01-01T20:00:00.000Z',
    postReviewClearedAt: '2030-01-14T20:00:00.000Z',
    recoveryObservedAt: '2030-01-15T20:00:00.000Z',
    retryIntervalsSeconds: RETRY_INTERVALS_SECONDS,
    maxAttempts: MAX_ATTEMPTS,
  };
  return { input, lifecycle: rehearseBondLifecycle(input) };
}

function failureInjection(releases, observedAt) {
  const attempts = {};
  const attemptedAt = new Date(new Date(observedAt).getTime() - 3_600_000).toISOString();

  attempts[releases[0].paymentKey] = [{
    status: 'CONFIRMED', signature: SIGNATURE_A,
    amountBaseUnits: releases[0].amountBaseUnits, attemptedAt,
  }];
  attempts[releases[1].paymentKey] = [{
    status: 'SUBMITTED', signature: SIGNATURE_B,
    amountBaseUnits: releases[1].amountBaseUnits, attemptedAt,
  }];
  attempts[releases[2].paymentKey] = [{
    status: 'FAILED', signature: null,
    amountBaseUnits: releases[2].amountBaseUnits, attemptedAt,
  }];
  attempts[releases[3].paymentKey] = [{
    status: 'PROPOSED', signature: null,
    amountBaseUnits: releases[3].amountBaseUnits, attemptedAt,
  }];
  attempts[releases[4].paymentKey] = Array.from({ length: MAX_ATTEMPTS }, (_, index) => ({
    status: 'FAILED', signature: null,
    amountBaseUnits: releases[4].amountBaseUnits,
    attemptedAt: new Date(new Date(attemptedAt).getTime() + index * 60_000).toISOString(),
  }));
  attempts[releases[5].paymentKey] = [
    {
      status: 'CONFIRMED', signature: SIGNATURE_A,
      amountBaseUnits: releases[5].amountBaseUnits, attemptedAt,
    },
    {
      status: 'CONFIRMED', signature: SIGNATURE_B,
      amountBaseUnits: releases[5].amountBaseUnits,
      attemptedAt: new Date(new Date(attemptedAt).getTime() + 60_000).toISOString(),
    },
  ];
  return attempts;
}

export function runBondAutomatedRehearsal({ profileCount = 30 } = {}) {
  const { input, lifecycle } = buildBondLifecycleFixture({ profileCount });
  const replay = rehearseBondLifecycle(input);
  const releases = allReleases(lifecycle);
  const paymentKeys = releases.map(({ paymentKey }) => paymentKey);
  const winnersByCycle = lifecycle.cycles.map(({ selection }) =>
    selection.winners.map(({ telegramUserId }) => telegramUserId));
  const cooldownSafe = winnersByCycle.every((winners, index) => index === 0
    || winners.every((winner) => !winnersByCycle[index - 1].includes(winner)));
  const failureRecovery = reconcileRecoveryBatch({
    releases,
    attemptsByPaymentKey: failureInjection(releases, input.recoveryObservedAt),
    now: input.recoveryObservedAt,
    retryIntervalsSeconds: RETRY_INTERVALS_SECONDS,
    maxAttempts: MAX_ATTEMPTS,
  });
  const burnMilestones = [2_000, 5_000, 9_000, 14_000, 20_000].map((progressTargetUnits, index) => ({
    sequence: index + 1,
    progressTargetUnits: String(progressTargetUnits),
    burnAmountBaseUnits: '3000000000000',
  }));
  const burnTotal = burnMilestones.reduce((sum, row) => sum + BigInt(row.burnAmountBaseUnits), 0n);
  const lifecycleHash = sha256(lifecycle.cycles);
  const replayHash = sha256(replay.cycles);

  const gates = {
    exactCycleCount: lifecycle.cycleCount === BOND_REHEARSAL_TOTALS.cycleCount,
    exactWinnerCount: lifecycle.winnerCount === BOND_REHEARSAL_TOTALS.cycleCount
      * BOND_REHEARSAL_TOTALS.winnersPerCycle,
    exactReleaseCount: lifecycle.releaseCount === BOND_REHEARSAL_TOTALS.cycleCount
      * BOND_REHEARSAL_TOTALS.winnersPerCycle * BOND_REHEARSAL_TOTALS.releasesPerWinner,
    rewardPoolReconciled: lifecycle.allocatedBaseUnits === BOND_REHEARSAL_TOTALS.campaignRewardBaseUnits
      && lifecycle.scheduledBaseUnits === BOND_REHEARSAL_TOTALS.campaignRewardBaseUnits,
    paymentKeysUnique: unique(paymentKeys),
    oneCycleCooldown: cooldownSafe,
    deterministicReplay: lifecycleHash === replayHash,
    recoveryPathsCovered: failureRecovery.complete === 1
      && failureRecovery.blocked === 2
      && failureRecovery.decisions.some(({ action }) => action === 'RECONCILE_SIGNATURE')
      && failureRecovery.decisions.some(({ action }) => action === 'RETRY')
      && failureRecovery.decisions.some(({ action }) => action === 'WAIT_FOR_APPROVAL'),
    diamondDuckReserved: BOND_REHEARSAL_TOTALS.diamondDuckBaseUnits === '2500000000000',
    earnToBurnReconciled: burnTotal.toString() === BOND_REHEARSAL_TOTALS.earnToBurnBaseUnits,
    impactCommitmentsSeparated: BOND_REHEARSAL_TOTALS.topContributorLamports === '1000000000'
      && BOND_REHEARSAL_TOTALS.conservationLamports === '100000000',
  };
  const automatedReady = Object.values(gates).every(Boolean);
  const reportCore = {
    schema: 'bond-automated-rehearsal-v1',
    campaignId: 'bond-the-duck-2026',
    mode: 'OFFLINE_BUILD_ONLY_NO_DATABASE_NO_SIGNING',
    profileCount,
    gates,
    lifecycle: {
      cycleCount: lifecycle.cycleCount,
      winnerCount: lifecycle.winnerCount,
      releaseCount: lifecycle.releaseCount,
      allocatedBaseUnits: lifecycle.allocatedBaseUnits,
      scheduledBaseUnits: lifecycle.scheduledBaseUnits,
      fingerprint: lifecycleHash,
    },
    recovery: {
      complete: failureRecovery.complete,
      actionable: failureRecovery.actionable,
      blocked: failureRecovery.blocked,
      coveredActions: [...new Set(failureRecovery.decisions.map(({ action }) => action))].sort(),
    },
    commitments: {
      ...BOND_REHEARSAL_TOTALS,
      burnMilestones,
    },
    teamBeta: {
      required: true,
      passed: false,
      scenarios: bondTeamBetaScenarios(),
    },
    onchainRehearsal: { required: true, passed: false },
    automatedReady,
    launchReady: false,
    mutationsPerformed: false,
  };
  return { ...reportCore, reportFingerprint: sha256(reportCore) };
}
