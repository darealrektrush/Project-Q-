import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { settleCampaignBagworkXp } from '../src/campaign/bagworkSettlement.js';

test('Bagwork campaign settlement skips outside active campaign states', async () => {
  const client = { select: async () => [{ state: 'DRAFT' }] };
  const result = await settleCampaignBagworkXp(client, 'bond-the-duck-2026');
  assert.equal(result.skipped, 'campaign is not accepting Bagwork settlement');
  assert.deepEqual(result.settled, []);
});

test('Bagwork campaign settlement replays only unsettled paid submissions inside campaign cycles', async () => {
  const calls = [];
  const client = {
    async select(table) {
      if (table === 'campaigns') return [{ state: 'ACTIVE' }];
      if (table === 'cycles') return [
        { opens_at: '2026-10-01T15:00:00Z', closes_at: '2026-10-03T15:00:00Z' },
        { opens_at: '2026-10-03T15:00:00Z', closes_at: '2026-10-05T15:00:00Z' },
      ];
      if (table === 'bagwork_payouts') return [
        { submission_id: 'done-1', paid_at: '2026-10-02T00:00:00Z' },
        { submission_id: 'new-2', paid_at: '2026-10-04T00:00:00Z' },
      ];
      if (table === 'campaign_bagwork_events') return [{ submission_id: 'done-1', status: 'CREDITED' }];
      throw new Error('unexpected table');
    },
    async rpc(fn, args) {
      calls.push({ fn, args });
      return [{ status: 'CREDITED', creditedXp: 7, ledgerId: 55 }];
    },
  };
  const result = await settleCampaignBagworkXp(client, 'bond-the-duck-2026');
  assert.equal(result.settled.length, 1);
  assert.equal(result.settled[0].submissionId, 'new-2');
  assert.equal(result.settled[0].credited, true);
  assert.equal(result.settled[0].amount, 7);
  assert.deepEqual(calls, [{
    fn: 'settle_campaign_bagwork_payout',
    args: { p_campaign_id: 'bond-the-duck-2026', p_submission_id: 'new-2' },
  }]);
});

test('Bagwork settlement isolates one failed payout instead of aborting the sweep', async () => {
  const client = {
    async select(table) {
      if (table === 'campaigns') return [{ state: 'ACTIVE' }];
      if (table === 'cycles') return [{ opens_at: '2026-10-01T15:00:00Z', closes_at: '2026-10-03T15:00:00Z' }];
      if (table === 'bagwork_payouts') return [{ submission_id: 'retry-me', paid_at: '2026-10-02T00:00:00Z' }];
      if (table === 'campaign_bagwork_events') return [];
      throw new Error('unexpected table');
    },
    async rpc() { throw new Error('identity pending'); },
  };
  const result = await settleCampaignBagworkXp(client, 'bond-the-duck-2026');
  assert.equal(result.settled.length, 0);
  assert.equal(result.pending.length, 1);
  assert.equal(result.pending[0].submissionId, 'retry-me');
});

test('Bagwork campaign migration is capped, idempotent and service-role only', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920060000_campaign_bagwork_xp_bridge.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /unique \(campaign_id, submission_id\)/);
  assert.match(sql, /'bagwork-payout:' \|\| p_submission_id/);
  assert.match(sql, /75 - overall_used/);
  assert.match(sql, /20 - mission_used/);
  assert.match(sql, /mission_code, idempotency_key, awarded_at/);
  assert.match(sql, /award, 'bagwork', 'bagwork-payout:' \|\| p_submission_id/);
  assert.match(sql, /grant execute on function public\.settle_campaign_bagwork_payout/);
  assert.doesNotMatch(sql, /grant\s+.*\s+to\s+(anon|authenticated)/i);
});
