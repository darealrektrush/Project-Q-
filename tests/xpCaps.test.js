import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAMPAIGN_TIME_ZONE,
  campaignDayBounds,
  campaignDayKey,
  loadDailyXpUsage,
} from '../src/campaign/xpCaps.js';

test('campaign day keys use the locked Vancouver timezone', () => {
  assert.equal(CAMPAIGN_TIME_ZONE, 'America/Vancouver');
  assert.equal(campaignDayKey('2026-09-02T06:59:59.999Z'), '2026-09-01');
  assert.equal(campaignDayKey('2026-09-02T07:00:00.000Z'), '2026-09-02');
});

test('campaign day boundaries follow the runtime Vancouver timezone database', () => {
  assert.deepEqual(campaignDayBounds('2026-09-01'), {
    start: '2026-09-01T07:00:00.000Z',
    end: '2026-09-02T07:00:00.000Z',
  });
  const november = campaignDayBounds('2026-11-01');
  assert.equal(campaignDayKey(november.start), '2026-11-01');
  assert.equal(campaignDayKey(new Date(Date.parse(november.end) - 1)), '2026-11-01');
  assert.equal(campaignDayKey(november.end), '2026-11-02');
});

test('daily usage query uses a half-open Vancouver campaign-day range', async () => {
  let query = '';
  const client = {
    async select(table, value) {
      assert.equal(table, 'xp_ledger');
      query = value;
      return [{ amount: 3, cap_bucket: 'trending' }];
    },
  };
  const usage = await loadDailyXpUsage(client, 'bond-the-duck-2026', 123, '2026-09-01');
  assert.match(query, /awarded_at=gte\.2026-09-01T07%3A00%3A00\.000Z/);
  assert.match(query, /awarded_at=lt\.2026-09-02T07%3A00%3A00\.000Z/);
  assert.equal(usage.overall, 3);
  assert.equal(usage.trending, 3);
});
