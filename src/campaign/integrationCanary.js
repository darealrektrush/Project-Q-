import assert from 'node:assert/strict';
import { ensureCampaignProfile, recordOracleWallet, validateOracleWalletEvent } from './oracleIdentity.js';
import { deliverCampaignXpAwards } from './oracleXpExport.js';

const CAMPAIGN_ID = 'bond-the-duck-2026';
const PROFILE_ID = '11111111-1111-4111-8111-111111111111';
const RECEIPT_ID = '22222222-2222-4222-8222-222222222222';
const TELEGRAM_USER_ID = 900001;
const WALLET = '7kGJBag2VcjR4JB7qLStgizLa2eDQuGtiysZKzEetRMT';
const IDEMPOTENCY_KEY = 'project-q:canary:xp-ledger:1';

function xpRow() {
  return {
    export_id: 1, profile_id: PROFILE_ID, telegram_user_id: TELEGRAM_USER_ID,
    campaign_id: CAMPAIGN_ID, cycle_id: 1, source: 'raid', mission_code: 'oracle-raids',
    campaign_score: 4, base_xp: 4, verification_state: 'verified',
    occurred_at: '2026-09-20T00:00:00.000Z', finalized_at: '2026-09-20T00:01:00.000Z',
    idempotency_key: IDEMPOTENCY_KEY, attempt_count: 0, status: 'pending',
  };
}

export async function rehearseOracleProjectQCanary() {
  const state = { identity: null, export: xpRow(), receipts: new Map(), payloads: [] };
  const client = {
    rpc: async (name, args) => {
      if (name === 'record_project_q_campaign_profile') {
        assert.deepEqual(args, {
          p_campaign_id: CAMPAIGN_ID, p_telegram_user_id: TELEGRAM_USER_ID,
          p_profile_id: PROFILE_ID, p_profile_state: 'active',
        });
        state.identity = { telegramUserId: TELEGRAM_USER_ID, profileId: PROFILE_ID };
        return [{ profile_id: PROFILE_ID }];
      }
      if (name === 'record_oracle_verified_wallet') {
        assert.equal(args.p_campaign_id, CAMPAIGN_ID);
        assert.equal(args.p_telegram_user_id, state.identity?.telegramUserId);
        state.identity.wallet = args.p_wallet_address;
        state.identity.walletVerifiedAt = args.p_verified_at;
        return [{ reward_wallet: args.p_wallet_address, wallet_verified_at: args.p_verified_at }];
      }
      throw new Error(`unexpected canary RPC: ${name}`);
    },
    select: async (table) => {
      assert.equal(table, 'campaign_xp_exports');
      return state.export.status === 'pending' ? [state.export] : [];
    },
    update: async (table, query, patch) => {
      assert.equal(table, 'campaign_xp_exports');
      assert.match(query, /export_id=eq\.1&status=eq\.pending/);
      state.export = { ...state.export, ...patch };
      return [state.export];
    },
  };

  const identity = await ensureCampaignProfile(client, {
    campaignId: CAMPAIGN_ID, telegramUserId: TELEGRAM_USER_ID,
  }, {
    env: {
      ORACLE_PROJECT_Q_IDENTITY_URL: 'https://oracle.example/platform/integrations/project-q/identity/resolve',
      ORACLE_PROJECT_Q_EVENT_SECRET: 'i'.repeat(32),
    },
    fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify({
      profile_id: PROFILE_ID, profile_state: 'active', telegram_verified: true,
    }) }),
  });
  const walletEvent = validateOracleWalletEvent({
    telegram_user_id: TELEGRAM_USER_ID, wallet_address: WALLET,
    verified_at: '2026-09-20T00:00:30.000Z',
  });
  const wallet = await recordOracleWallet(client, walletEvent, CAMPAIGN_ID);

  const fetchImpl = async (_url, options) => {
    const payload = JSON.parse(options.body);
    state.payloads.push(payload);
    assert.equal(payload.profile_id, identity.profileId);
    assert.equal(payload.telegram_user_id, TELEGRAM_USER_ID);
    assert.equal(payload.idempotency_key, IDEMPOTENCY_KEY);
    assert.deepEqual(Object.keys(payload).sort(), [
      'base_xp', 'campaign_id', 'campaign_score', 'cycle_id', 'finalized_at',
      'idempotency_key', 'mission_code', 'occurred_at', 'profile_id', 'source',
      'telegram_user_id', 'verification_state',
    ].sort());
    const duplicate = state.receipts.has(payload.idempotency_key);
    state.receipts.set(payload.idempotency_key, RECEIPT_ID);
    return { ok: true, text: async () => JSON.stringify({
      ok: true, status: duplicate ? 'duplicate' : 'accepted', receipt_id: RECEIPT_ID,
    }) };
  };
  const env = {
    PROJECT_Q_ORACLE_XP_EXPORT_ENABLED: 'true',
    ORACLE_PROJECT_Q_XP_URL: 'https://oracle.example/project-q/xp-awards',
    ORACLE_PROJECT_Q_XP_SECRET: 's'.repeat(32),
  };
  const now = new Date('2026-09-20T00:05:00.000Z');
  const first = await deliverCampaignXpAwards(client, env, { fetchImpl, now });
  state.export = { ...xpRow(), attempt_count: state.export.attempt_count };
  const replay = await deliverCampaignXpAwards(client, env, { fetchImpl, now });

  assert.deepEqual(first, { delivered: 1, retried: 0, deadLettered: 0, disabled: false });
  assert.deepEqual(replay, { delivered: 1, retried: 0, deadLettered: 0, disabled: false });
  assert.equal(state.receipts.size, 1);
  assert.equal(state.export.oracle_receipt_id, RECEIPT_ID);
  assert.equal(wallet.reward_wallet, WALLET);

  return {
    canary: 'oracle-project-q-campaign-loop', mode: 'IN_MEMORY_NO_WRITES_NO_FUNDS',
    campaignId: CAMPAIGN_ID, profileId: PROFILE_ID,
    checks: {
      canonicalProfileResolved: true, oracleWalletFactAccepted: true,
      boundedXpPayloadDelivered: true, oracleReceiptRecorded: true,
      replayReturnedOriginalReceipt: true,
      duplicatePermanentXpPrevented: state.receipts.size === 1,
    },
    payloadCount: state.payloads.length, permanentReceiptCount: state.receipts.size,
    fundsMoved: false, featureFlagsChanged: false,
  };
}
