import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCycleWinners } from '../src/campaign/winnerSelection.js';

const profiles = Array.from({ length: 25 }, (_, index) => ({
  telegramUserId: String(1000 + index),
  score: 100 - index,
  weight: (index % 3) + 1,
  eligible: true,
  admin: false,
}));

function select(overrides = {}) {
  return selectCycleWinners({
    campaignId: 'bond-the-duck-2026',
    cycleId: 1,
    profiles,
    publicSeed: 'public-commit-reveal-and-blockhash-seed',
    ...overrides,
  });
}

test('selects top two plus exactly three unique weighted-draw winners', () => {
  const result = select();
  assert.equal(result.winners.length, 5);
  assert.deepEqual(result.winners.slice(0, 2).map(({ telegramUserId }) => telegramUserId), ['1000', '1001']);
  assert.deepEqual(result.winners.map(({ selection }) => selection), [
    'auto_top2', 'auto_top2', 'weighted_draw', 'weighted_draw', 'weighted_draw',
  ]);
  assert.equal(new Set(result.winners.map(({ telegramUserId }) => telegramUserId)).size, 5);
  assert.equal(result.audit.length, 3);
});

test('selection is reproducible and independent of input order', () => {
  assert.deepEqual(select(), select({ profiles: [...profiles].reverse() }));
  assert.notDeepEqual(
    select().winners.map(({ telegramUserId }) => telegramUserId),
    select({ publicSeed: 'different-public-commit-reveal-seed' }).winners.map(({ telegramUserId }) => telegramUserId),
  );
});

test('excludes admins and ineligible profiles from every winner lane', () => {
  const candidates = profiles.map((profile, index) => ({
    ...profile,
    admin: index === 0,
    eligible: index !== 1,
  }));
  const result = select({ profiles: candidates });
  assert.ok(!result.winners.some(({ telegramUserId }) => ['1000', '1001'].includes(telegramUserId)));
  assert.deepEqual(result.winners.slice(0, 2).map(({ telegramUserId }) => telegramUserId), ['1002', '1003']);
});

test('ties use stable Telegram identity ordering', () => {
  const candidates = profiles.map((profile, index) => index < 3 ? { ...profile, score: 500 } : profile);
  assert.deepEqual(select({ profiles: candidates }).winners.slice(0, 2).map(({ telegramUserId }) => telegramUserId), ['1000', '1001']);
});

test('fails closed on duplicates, too few candidates, or insufficient weighted profiles', () => {
  assert.throws(() => select({ profiles: [...profiles, profiles[0]] }), /duplicate/);
  assert.throws(() => select({ profiles: profiles.slice(0, 4) }), /five eligible/);
  assert.throws(() => select({ profiles: profiles.map((profile, index) => ({
    ...profile,
    weight: index < 4 ? 1 : 0,
  })) }), /three weighted/);
});
