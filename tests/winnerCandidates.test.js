import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCycleWinnerCandidateSnapshot,
  planWeightOnlyCycleSelection,
} from '../src/campaign/winnerCandidates.js';

const xpRows = Array.from({ length: 20 }, (_, index) => ({
  telegram_user_id: String(1000 + index),
  xp: 200 - index,
}));
const identityRows = xpRows.map(({ telegram_user_id }, index) => ({
  telegram_user_id,
  profile_id: `123e4567-e89b-42d3-a456-${String(426614174000 + index).padStart(12, '0')}`,
  reward_wallet: `wallet-${telegram_user_id}`,
  x_verified_at: '2026-10-01T00:00:00Z',
  wallet_verified_at: '2026-10-01T00:00:00Z',
}));
const holderRows = xpRows.map(({ telegram_user_id }, index) => ({
  id: index + 1,
  telegram_user_id,
  reward_wallet: `wallet-${telegram_user_id}`,
  eligible: true,
  observed_at: '2026-10-02T00:00:00Z',
}));
const closedCycle = {
  cycle_id: 2,
  opens_at: '2026-10-03T15:00:00Z',
  closes_at: '2026-10-05T15:00:00Z',
  cutoff_slot: 123456789,
  cutoff_blockhash: 'blockhash-verified-public',
  commit_hash: 'a'.repeat(64),
  reveal_value: 'revealed-public-randomness',
  fallback_used: false,
};

const drawFinalization = {
  public_seed: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  fallback_used: false,
  finalized_at: '2026-10-05T15:10:00Z',
};

const positionRows = xpRows.map(({ telegram_user_id }, index) => ({
  reward_wallet: `wallet-${telegram_user_id}`,
  tier: index % 2 ? 1 : 2,
  weight: index % 2 ? 1 : 3,
  eligible: true,
  net_buy_lamports: index % 2 ? 70000000 : 200000000,
}));

function snapshot(overrides = {}) {
  return buildCycleWinnerCandidateSnapshot({
    campaignId: 'bond-the-duck-2026',
    cycleId: 2,
    cycle: closedCycle,
    drawFinalization,
    snapshotAt: '2026-10-06T00:00:00Z',
    xpRows,
    identityRows,
    holderRows,
    positionRows,
    founderRows: [],
    priorWinnerRows: [],
    excludedTelegramIds: [],
    ...overrides,
  });
}

test('winner snapshot joins XP, identity, holder gate and Buy-to-Earn weight', () => {
  const result = snapshot();
  assert.equal(result.candidateCount, 20);
  assert.equal(result.eligibleCount, 20);
  assert.equal(result.top15Count, 15);
  assert.equal(result.weightedTop15Count, 13);
  assert.equal(result.top15[0].telegramUserId, '1000');
  assert.equal(result.top15[0].buyToEarnWeight, 3);
  assert.equal(result.selectionPreconditions.fiveEligibleProfiles, true);
  assert.equal(result.selectionPreconditions.threeWeightedProfilesInRanks3To15, true);
});

test('founders, configured admins, failed holder gate and prior winners are excluded', () => {
  const holders = holderRows.map((row) => row.telegram_user_id === '1004'
    ? { ...row, eligible: false }
    : row);
  const identities = identityRows.map((row) => row.telegram_user_id === '1005'
    ? { ...row, x_verified_at: null }
    : row);
  const result = snapshot({
    holderRows: holders,
    identityRows: identities,
    founderRows: [{ founder_user_id: 1000 }],
    priorWinnerRows: [{ telegram_user_id: 1001 }],
    excludedTelegramIds: ['1002', '1003'],
  });

  for (const id of ['1000','1001','1002','1003','1004','1005']) {
    assert.equal(result.candidates.find(({ telegramUserId }) => telegramUserId === id).eligible, false);
  }
  assert.equal(result.cooldownIds.includes('1001'), true);
  assert.equal(result.top15[0].telegramUserId, '1006');
});

test('latest holder observation wins deterministically', () => {
  const rows = [
    ...holderRows,
    {
      id: 999,
      telegram_user_id: '1000',
      reward_wallet: 'wallet-1000',
      eligible: false,
      observed_at: '2026-10-03T00:00:00Z',
    },
  ];
  const result = snapshot({ holderRows: rows });
  const candidate = result.candidates.find(({ telegramUserId }) => telegramUserId === '1000');
  assert.equal(candidate.holderEligible, false);
  assert.equal(candidate.holderObservedAt, '2026-10-03T00:00:00Z');
});

test('weight-only selection uses Buy-to-Earn position weights and corrected Top 15 selector', () => {
  const result = snapshot();
  const selection = planWeightOnlyCycleSelection(result, {
    buyToEarnMode: 'WEIGHT_ONLY',
    publicSeed: drawFinalization.public_seed,
  });
  assert.equal(selection.winners.length, 5);
  assert.deepEqual(selection.winners.slice(0,2).map(({ telegramUserId }) => telegramUserId), ['1000','1001']);
  const top15Ids = new Set(result.top15.slice(2).map(({ telegramUserId }) => telegramUserId));
  assert.ok(selection.winners.slice(2).every(({ telegramUserId }) => top15Ids.has(telegramUserId)));
});

test('selection remains blocked until cycle close and cutoff evidence are present', () => {
  const beforeClose = snapshot({ snapshotAt: '2026-10-05T14:59:59Z' });
  assert.equal(beforeClose.selectionEvidenceReady, false);
  assert.throws(
    () => planWeightOnlyCycleSelection(beforeClose, {
      buyToEarnMode: 'WEIGHT_ONLY',
      publicSeed: drawFinalization.public_seed,
    }),
    /cutoff and public draw evidence/
  );

  const noCutoff = snapshot({
    cycle: { ...closedCycle, cutoff_slot: null, cutoff_blockhash: null },
  });
  assert.equal(noCutoff.selectionEvidenceReady, false);
});

test('selection seed must match the append-only finalized draw seed', () => {
  const result = snapshot();
  assert.equal(result.publicSeed, drawFinalization.public_seed);
  assert.throws(
    () => planWeightOnlyCycleSelection(result, {
      buyToEarnMode: 'WEIGHT_ONLY',
      publicSeed: 'a'.repeat(64),
    }),
    /must match finalized draw evidence/
  );
});

test('selection remains blocked until final rules explicitly choose weight-only mode', () => {
  const result = snapshot();
  assert.throws(
    () => planWeightOnlyCycleSelection(result, {
      buyToEarnMode: 'SEPARATE_POOL',
      publicSeed: drawFinalization.public_seed,
    }),
    /finalized WEIGHT_ONLY/
  );
  assert.throws(
    () => planWeightOnlyCycleSelection(result, {
      publicSeed: 'verified-public-draw-seed-12345',
    }),
    /finalized WEIGHT_ONLY/
  );
});

test('selection preconditions fail when fewer than three weighted profiles remain in ranks 3–15', () => {
  const positions = positionRows.map((row, index) => ({
    ...row,
    weight: index < 4 ? 1 : 0,
    eligible: index < 4,
  }));
  const result = snapshot({ positionRows: positions });
  assert.equal(result.selectionPreconditions.threeWeightedProfilesInRanks3To15, false);
  assert.throws(
    () => planWeightOnlyCycleSelection(result, {
      buyToEarnMode: 'WEIGHT_ONLY',
      publicSeed: 'verified-public-draw-seed-12345',
    }),
    /preconditions/
  );
});
