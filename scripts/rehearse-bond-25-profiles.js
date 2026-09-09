import { rehearseBondLifecycle } from '../src/campaign/lifecycleRehearsal.js';

const profiles = Array.from({ length: 25 }, (_, index) => ({
  telegramUserId: String(900000 + index),
  score: 250 - (index * 7),
  weight: (index % 3) + 1,
  eligible: true,
  admin: false,
}));

// Test-only balanced fixture. Production remains blocked until founders explicitly
// approve the five cycle pool amounts in the final ruleset.
const cyclePoolBaseUnits = Array(5).fill('3000000000000');
const publicSeeds = Array.from({ length: 5 }, (_, index) =>
  `bond-the-duck-rehearsal-cycle-${index + 1}-public-seed`);
const rehearsal = rehearseBondLifecycle({
  profiles,
  cyclePoolBaseUnits,
  publicSeeds,
  activeOpensAt: '2026-10-01T15:00:00.000Z',
  postReviewClearedAt: '2026-10-17T15:00:00.000Z',
  recoveryObservedAt: '2026-10-17T16:00:00.000Z',
  retryIntervalsSeconds: [60, 300, 900],
  maxAttempts: 4,
});

console.log(JSON.stringify({
  rehearsal: 'bond-the-duck-complete-lifecycle',
  mode: rehearsal.mode,
  profileCount: rehearsal.profileCount,
  cycleCount: rehearsal.cycleCount,
  winnerCount: rehearsal.winnerCount,
  releaseCount: rehearsal.releaseCount,
  allocatedBaseUnits: rehearsal.allocatedBaseUnits,
  scheduledBaseUnits: rehearsal.scheduledBaseUnits,
  deterministicReplay: true,
  cyclePoolPolicy: 'TEST_ONLY_BALANCED_FIXTURE_NOT_PRODUCTION_RULES',
  recovery: {
    complete: rehearsal.recovery.complete,
    actionable: rehearsal.recovery.actionable,
    blocked: rehearsal.recovery.blocked,
  },
  cycles: rehearsal.cycles.map(({ cycleId, poolBaseUnits, selection }) => ({
    cycleId, poolBaseUnits, seedHash: selection.seedHash, winners: selection.winners, audit: selection.audit,
  })),
}, null, 2));
