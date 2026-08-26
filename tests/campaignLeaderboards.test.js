import test from 'node:test';
import assert from 'node:assert/strict';
import {
  closedCampaignLeaderboards,
  getCampaignLeaderboards,
} from '../src/campaign/leaderboards.js';

test('pre-launch campaign rankings fail closed without reading participant records', async () => {
  const calls = [];
  const client = {
    select: async (table) => {
      calls.push(table);
      return [{ state: 'DRAFT' }];
    },
  };
  const result = await getCampaignLeaderboards(client, 123);
  assert.equal(result.available, false);
  assert.equal(result.campaignState, 'DRAFT');
  assert.deepEqual(result.overall.rows, []);
  assert.deepEqual(calls, ['campaigns']);
});

test('active rankings aggregate verified records and never expose participant identifiers', async () => {
  const client = {
    select: async (table, query) => {
      if (table === 'campaigns') return [{ state: 'ACTIVE' }];
      if (table === 'identity_links') return [
        { telegram_user_id: 300 }, { telegram_user_id: 100 }, { telegram_user_id: 200 },
      ];
      if (table === 'campaign_xp_totals') return [
        { telegram_user_id: 300, xp: 7 },
        { telegram_user_id: 100, xp: 10 },
        { telegram_user_id: 200, xp: 10 },
        { telegram_user_id: 200, xp: 4 },
        { telegram_user_id: 999, xp: 9000 },
      ];
      if (table === 'xp_ledger' && query.includes('awarded_at=gte')) return [
        { telegram_user_id: 100, amount: 2 }, { telegram_user_id: 200, amount: 8 },
      ];
      if (table === 'xp_ledger') return [
        { telegram_user_id: 100, amount: 5 }, { telegram_user_id: 200, amount: 4 },
      ];
      if (table === 'campaign_community_daily_scores') return [
        { telegram_user_id: 100, xp_awarded: 3 }, { telegram_user_id: 100, xp_awarded: 2 },
        { telegram_user_id: 300, xp_awarded: 8 },
      ];
      if (table === 'campaign_participation_events') return [
        { telegram_user_id: 100 }, { telegram_user_id: 100 },
        { telegram_user_id: 300 }, { telegram_user_id: 999 },
      ];
      return [];
    },
  };

  const result = await getCampaignLeaderboards(client, 100, {
    now: '2026-08-25T20:00:00.000Z',
  });
  assert.equal(result.available, true);
  assert.equal(result.overall.participantRank, 2);
  assert.equal(result.overall.rows[0].xp, 14);
  assert.equal(result.overall.rows[1].name, 'YOU');
  assert.equal(result['48h'].rows[0].xp, 8);
  assert.equal(result.missions.participantRank, 1);
  assert.equal(result.trending.rows[0].xp, 2);
  assert.equal(result.trending.rows[0].name, 'YOU');
  assert.equal(result.trending.unit, 'PUSHES');
  assert.equal(result.community.rows[0].xp, 8);
  assert.equal(result.burn.available, false);
  assert.match(result.burn.reason, /not finalized/);

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /telegram_user_id|x_user_id/);
  assert.doesNotMatch(serialized, /"999"|"300"|"200"|"100"/);
});

test('rankings return top rows plus the signed-in participant outside the display limit', async () => {
  const identities = Array.from({ length: 25 }, (_, index) => ({ telegram_user_id: index + 1 }));
  const totals = identities.map(({ telegram_user_id }) => ({
    telegram_user_id,
    xp: 100 - telegram_user_id,
  }));
  const client = {
    select: async (table) => {
      if (table === 'campaigns') return [{ state: 'VERIFYING' }];
      if (table === 'identity_links') return identities;
      if (table === 'campaign_xp_totals') return totals;
      return [];
    },
  };
  const result = await getCampaignLeaderboards(client, 25, { limit: 20 });
  assert.equal(result.overall.rows.length, 21);
  assert.equal(result.overall.rows.at(-1).isUser, true);
  assert.equal(result.overall.rows.at(-1).rank, 25);
  assert.equal(result.overall.participantCount, 25);
});

test('closed leaderboard fallback never fabricates identities or scores', () => {
  const result = closedCampaignLeaderboards('ACTIVE', 'temporarily unavailable');
  assert.equal(result.available, false);
  assert.equal(result.overall.reason, 'temporarily unavailable');
  assert.deepEqual(result.overall.rows, []);
  assert.deepEqual(result.trending.rows, []);
  assert.deepEqual(result.burn.rows, []);
});
