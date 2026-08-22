import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VOTE_XP_PER_SITE,
  VOTE_COMPLETION_BONUS_XP,
  BOT_XP_PER_ACTION,
  settleParticipationEvent,
  settleCampaignParticipationXp,
} from '../src/campaign/participationSettlement.js';

const CAMPAIGN_ID = 'bond-the-duck-2026';

function fakeClient({
  campaignState = 'ACTIVE',
  pendingEvents = [],
  ledgerRows = [],
  verificationSources = [],
  creditedVoteSourceKeys = [],
  bonusAlreadyPaid = false,
} = {}) {
  const calls = { insert: [], update: [] };
  const client = {
    select: async (table, query) => {
      if (table === 'campaigns') return [{ id: CAMPAIGN_ID, state: campaignState }];
      if (table === 'campaign_participation_events') {
        if (query.includes('credited=eq.true')) {
          return creditedVoteSourceKeys.map((sourceKey) => ({ source_key: sourceKey }));
        }
        return pendingEvents;
      }
      if (table === 'xp_ledger') {
        if (query.includes('idempotency_key=eq.')) {
          return bonusAlreadyPaid ? [{ id: 999 }] : [];
        }
        return ledgerRows;
      }
      if (table === 'verification_sources') return verificationSources;
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

test('a fresh bot confirmation is credited the flat 2 XP bot rate, no bonus', async () => {
  const { client, calls } = fakeClient();
  const event = {
    id: 1, cycle_id: 1, source: 'event', source_key: 'major-buy-bot', telegram_user_id: 123,
    verified_at: '2026-08-17T00:00:00Z',
  };
  const result = await settleParticipationEvent(client, CAMPAIGN_ID, event, new Date('2026-08-17T12:00:00Z'));

  assert.deepEqual(result, { eventId: 1, credited: true, amount: BOT_XP_PER_ACTION, bonusAmount: 0, reason: null });
  assert.equal(calls.insert.length, 1);
  assert.equal(calls.insert[0][1][0].source, 'event');
  assert.equal(calls.insert[0][1][0].amount, BOT_XP_PER_ACTION);
});

test('a fresh vote is credited 1 XP per site with no bonus when sites remain', async () => {
  const { client, calls } = fakeClient({
    verificationSources: [
      { source_key: 'dexscreener', source: 'vote' },
      { source_key: 'geckoterminal', source: 'vote' },
    ],
    creditedVoteSourceKeys: ['dexscreener'], // this event's own site will show up as credited too, see below
  });
  const event = {
    id: 2, cycle_id: 1, source: 'vote', source_key: 'dexscreener', telegram_user_id: 123,
    verified_at: '2026-08-17T00:00:00Z',
  };
  const result = await settleParticipationEvent(client, CAMPAIGN_ID, event, new Date('2026-08-17T12:00:00Z'));

  assert.equal(result.amount, VOTE_XP_PER_SITE);
  assert.equal(result.bonusAmount, 0); // only 1 of 2 available sites credited
  assert.equal(calls.insert.length, 1); // no bonus ledger row
});

test('crediting the last remaining voting site also awards the one-time completion bonus', async () => {
  const { client, calls } = fakeClient({
    verificationSources: [
      { source_key: 'dexscreener', source: 'vote' },
      { source_key: 'geckoterminal', source: 'vote' },
    ],
    creditedVoteSourceKeys: ['dexscreener', 'geckoterminal'], // both now credited, including this event
  });
  const event = {
    id: 3, cycle_id: 1, source: 'vote', source_key: 'geckoterminal', telegram_user_id: 123,
    verified_at: '2026-08-17T00:00:00Z',
  };
  const result = await settleParticipationEvent(client, CAMPAIGN_ID, event, new Date('2026-08-17T12:00:00Z'));

  assert.equal(result.amount, VOTE_XP_PER_SITE);
  assert.equal(result.bonusAmount, VOTE_COMPLETION_BONUS_XP);
  assert.equal(calls.insert.length, 2); // site award + bonus award
  const bonusRow = calls.insert[1][1][0];
  assert.equal(bonusRow.amount, VOTE_COMPLETION_BONUS_XP);
  assert.equal(bonusRow.mission_code, 'website-voting-all-sites-bonus');
  assert.equal(bonusRow.idempotency_key, `participation-vote-bonus:${CAMPAIGN_ID}:123`);
});

test('the completion bonus is never paid twice', async () => {
  const { client, calls } = fakeClient({
    verificationSources: [{ source_key: 'dexscreener', source: 'vote' }],
    creditedVoteSourceKeys: ['dexscreener'],
    bonusAlreadyPaid: true,
  });
  const event = {
    id: 4, cycle_id: 1, source: 'vote', source_key: 'dexscreener', telegram_user_id: 123,
    verified_at: '2026-08-17T00:00:00Z',
  };
  const result = await settleParticipationEvent(client, CAMPAIGN_ID, event, new Date('2026-08-17T12:00:00Z'));

  assert.equal(result.bonusAmount, 0);
  assert.equal(calls.insert.length, 1); // site award only, no duplicate bonus row
});

test('the 15 XP/day participation cap limits both votes and bots', async () => {
  const { client } = fakeClient({
    ledgerRows: [{ amount: 14, cap_bucket: 'participation' }],
  });
  const event = {
    id: 5, cycle_id: 1, source: 'event', source_key: 'baldbuddy', telegram_user_id: 123,
    verified_at: '2026-08-17T00:00:00Z',
  };
  const result = await settleParticipationEvent(client, CAMPAIGN_ID, event, new Date('2026-08-17T12:00:00Z'));

  assert.equal(result.amount, 1); // only 1 XP of participation cap remained
  assert.equal(result.credited, true);
});

test('an exhausted daily cap holds the event instead of crediting it', async () => {
  const { client, calls } = fakeClient({
    ledgerRows: [{ amount: 15, cap_bucket: 'participation' }],
  });
  const event = {
    id: 6, cycle_id: 1, source: 'event', source_key: 'trencho', telegram_user_id: 123,
    verified_at: '2026-08-17T00:00:00Z',
  };
  const result = await settleParticipationEvent(client, CAMPAIGN_ID, event, new Date('2026-08-17T12:00:00Z'));

  assert.deepEqual(result, { eventId: 6, credited: false, amount: 0, bonusAmount: 0, reason: 'daily_cap_reached' });
  assert.equal(calls.insert.length, 0);
});

test('the 75 XP/day overall cap also limits participation settlement', async () => {
  const { client } = fakeClient({
    ledgerRows: [{ amount: 74, cap_bucket: 'other' }],
  });
  const event = {
    id: 7, cycle_id: 1, source: 'event', source_key: 'wtf-trending', telegram_user_id: 123,
    verified_at: '2026-08-17T00:00:00Z',
  };
  const result = await settleParticipationEvent(client, CAMPAIGN_ID, event, new Date('2026-08-17T12:00:00Z'));

  assert.equal(result.amount, 1); // overall cap left 75 - 74 = 1, less than the 2 XP bot rate
});

test('a full sweep settles pending events oldest first', async () => {
  const pendingEvents = [
    { id: 20, cycle_id: 1, source: 'event', source_key: 'major-buy-bot', telegram_user_id: 1, verified_at: '2026-08-17T00:00:00Z' },
    { id: 21, cycle_id: 1, source: 'event', source_key: 'baldbuddy', telegram_user_id: 2, verified_at: '2026-08-17T00:05:00Z' },
  ];
  const { client } = fakeClient({ pendingEvents });
  const { settled, skipped } = await settleCampaignParticipationXp(client, CAMPAIGN_ID, {
    now: new Date('2026-08-17T12:00:00Z'),
  });

  assert.equal(skipped, null);
  assert.equal(settled.length, 2);
  assert.deepEqual(settled.map((row) => row.eventId), [20, 21]);
  assert.ok(settled.every((row) => row.amount === BOT_XP_PER_ACTION));
});

test('settlement no-ops for a campaign that is not ACTIVE', async () => {
  const { client, calls } = fakeClient({ campaignState: 'DRAFT' });
  const result = await settleCampaignParticipationXp(client, CAMPAIGN_ID);

  assert.deepEqual(result, { settled: [], skipped: 'campaign is not ACTIVE' });
  assert.equal(calls.insert.length, 0);
});
