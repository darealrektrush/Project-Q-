import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildReferralLink,
  captureReferral,
  evaluateReferralQualification,
  getReferralProfile,
  getOrCreateReferralCode,
  parseReferralPayload,
  refreshReferralQualification,
  summarizeReferrals,
} from '../src/campaign/referrals.js';

test('personal referral links use opaque Telegram start payloads', () => {
  assert.equal(parseReferralPayload('ref_abcd1234efgh'), 'abcd1234efgh');
  assert.equal(parseReferralPayload('home'), null);
  assert.equal(buildReferralLink('abcd1234efgh', '@project_q_bot'),
    'https://t.me/project_q_bot?start=ref_abcd1234efgh');
});

test('referral code creation is stable per campaign participant', async () => {
  const inserted = [];
  const client = {
    select: async () => inserted,
    insert: async (_table, rows) => {
      inserted.push({ code: rows[0].code, created_at: '2026-08-25T00:00:00Z' });
      return inserted;
    },
  };
  const first = await getOrCreateReferralCode(client, 123, {
    id: 'bond-the-duck-2026', codeFactory: () => 'abcd1234efgh', botUsername: 'project_q_bot',
  });
  const second = await getOrCreateReferralCode(client, 123, {
    id: 'bond-the-duck-2026', codeFactory: () => 'unusedcode99', botUsername: 'project_q_bot',
  });
  assert.equal(first.code, 'abcd1234efgh');
  assert.equal(second.code, first.code);
  assert.equal(first.link, 'https://t.me/project_q_bot?start=ref_abcd1234efgh');
});

test('referral capture delegates first-touch and self-referral rules to one atomic RPC', async () => {
  const calls = [];
  const client = { rpc: async (fn, args) => { calls.push([fn, args]); return { id: 1 }; } };
  await captureReferral(client, 'ref_abcd1234efgh', 456, { id: 'bond-the-duck-2026' });
  assert.deepEqual(calls, [['capture_campaign_referral', {
    p_campaign_id: 'bond-the-duck-2026',
    p_referral_code: 'abcd1234efgh',
    p_referred_user_id: '456',
  }]]);
});

test('referral qualification requires identity, a post-referral $2 purchase and later verified XP', () => {
  const result = evaluateReferralQualification({
    referral: { accepted_at: '2026-08-25T00:00:00Z' },
    identity: { x_verified_at: '2026-08-25T00:05:00Z', wallet_verified_at: '2026-08-25T00:06:00Z' },
    purchases: [{ purchase_usd: '2.00', purchased_at: '2026-08-25T00:10:00Z', verified_at: '2026-08-25T00:11:00Z' }],
    xpRows: [{ amount: 2, mission_code: 'oracle-raid', awarded_at: '2026-08-25T00:12:00Z' }],
  });
  assert.equal(result.qualified, true);
  assert.equal(evaluateReferralQualification({
    referral: { accepted_at: '2026-08-25T00:00:00Z' },
    identity: { x_verified_at: 'x', wallet_verified_at: 'w' },
    purchases: [{ purchase_usd: '1.99', purchased_at: '2026-08-25T00:10:00Z', verified_at: 'v' }],
    xpRows: [{ amount: 2, awarded_at: '2026-08-25T00:12:00Z' }],
  }).qualified, false);
});

test('referral profile counts distinguish active funnel stages from awarded bonuses', () => {
  assert.deepEqual(summarizeReferrals([
    {},
    { identity_verified_at: 'x' },
    { identity_verified_at: 'x', purchase_verified_at: 'p' },
    { identity_verified_at: 'x', purchase_verified_at: 'p', first_xp_ledger_id: 4, qualified_at: 'q' },
    { qualified_at: 'q', bonus_xp_ledger_id: 9 },
  ]), {
    invited: 5, verifying: 1, purchasePending: 1, participationPending: 1,
    qualified: 2, bonusAwarded: 1,
  });
});

test('referral profile exposes the locked referral and X invite reward values', async () => {
  const client = { select: async () => [] };
  const profile = await getReferralProfile(client, 123, {
    id: 'bond-the-duck-2026',
    createCode: false,
  });
  assert.equal(profile.bonusXp, 10);
  assert.equal(profile.xInviteBonusXp, 5);
});

test('qualification refresh advances evidence monotonically without issuing bonus XP', async () => {
  const updates = [];
  const client = {
    select: async (table) => {
      if (table === 'campaign_referrals') return [{
        id: 7, status: 'CAPTURED', accepted_at: '2026-08-25T00:00:00Z',
        identity_verified_at: null, purchase_verified_at: null, qualifying_purchase_usd: null,
        qualifying_purchase_ref: null, first_xp_ledger_id: null, qualified_at: null,
        bonus_xp_ledger_id: null,
      }];
      if (table === 'identity_links') return [{
        x_verified_at: '2026-08-25T00:05:00Z', wallet_verified_at: '2026-08-25T00:06:00Z',
      }];
      if (table === 'campaign_referral_purchase_proofs') return [{
        id: 2, purchase_ref: 'tx-1', purchase_usd: '2.50',
        purchased_at: '2026-08-25T00:10:00Z', verified_at: '2026-08-25T00:11:00Z',
      }];
      if (table === 'xp_ledger') return [{
        id: 9, amount: 2, mission_code: 'oracle-raid', awarded_at: '2026-08-25T00:12:00Z',
      }];
      return [];
    },
    update: async (table, query, patch) => {
      updates.push([table, query, patch]);
      return [{ id: 7, ...patch }];
    },
  };
  const result = await refreshReferralQualification(client, 456, {
    id: 'bond-the-duck-2026', now: '2026-08-25T00:13:00Z',
  });
  assert.equal(result.status, 'QUALIFIED');
  assert.equal(result.first_xp_ledger_id, 9);
  assert.equal(result.qualified_at, '2026-08-25T00:13:00Z');
  assert.equal('bonus_xp_ledger_id' in updates[0][2], false);
});

test('referral migration is server-only, first-touch constrained and RLS protected', async () => {
  const sql = await readFile(new URL(
    '../supabase/migrations/20260825061658_verified_campaign_referrals.sql', import.meta.url
  ), 'utf8');
  assert.match(sql, /unique \(campaign_id, referred_user_id\)/i);
  assert.match(sql, /check \(referrer_user_id <> referred_user_id\)/i);
  assert.match(sql, /existing campaign participant is not referral eligible/i);
  assert.match(sql, /campaign referral capture is not active/i);
  assert.match(sql, /on conflict \(campaign_id, referred_user_id\) do nothing/i);
  assert.match(sql, /enable row level security/gi);
  assert.match(sql, /revoke all on public\.campaign_referral_codes[\s\S]*from anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.capture_campaign_referral\(text,text,bigint\) to service_role/i);
});
