import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureCampaignProfile } from '../src/campaign/oracleIdentity.js';

test('resolves the permanent Oracle profile for a verified Telegram actor', async () => {
  const calls = [];
  const client = {
    rpc: async (fn, args) => {
      calls.push([fn, args]);
      return [{
        profile_id: '11111111-1111-4111-8111-111111111111',
        profile_state: 'provisional',
        telegram_verified: true,
      }];
    },
  };

  const identity = await ensureCampaignProfile(client, {
    campaignId: 'bond-the-duck-2026',
    telegramUserId: 42,
  });

  assert.deepEqual(calls, [[
    'ensure_project_q_campaign_profile',
    { p_campaign_id: 'bond-the-duck-2026', p_telegram_user_id: 42 },
  ]]);
  assert.deepEqual(identity, {
    profileId: '11111111-1111-4111-8111-111111111111',
    profileState: 'provisional',
    telegramVerified: true,
  });
});

test('fails closed on invalid or incomplete Oracle identity responses', async () => {
  const client = { rpc: async () => [] };
  await assert.rejects(
    () => ensureCampaignProfile(client, { campaignId: 'bond-the-duck-2026', telegramUserId: 42 }),
    /unavailable/
  );
  await assert.rejects(
    () => ensureCampaignProfile(client, { campaignId: '', telegramUserId: 42 }),
    /invalid/
  );
  await assert.rejects(
    () => ensureCampaignProfile(client, { campaignId: 'bond-the-duck-2026', telegramUserId: -1 }),
    /invalid/
  );
});
