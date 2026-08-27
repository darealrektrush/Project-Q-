import test from 'node:test';
import assert from 'node:assert/strict';

import { settleCampaignBonusXp } from '../src/campaign/bonusSettlement.js';

const CAMPAIGN_ID = 'bond-the-duck-2026';

function fakeClient({
  campaignState = 'ACTIVE',
  referrals = [],
  xInvites = [],
  results = [],
} = {}) {
  const calls = { select: [], rpc: [] };
  const client = {
    select: async (table, query) => {
      calls.select.push([table, query]);
      if (table === 'campaigns') return [{ id: CAMPAIGN_ID, state: campaignState }];
      if (table === 'campaign_referrals') return referrals;
      if (table === 'campaign_x_invite_events') return xInvites;
      throw new Error(`unexpected select on ${table}`);
    },
    rpc: async (name, args) => {
      calls.rpc.push([name, args]);
      return results[calls.rpc.length - 1];
    },
  };
  return { client, calls };
}

test('bonus settlement is inert while the campaign is DRAFT', async () => {
  const { client, calls } = fakeClient({ campaignState: 'DRAFT' });
  const result = await settleCampaignBonusXp(client, CAMPAIGN_ID);

  assert.deepEqual(result, {
    settled: [], skipped: 'campaign is not accepting bonus settlement',
  });
  assert.equal(calls.rpc.length, 0);
  assert.equal(calls.select.length, 1);
});

test('qualified referral and X invite bonuses settle oldest first with stable RPC identities', async () => {
  const { client, calls } = fakeClient({
    referrals: [{ id: 21, qualified_at: '2026-09-02T12:05:00.000Z' }],
    xInvites: [{ id: 9, verified_at: '2026-09-02T12:00:00.000Z' }],
    results: [
      { status: 'AWARDED', amount: 5 },
      { status: 'AWARDED', amount: 10 },
    ],
  });

  const result = await settleCampaignBonusXp(client, CAMPAIGN_ID);
  assert.equal(result.skipped, null);
  assert.deepEqual(result.settled.map(({ kind, amount }) => ({ kind, amount })), [
    { kind: 'X_INVITE', amount: 5 },
    { kind: 'VERIFIED_REFERRAL', amount: 10 },
  ]);
  assert.deepEqual(calls.rpc, [
    ['settle_campaign_bonus_award', {
      p_campaign_id: CAMPAIGN_ID, p_bonus_kind: 'X_INVITE', p_source_id: 9,
    }],
    ['settle_campaign_bonus_award', {
      p_campaign_id: CAMPAIGN_ID, p_bonus_kind: 'VERIFIED_REFERRAL', p_source_id: 21,
    }],
  ]);
});

test('a bonus without enough daily-cap room stays queued and never partially credits', async () => {
  const { client } = fakeClient({
    referrals: [{ id: 22, qualified_at: '2026-09-02T12:00:00.000Z' }],
    results: [{ status: 'QUEUED_DAILY_CAP', amount: 0 }],
  });

  const { settled } = await settleCampaignBonusXp(client, CAMPAIGN_ID);
  assert.deepEqual(settled[0], {
    eventId: 22,
    kind: 'VERIFIED_REFERRAL',
    credited: false,
    amount: 0,
    reason: 'daily_cap_queue',
  });
});

test('review-window settlement can release an exact queued bonus', async () => {
  const { client } = fakeClient({
    campaignState: 'VERIFYING',
    xInvites: [{ id: 10, verified_at: '2026-09-15T14:59:00.000Z' }],
    results: [{ status: 'ALREADY_AWARDED', amount: 5 }],
  });
  const { settled, skipped } = await settleCampaignBonusXp(client, CAMPAIGN_ID);
  assert.equal(skipped, null);
  assert.deepEqual(settled[0], {
    eventId: 10, kind: 'X_INVITE', credited: true, amount: 5, reason: 'already_awarded',
  });
});

test('the app rejects a database response that changes a locked bonus amount', async () => {
  const { client } = fakeClient({
    referrals: [{ id: 23, qualified_at: '2026-09-02T12:00:00.000Z' }],
    results: [{ status: 'AWARDED', amount: 7 }],
  });
  await assert.rejects(
    settleCampaignBonusXp(client, CAMPAIGN_ID),
    /expected 10, got 7/
  );
});
