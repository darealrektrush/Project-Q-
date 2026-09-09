import test from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, PublicKey } from '@solana/web3.js';
import { rehearseBondLifecycle } from '../src/campaign/lifecycleRehearsal.js';
import { buildLifecycleMaterializationPlan } from '../src/campaign/materializationPlan.js';

const profiles = Array.from({ length: 25 }, (_, index) => ({
  telegramUserId: String(900000 + index), score: 250 - (index * 7),
  weight: (index % 3) + 1, eligible: true, admin: false,
}));
const wallets = Object.fromEntries(profiles.map(({ telegramUserId }) => [
  telegramUserId, Keypair.generate().publicKey.toBase58(),
]));
const lifecycle = rehearseBondLifecycle({
  profiles,
  cyclePoolBaseUnits: Array(5).fill('3000000000000'),
  publicSeeds: Array.from({ length: 5 }, (_, index) => `materialization-public-seed-${index + 1}`),
  activeOpensAt: '2026-10-01T15:00:00.000Z',
  postReviewClearedAt: '2026-10-17T15:00:00.000Z',
  recoveryObservedAt: '2026-10-17T16:00:00.000Z',
  retryIntervalsSeconds: [60, 300, 900], maxAttempts: 4,
});

function build(overrides = {}) {
  return buildLifecycleMaterializationPlan({ lifecycle, walletsByTelegramUserId: wallets, ...overrides });
}

test('builds a database-shaped plan for all 25 winners and 175 releases', () => {
  const plan = build();
  assert.equal(plan.mode, 'BUILD_ONLY_NO_DATABASE_NO_SIGNING');
  assert.equal(plan.expectedCampaignState, 'VERIFYING');
  assert.equal(plan.winnerRows.length, 25);
  assert.equal(plan.allocationRows.length, 25);
  assert.equal(plan.releaseRows.length, 175);
  assert.equal(plan.allocatedBaseUnits, '15000000000000');
  assert.equal(plan.scheduledBaseUnits, plan.allocatedBaseUnits);
  assert.match(plan.planHash, /^[0-9a-f]{64}$/);
  assert.equal(new Set(plan.releaseRows.map(({ payment_key }) => payment_key)).size, 175);
});

test('materialization is deterministic for identical verified inputs', () => {
  assert.deepEqual(build(), build());
});

test('binds every allocation to the selected identity and a verified wallet', () => {
  const plan = build({ calcVersion: 4, manifestVersion: 2 });
  for (const row of plan.allocationRows) {
    assert.equal(row.reward_wallet, wallets[row.telegram_user_id]);
    assert.equal(row.calc_version, 4);
    assert.equal(row.manifest_version, 2);
    assert.equal(row.eligibility_status, 'FINAL_VERIFIED');
  }
});

test('fails closed on missing or off-curve reward wallets', () => {
  const selected = lifecycle.cycles[0].selection.winners[0].telegramUserId;
  const missing = { ...wallets };
  delete missing[selected];
  assert.throws(() => build({ walletsByTelegramUserId: missing }), /verified reward wallet/);
  const [offCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('materialization-test')], Keypair.generate().publicKey
  );
  assert.throws(() => build({ walletsByTelegramUserId: {
    ...wallets, [selected]: offCurve.toBase58(),
  } }), /verified reward wallet/);
});

test('rejects incomplete or non-build-only lifecycle input', () => {
  assert.throws(() => buildLifecycleMaterializationPlan({
    lifecycle: { ...lifecycle, mode: 'LIVE' }, walletsByTelegramUserId: wallets,
  }), /build-only lifecycle/);
  assert.throws(() => buildLifecycleMaterializationPlan({
    lifecycle: { ...lifecycle, releaseCount: 174 }, walletsByTelegramUserId: wallets,
  }), /complete Bond campaign contract/);
});
