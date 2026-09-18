import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureCampaignProfile,
  recordOracleWallet,
  validateOracleWalletEvent,
} from '../src/campaign/oracleIdentity.js';

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

test('accepts only a bounded Oracle wallet fact and records a campaign reference', async () => {
  const event = validateOracleWalletEvent({
    telegram_user_id: 42,
    wallet_address: '7kGJBag2VcjR4JB7qLStgizLa2eDQuGtiysZKzEetRMT',
    verified_at: '2026-09-18T08:00:00Z',
  });
  const calls = [];
  const client = { rpc: async (...args) => {
    calls.push(args);
    return [{ reward_wallet: event.walletAddress, wallet_verified_at: event.verifiedAt }];
  } };
  const recorded = await recordOracleWallet(client, event, 'bond-the-duck-2026');
  assert.equal(recorded.reward_wallet, event.walletAddress);
  assert.deepEqual(calls, [[
    'record_oracle_verified_wallet',
    {
      p_campaign_id: 'bond-the-duck-2026',
      p_telegram_user_id: 42,
      p_wallet_address: event.walletAddress,
      p_verified_at: event.verifiedAt,
    },
  ]]);
});

test('rejects wallet events with extra fields or invalid ownership facts', () => {
  assert.throws(() => validateOracleWalletEvent({
    telegram_user_id: 42,
    wallet_address: 'bad',
    verified_at: '2026-09-18T08:00:00Z',
  }), /invalid/);
  assert.throws(() => validateOracleWalletEvent({
    telegram_user_id: 42,
    wallet_address: '7kGJBag2VcjR4JB7qLStgizLa2eDQuGtiysZKzEetRMT',
    verified_at: '2026-09-18T08:00:00Z',
    profile_id: 'caller-controlled',
  }), /invalid/);
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
