import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RAID_XP_PER_ACTION,
  DAILY_XP_CAPS,
  settleRaidEvent,
  settleCampaignRaidXp,
} from '../src/campaign/xpSettlement.js';

function fakeClient({ campaignState = 'ACTIVE', pendingEvents = [], ledgerRows = [] } = {}) {
  const calls = { insert: [], update: [] };
  const client = {
    select: async (table, query) => {
      if (table === 'campaigns') return [{ id: 'bond-the-duck-2026', state: campaignState }];
      if (table === 'campaign_raid_events') return pendingEvents;
      if (table === 'xp_ledger') return ledgerRows;
      throw new Error(`unexpected select on ${table} (${query})`);
    },
    insert: async (table, rows) => {
      calls.insert.push([table, rows]);
      return rows;
    },
    update: async (table, query, patch) => {
      calls.update.push([table, query, patch]);
      return [{ ...patch }];
    },
  };
  return { client, calls };
}

test('a fresh raid event is credited the full per-action award', async () => {
  const { client, calls } = fakeClient();
  const event = { id: 1, cycle_id: 1, telegram_user_id: 123, verified_at: '2026-08-17T00:00:00Z' };
  const result = await settleRaidEvent(client, 'bond-the-duck-2026', event, new Date('2026-08-17T12:00:00Z'));

  assert.deepEqual(result, { eventId: 1, credited: true, amount: RAID_XP_PER_ACTION, reason: null });
  assert.equal(calls.insert[0][0], 'xp_ledger');
  assert.equal(calls.insert[0][1][0].amount, RAID_XP_PER_ACTION);
  assert.equal(calls.insert[0][1][0].source, 'raid');
  assert.equal(calls.insert[0][1][0].cap_bucket, 'mission');
  assert.equal(calls.insert[0][1][0].idempotency_key, 'raid-settlement:1');
  assert.equal(calls.update[0][2].credited, true);
});

test('the 20 XP/day mission cap only lets 5 raid actions through', async () => {
  const { client } = fakeClient({
    ledgerRows: [{ amount: 16, cap_bucket: 'mission' }], // 4 actions already credited today
  });
  const event = { id: 2, cycle_id: 1, telegram_user_id: 123, verified_at: '2026-08-17T00:00:00Z' };
  const result = await settleRaidEvent(client, 'bond-the-duck-2026', event, new Date('2026-08-17T12:00:00Z'));

  assert.equal(result.amount, DAILY_XP_CAPS.mission - 16); // only 4 XP remained
  assert.equal(result.credited, true);
});

test('an exhausted daily cap holds the event instead of crediting it', async () => {
  const { client, calls } = fakeClient({
    ledgerRows: [{ amount: 20, cap_bucket: 'mission' }],
  });
  const event = { id: 3, cycle_id: 1, telegram_user_id: 123, verified_at: '2026-08-17T00:00:00Z' };
  const result = await settleRaidEvent(client, 'bond-the-duck-2026', event, new Date('2026-08-17T12:00:00Z'));

  assert.deepEqual(result, { eventId: 3, credited: false, amount: 0, reason: 'daily_cap_reached' });
  assert.equal(calls.insert.length, 0);
  assert.equal(calls.update[0][2].reason, 'daily_cap_reached');
});

test('the 75 XP/day overall cap also limits raid settlement', async () => {
  const { client } = fakeClient({
    ledgerRows: [{ amount: 73, cap_bucket: 'other' }], // from other XP sources, not raids
  });
  const event = { id: 4, cycle_id: 1, telegram_user_id: 123, verified_at: '2026-08-17T00:00:00Z' };
  const result = await settleRaidEvent(client, 'bond-the-duck-2026', event, new Date('2026-08-17T12:00:00Z'));

  assert.equal(result.amount, 2); // overall cap left 75 - 73 = 2, less than the 4 XP mission remainder
});

test('a full sweep settles pending events oldest first and reports totals', async () => {
  const pendingEvents = [
    { id: 10, cycle_id: 1, telegram_user_id: 1, verified_at: '2026-08-17T00:00:00Z' },
    { id: 11, cycle_id: 1, telegram_user_id: 2, verified_at: '2026-08-17T00:05:00Z' },
  ];
  const { client } = fakeClient({ pendingEvents });
  const { settled, skipped } = await settleCampaignRaidXp(client, 'bond-the-duck-2026', {
    now: new Date('2026-08-17T12:00:00Z'),
  });

  assert.equal(skipped, null);
  assert.equal(settled.length, 2);
  assert.deepEqual(settled.map((row) => row.eventId), [10, 11]);
  assert.ok(settled.every((row) => row.amount === RAID_XP_PER_ACTION));
});

test('settlement no-ops for a campaign that is not ACTIVE', async () => {
  const { client, calls } = fakeClient({ campaignState: 'DRAFT' });
  const result = await settleCampaignRaidXp(client, 'bond-the-duck-2026');

  assert.deepEqual(result, { settled: [], skipped: 'campaign is not ACTIVE' });
  assert.equal(calls.insert.length, 0);
});
