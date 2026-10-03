import test from 'node:test';
import assert from 'node:assert/strict';
import { universeCampaignProfileHandler } from '../src/campaign/universeCampaignProfile.js';

const PROFILE_ID = '4def29fe-41a9-4c6a-9371-1a27c652588f';

function response() {
  return {
    headers: {},
    set(k, v) { this.headers[k] = v; return this; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function req(body, secret = 'universe-secret', campaignId = 'bond-the-duck-2026') {
  return {
    body,
    params: { campaignId },
    get: () => secret,
  };
}

test('Universe campaign profile requires backend auth before Q reads', async () => {
  let reads = 0;
  const handler = universeCampaignProfileHandler({
    secret: 'universe-secret',
    enabled: true,
    getParticipantStatusByProfile: async () => { reads += 1; return {}; },
  });
  const res = response();
  await handler(req({ profile_id: PROFILE_ID }, 'wrong'), res);
  assert.equal(res.code, 401);
  assert.equal(reads, 0);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
});

test('Universe campaign profile is disabled by default', async () => {
  const handler = universeCampaignProfileHandler({
    secret: 'universe-secret',
    getParticipantStatusByProfile: async () => assert.fail('must not read'),
  });
  const res = response();
  await handler(req({ profile_id: PROFILE_ID }), res);
  assert.equal(res.code, 503);
});

test('Universe campaign profile rejects unsafe campaign and identity selectors', async () => {
  const handler = universeCampaignProfileHandler({
    secret: 'universe-secret',
    enabled: true,
    getParticipantStatusByProfile: async () => assert.fail('must not read'),
  });

  for (const [body, campaignId, code] of [
    [{}, 'bond-the-duck-2026', 400],
    [{ profile_id: '../bad' }, 'bond-the-duck-2026', 400],
    [{ profile_id: PROFILE_ID, telegram_user_id: 7 }, 'bond-the-duck-2026', 400],
    [{ profile_id: PROFILE_ID }, 'other-campaign', 404],
  ]) {
    const res = response();
    await handler(req(body, 'universe-secret', campaignId), res);
    assert.equal(res.code, code);
  }
});

test('Universe gets the same Q campaign state without private identity fields', async () => {
  const handler = universeCampaignProfileHandler({
    secret: 'universe-secret',
    enabled: true,
    now: () => new Date('2026-09-25T09:00:00Z'),
    getParticipantStatusByProfile: async profileId => ({
      profileId,
      enrolled: true,
      enrolledAt: '2026-09-01T00:00:00Z',
      xVerified: true,
      walletVerified: true,
      campaignReady: true,
      holderEligible: true,
      rewardEligible: true,
      totalXp: 120,
      todayXp: 12,
      todayXpByBucket: { participation: 4, mission: 8 },
      xpByBucket: { participation: 40, mission: 80 },
      recentActivity: [{
        id: 999,
        cycleId: 1,
        source: 'mission',
        bucket: 'mission',
        amount: 8,
        missionCode: 'bond_daily',
        awardedAt: '2026-09-25T08:00:00Z',
      }],
      completedMissionCodes: ['bond_daily'],
      completedMissionCount: 1,
      allocationBaseUnits: '1000000000',
      allocationByCategory: { activity: '1000000000' },
      rewardWallet: 'PRIVATE_WALLET',
      fawkqTokenAccount: 'PRIVATE_TOKEN_ACCOUNT',
      rewards: {
        recorded: true,
        allocatedBaseUnits: '1000000000',
        scheduledBaseUnits: '750000000',
        distributedBaseUnits: '250000000',
        failedBaseUnits: '0',
        releaseCount: 2,
        receiptCount: 1,
        releases: [{
          category: 'activity',
          cycleId: 1,
          percent: 25,
          scheduledAt: '2026-09-25T00:00:00Z',
          amountBaseUnits: '250000000',
          status: 'paid',
          paymentKey: 'PRIVATE_PAYMENT_KEY',
          transactionSignature: '4'.repeat(64),
          confirmedBlockTime: '2026-09-25T01:00:00Z',
          reconciliationStatus: 'confirmed',
        }],
      },
      buyToEarn: {
        eligible_bought_base_units: '100',
        eligible_sold_base_units: '0',
        net_buy_lamports: 1234,
        tier: 1,
        weight: 1,
        snapshot_usd: '10.25',
        eligible: true,
        reward_wallet: 'PRIVATE_WALLET',
      },
      campaignState: 'ACTIVE',
    }),
  });

  const res = response();
  await handler(req({ profile_id: PROFILE_ID }), res);
  assert.equal(res.code, 200);
  assert.equal(res.body.profile.profileId, PROFILE_ID);
  assert.equal(res.body.profile.campaignState, 'ACTIVE');
  assert.equal(res.body.profile.totalXp, 120);
  assert.equal(res.body.profile.rewards.distributedBaseUnits, '250000000');
  assert.equal(res.body.profile.observedAt, '2026-09-25T09:00:00.000Z');
  assert.doesNotMatch(
    JSON.stringify(res.body),
    /telegram_user_id|PRIVATE_WALLET|PRIVATE_TOKEN_ACCOUNT|PRIVATE_PAYMENT_KEY|rewardWallet|tokenAccount/i
  );
});

test('Universe campaign profile reports enrollment state without fabricating outage data', async () => {
  const handler = universeCampaignProfileHandler({
    secret: 'universe-secret',
    enabled: true,
    getParticipantStatusByProfile: async profileId => ({
      profileId,
      enrolled: false,
      xVerified: false,
      walletVerified: false,
      campaignReady: false,
      holderEligible: false,
      rewardEligible: false,
      totalXp: 0,
      todayXp: 0,
      rewards: { recorded: false, releases: [] },
      campaignState: 'ACTIVE',
    }),
  });
  const res = response();
  await handler(req({ profile_id: PROFILE_ID }), res);
  assert.equal(res.code, 200);
  assert.equal(res.body.profile.enrolled, false);
  assert.deepEqual(res.body.profile.campaignReadiness, {
    state: 'not_enrolled',
    missingRequirements: ['campaign enrollment'],
  });

  const unavailable = response();
  await universeCampaignProfileHandler({
    secret: 'universe-secret',
    enabled: true,
    getParticipantStatusByProfile: async () => ({ profileId: PROFILE_ID, unavailable: true }),
  })(req({ profile_id: PROFILE_ID }), unavailable);
  assert.equal(unavailable.code, 503);
});
