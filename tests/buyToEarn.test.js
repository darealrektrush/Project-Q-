import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BUY_TO_EARN_TIER_1_LAMPORTS,
  BUY_TO_EARN_TIER_2_LAMPORTS,
  ingestOracleBuyToEarnTrade,
  validateOracleBuyToEarnTradeEvent,
} from '../src/campaign/buyToEarn.js';
import { oracleBuyToEarnTradeEventsEnabled } from '../src/lib/featureFlags.js';

const VALID = {
  telegram_user_id: 123456789,
  profile_id: '123e4567-e89b-42d3-a456-426614174000',
  wallet_address: '11111111111111111111111111111111',
  source_event_id: 'oracle-trade:12345678',
  tx_signature: '1'.repeat(64),
  slot: 123456789,
  block_time: '2026-10-02T15:00:00.000Z',
  direction: 'buy',
  sol_lamports: '70000000',
  token_base_units: '1234567890',
  venue_key: 'pump_swap',
  route: 'PumpSwap direct',
};

test('Buy-to-Earn locks the published 0.07 / 0.20 SOL tier thresholds as lamports', () => {
  assert.equal(BUY_TO_EARN_TIER_1_LAMPORTS, 70_000_000n);
  assert.equal(BUY_TO_EARN_TIER_2_LAMPORTS, 200_000_000n);
});

test('Oracle Buy-to-Earn trade validation preserves integer financial values', () => {
  const event = validateOracleBuyToEarnTradeEvent(VALID);
  assert.equal(event.telegramUserId, 123456789);
  assert.equal(event.direction, 'BUY');
  assert.equal(event.solLamports, '70000000');
  assert.equal(event.tokenBaseUnits, '1234567890');
  assert.equal(event.venueKey, 'pump_swap');
  assert.equal(event.blockTime, '2026-10-02T15:00:00.000Z');
});

test('Oracle Buy-to-Earn trade validation fails closed on malformed identity and financial evidence', () => {
  for (const patch of [
    { telegram_user_id: 0 },
    { profile_id: 'not-a-profile' },
    { wallet_address: 'bad' },
    { source_event_id: 'tiny' },
    { tx_signature: 'bad' },
    { slot: 0 },
    { block_time: 'not-a-date' },
    { direction: 'transfer' },
    { sol_lamports: '0' },
    { token_base_units: '-1' },
    { venue_key: 'INVALID VENUE' },
    { route: 'x'.repeat(241) },
  ]) {
    assert.throws(
      () => validateOracleBuyToEarnTradeEvent({ ...VALID, ...patch }),
      /invalid /
    );
  }
});

test('Buy-to-Earn ingestion delegates one normalized fact to the atomic service-role RPC', async () => {
  const calls = [];
  const client = {
    async rpc(fn, args) {
      calls.push({ fn, args });
      return [{ eventId: 7, netBuyLamports: '70000000', tier: 1, weight: 1, eligible: true }];
    },
  };
  const event = validateOracleBuyToEarnTradeEvent(VALID);
  const result = await ingestOracleBuyToEarnTrade(client, event, 'bond-the-duck-2026');
  assert.equal(result.eventId, 7);
  assert.deepEqual(calls, [{
    fn: 'ingest_campaign_buy_to_earn_trade',
    args: {
      p_campaign_id: 'bond-the-duck-2026',
      p_telegram_user_id: 123456789,
      p_profile_id: VALID.profile_id,
      p_reward_wallet: VALID.wallet_address,
      p_source_event_id: VALID.source_event_id,
      p_tx_signature: VALID.tx_signature,
      p_slot: VALID.slot,
      p_block_time: VALID.block_time,
      p_direction: 'BUY',
      p_sol_lamports: '70000000',
      p_token_base_units: '1234567890',
      p_venue_key: 'pump_swap',
      p_route: 'PumpSwap direct',
    },
  }]);
});

test('Buy-to-Earn trade bridge remains disabled unless explicitly enabled', () => {
  assert.equal(oracleBuyToEarnTradeEventsEnabled({}), false);
  assert.equal(oracleBuyToEarnTradeEventsEnabled({ PROJECT_Q_ORACLE_TRADE_EVENTS_ENABLED: 'false' }), false);
  assert.equal(oracleBuyToEarnTradeEventsEnabled({ PROJECT_Q_ORACLE_TRADE_EVENTS_ENABLED: 'true' }), true);
});

test('Buy-to-Earn migration is append-only, identity-bound, market-gated and does not allocate rewards', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920050000_campaign_buy_to_earn_engine.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /campaign_buy_to_earn_events is append-only/);
  assert.match(sql, /identity_row\.profile_id is distinct from p_profile_id/);
  assert.match(sql, /identity_row\.reward_wallet is distinct from p_reward_wallet/);
  assert.match(sql, /Buy-to-Earn venue is not approved/);
  assert.match(sql, /net_lamports >= 200000000/);
  assert.match(sql, /net_lamports >= 70000000/);
  assert.match(sql, /unique \(campaign_id, tx_signature\)/);
  assert.match(sql, /grant execute on function public\.ingest_campaign_buy_to_earn_trade/);
  assert.doesNotMatch(sql, /grant\s+.*\s+to\s+(anon|authenticated)/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.allocations/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.releases/i);
  assert.doesNotMatch(sql, /treasury_transactions/i);
});

test('Render blueprint keeps Buy-to-Earn trade mutations off by default', async () => {
  const yaml = await readFile(new URL('../render.yaml', import.meta.url), 'utf8');
  assert.match(yaml, /PROJECT_Q_ORACLE_TRADE_EVENTS_ENABLED[\s\S]*value: "false"/);
});
