import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  HOLDER_MINIMUM_USD_CENTS,
  HOLDER_PRICE_SCALE,
  evaluateHolderEligibility,
  holderEligibilityIdempotencyKey,
  recordHolderEligibility,
} from '../src/campaign/holderEligibility.js';

test('holder gate uses exact fixed-scale arithmetic at the $2 boundary', () => {
  // $0.00001000 per FAWKQ means exactly 200,000 FAWKQ is $2.
  const exact = evaluateHolderEligibility({
    balanceBaseUnits: '200000000000',
    priceUsd: '0.00001000',
    tokenAccount: '11111111111111111111111111111111',
  });
  assert.equal(exact.eligible, true);
  assert.equal(exact.minimumUsdCents, 200);
  assert.equal(exact.priceScale, HOLDER_PRICE_SCALE);

  const below = evaluateHolderEligibility({
    balanceBaseUnits: '199999999999',
    priceUsd: '0.00001000',
    tokenAccount: '11111111111111111111111111111111',
  });
  assert.equal(below.eligible, false);
});

test('holder gate requires an actual FAWKQ token account even when numeric value would pass', () => {
  const result = evaluateHolderEligibility({
    balanceBaseUnits: '999999999999999',
    priceUsd: '1',
    tokenAccount: null,
  });
  assert.equal(result.eligible, false);
});

test('holder price normalization supports scientific notation without floating-point eligibility math', () => {
  const result = evaluateHolderEligibility({
    balanceBaseUnits: '200000000000',
    priceUsd: 1e-5,
    tokenAccount: '11111111111111111111111111111111',
  });
  assert.equal(result.eligible, true);
  assert.equal(result.priceUsdScaled, '10000000');
});

test('holder eligibility idempotency binds identity, wallet, balance, price and observation time', () => {
  const input = {
    campaignId: 'bond-the-duck-2026',
    telegramUserId: 123,
    profileId: '123e4567-e89b-42d3-a456-426614174000',
    wallet: '11111111111111111111111111111111',
    balanceBaseUnits: '200000000000',
    priceUsdScaled: '10000000',
    priceScale: HOLDER_PRICE_SCALE,
    observedAt: '2026-10-01T15:00:00.000Z',
  };
  const key = holderEligibilityIdempotencyKey(input);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(holderEligibilityIdempotencyKey(input), key);
  assert.notEqual(holderEligibilityIdempotencyKey({ ...input, balanceBaseUnits: '200000000001' }), key);
});

test('holder eligibility persistence uses the service RPC with raw integer facts only', async () => {
  const calls = [];
  const client = {
    async rpc(fn, args) {
      calls.push({ fn, args });
      return [{ id: 7, eligible: true, minimum_usd_cents: HOLDER_MINIMUM_USD_CENTS }];
    },
  };
  const verification = {
    balanceBaseUnits: '200000000000',
    priceUsdScaled: '10000000',
    priceScale: HOLDER_PRICE_SCALE,
    observedAt: '2026-10-01T15:00:00.000Z',
    tokenAccount: '11111111111111111111111111111111',
  };
  const row = await recordHolderEligibility(client, {
    campaignId: 'bond-the-duck-2026',
    telegramUserId: 123,
    profileId: '123e4567-e89b-42d3-a456-426614174000',
    rewardWallet: '11111111111111111111111111111111',
    verification,
  });
  assert.equal(row.eligible, true);
  assert.equal(calls[0].fn, 'record_campaign_holder_eligibility');
  assert.equal(calls[0].args.p_balance_base_units, '200000000000');
  assert.equal(calls[0].args.p_price_usd_scaled, '10000000');
});

test('holder eligibility migration is append-only, service-only and centrally gates positive Bond XP', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920080000_bond_holder_eligibility.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /campaign_holder_eligibility_events_immutable/);
  assert.match(sql, /minimum_usd_cents integer not null default 200/);
  assert.match(sql, /participant does not satisfy the \$2 FAWKQ holder gate/);
  assert.match(sql, /before insert on public\.xp_ledger/);
  assert.match(sql, /grant execute on function public\.record_campaign_holder_eligibility/);
  assert.doesNotMatch(sql, /grant\s+.*\s+to\s+(anon|authenticated)/i);
  assert.doesNotMatch(sql, /state\s*=\s*'ACTIVE'/i);
});
