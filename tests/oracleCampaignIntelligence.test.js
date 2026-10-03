import test from 'node:test';
import assert from 'node:assert/strict';
import { oracleCampaignIntelligenceHandler } from '../src/campaign/oracleCampaignIntelligence.js';

function response() {
  return {
    headers: {},
    set(k, v) { this.headers[k] = v; return this; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

const req = (body, secret = 'server-secret') => ({
  body,
  get: () => secret,
});

test('campaign intelligence requires the Oracle bridge secret before reading Q state', async () => {
  let reads = 0;
  const handler = oracleCampaignIntelligenceHandler({
    secret: 'server-secret',
    getCampaignIntelligence: async () => { reads += 1; return {}; },
  });
  const res = response();
  await handler(req({ campaign_id: 'bond-the-duck-2026' }, 'wrong'), res);
  assert.equal(res.code, 401);
  assert.equal(reads, 0);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('campaign intelligence accepts only one bounded campaign selector', async () => {
  const handler = oracleCampaignIntelligenceHandler({
    secret: 'server-secret',
    getCampaignIntelligence: async () => assert.fail('must not read'),
  });

  for (const body of [
    {},
    { campaign_id: '../bad' },
    { campaign_id: 7 },
    { campaign_id: 'bond-the-duck-2026', telegram_user_id: 7 },
  ]) {
    const res = response();
    await handler(req(body), res);
    assert.equal(res.code, 400);
  }
});

test('campaign intelligence returns the aggregate Project Q projection unchanged', async () => {
  const aggregate = {
    campaign_id: 'bond-the-duck-2026',
    campaign_state: 'ACTIVE',
    generated_at: '2026-09-25T08:00:00Z',
    identity: { enrolled: 10, x_verified: 8, wallet_verified: 7, token_account_ready: 6 },
    xp: { participants: 8, total: 320, awards: 42 },
    raid_evidence: { credited: 15, pending: 2, rejected_or_capped: 1 },
    participation_evidence: {
      votes_credited: 20,
      votes_pending: 3,
      votes_rejected_or_capped: 2,
      trending_credited: 12,
      trending_pending: 1,
      trending_rejected_or_capped: 4,
    },
    buy_to_earn: { tracked_positions: 8, eligible_positions: 4 },
    rewards: {
      allocations: 5,
      allocated_base_units: '1500000000',
      releases: 10,
      paid_releases: 2,
    },
  };

  let requested;
  const handler = oracleCampaignIntelligenceHandler({
    secret: 'server-secret',
    getCampaignIntelligence: async campaignId => {
      requested = campaignId;
      return aggregate;
    },
  });

  const res = response();
  await handler(req({ campaign_id: 'bond-the-duck-2026' }), res);
  assert.equal(res.code, 200);
  assert.equal(requested, 'bond-the-duck-2026');
  assert.deepEqual(res.body, { ok: true, intelligence: aggregate });
  assert.doesNotMatch(JSON.stringify(res.body), /telegram_user_id|reward_wallet|x_user_id/i);
});

test('campaign intelligence fails closed on upstream errors and identity mismatch', async () => {
  for (const getCampaignIntelligence of [
    async () => { throw new Error('private database detail'); },
    async () => ({ campaign_id: 'other', campaign_state: 'ACTIVE' }),
  ]) {
    const res = response();
    await oracleCampaignIntelligenceHandler({
      secret: 'server-secret',
      getCampaignIntelligence,
    })(req({ campaign_id: 'bond-the-duck-2026' }), res);
    assert.equal(res.code, 503);
    assert.doesNotMatch(JSON.stringify(res.body), /private database detail/);
  }
});
