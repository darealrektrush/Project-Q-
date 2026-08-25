import test from 'node:test';
import assert from 'node:assert/strict';
import {
  closedMissionEvidence,
  getParticipantMissionEvidence,
} from '../src/campaign/missionEvidence.js';

test('pre-launch mission evidence fails closed after the campaign-state check', async () => {
  const calls = [];
  const client = {
    select: async (table) => {
      calls.push(table);
      return [{ state: 'DRAFT' }];
    },
  };
  const result = await getParticipantMissionEvidence(client, 123);
  assert.equal(result.available, false);
  assert.deepEqual(calls, ['campaigns']);
  assert.equal(result.oracleRaids.verified, 0);
});

test('active mission evidence reports aggregate participant state without private evidence', async () => {
  const queries = [];
  const client = {
    select: async (table, query) => {
      queries.push([table, query]);
      if (table === 'campaigns') return [{ state: 'ACTIVE' }];
      if (table === 'campaign_raid_events') return [
        { credited: true, reason: null },
        { credited: true, reason: null },
        { credited: false, reason: null },
        { credited: false, reason: 'duplicate' },
      ];
      if (table === 'campaign_participation_events' && query.includes('source=eq.vote')) return [
        { source_key: 'dexscreener', credited: true, reason: null },
        { source_key: 'dexscreener', credited: true, reason: null },
        { source_key: 'geckoterminal', credited: false, reason: null },
      ];
      if (table === 'campaign_participation_events') return [
        { source_key: 'major-buy-bot', credited: true, reason: null },
        { source_key: 'major-buy-bot', credited: true, reason: null },
        { source_key: 'trencho', credited: false, reason: 'daily_cap_reached' },
      ];
      if (table === 'verification_sources') return [
        { source_key: 'dexscreener', source: 'vote' },
        { source_key: 'geckoterminal', source: 'vote' },
        { source_key: 'major-buy-bot', source: 'event' },
        { source_key: 'trencho', source: 'event' },
      ];
      return [];
    },
  };

  const result = await getParticipantMissionEvidence(client, 123, {
    now: '2026-08-25T20:00:00.000Z',
  });
  assert.deepEqual(result.oracleRaids, { verified: 2, pending: 1, rejected: 1, target: 5 });
  assert.deepEqual(result.websiteVoting, { verified: 1, pending: 1, rejected: 0, target: 2 });
  assert.deepEqual(result.trendingBots, { verified: 1, pending: 0, rejected: 1, target: 2 });
  assert.ok(queries.find(([table, query]) => table === 'campaign_raid_events' && query.includes('2026-08-25')));
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /telegram|source_key|evidence_ref|duplicate|daily_cap_reached/);
});

test('review-stage evidence remains visible and invalid timestamps fail safely', async () => {
  const client = {
    select: async (table) => table === 'campaigns' ? [{ state: 'VERIFYING' }] : [],
  };
  const result = await getParticipantMissionEvidence(client, 123, { now: '2026-08-25T20:00:00.000Z' });
  assert.equal(result.available, true);
  await assert.rejects(
    () => getParticipantMissionEvidence(client, 123, { now: 'not-a-date' }),
    /invalid mission evidence timestamp/
  );
});

test('closed mission evidence returns only zeroed aggregate lanes', () => {
  const result = closedMissionEvidence('ACTIVE', 'temporarily unavailable');
  assert.equal(result.available, false);
  assert.equal(result.reason, 'temporarily unavailable');
  assert.deepEqual(result.trendingBots, { verified: 0, pending: 0, rejected: 0, target: 4 });
});
