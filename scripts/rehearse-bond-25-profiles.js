import assert from 'node:assert/strict';
import { selectCycleWinners } from '../src/campaign/winnerSelection.js';

const profiles = Array.from({ length: 25 }, (_, index) => ({
  telegramUserId: String(900000 + index),
  score: 250 - (index * 7),
  weight: (index % 3) + 1,
  eligible: true,
  admin: false,
}));

const cycles = Array.from({ length: 7 }, (_, index) => {
  const cycleId = index + 1;
  const publicSeed = `bond-the-duck-rehearsal-cycle-${cycleId}-public-seed`;
  const result = selectCycleWinners({
    campaignId: 'bond-the-duck-2026',
    cycleId,
    profiles: profiles.map((profile, profileIndex) => ({
      ...profile,
      score: profile.score + ((profileIndex * cycleId) % 17),
    })),
    publicSeed,
  });
  const replay = selectCycleWinners({
    campaignId: 'bond-the-duck-2026',
    cycleId,
    profiles: profiles.map((profile, profileIndex) => ({
      ...profile,
      score: profile.score + ((profileIndex * cycleId) % 17),
    })).reverse(),
    publicSeed,
  });
  assert.deepEqual(result, replay);
  assert.equal(result.winners.length, 5);
  assert.equal(new Set(result.winners.map(({ telegramUserId }) => telegramUserId)).size, 5);
  assert.deepEqual(result.winners.map(({ selection }) => selection), [
    'auto_top2', 'auto_top2', 'weighted_draw', 'weighted_draw', 'weighted_draw',
  ]);
  return result;
});

console.log(JSON.stringify({
  rehearsal: 'bond-the-duck-25-profile-winner-selection',
  mode: 'BUILD_ONLY_NO_DATABASE_NO_SIGNING',
  profileCount: profiles.length,
  cycleCount: cycles.length,
  deterministicReplay: true,
  cycles: cycles.map(({ cycleId, seedHash, winners, audit }) => ({ cycleId, seedHash, winners, audit })),
}, null, 2));
