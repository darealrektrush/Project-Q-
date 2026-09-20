import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  drainOraclePlatformOutbox,
  _test,
} from '../src/campaign/oraclePlatformOutbox.js';

const ENV = {
  ORACLE_PLATFORM_EVENTS_ENABLED: 'true',
  ORACLE_PLATFORM_EVENT_URL:
    'https://crabstar-oracle-platform.onrender.com/platform/integrations/project-q/events',
  ORACLE_PROJECT_Q_EVENT_SECRET: 'q'.repeat(32),
};

test('outbox configuration fails closed without a valid dedicated secret and https endpoint', () => {
  assert.equal(_test.configured({ ...ENV, ORACLE_PROJECT_Q_EVENT_SECRET: 'short' }), false);
  assert.equal(_test.configured({ ...ENV, ORACLE_PLATFORM_EVENT_URL: 'http://example.com/platform/integrations/project-q/events' }), false);
  assert.equal(_test.configured({ ...ENV, ORACLE_PLATFORM_EVENTS_ENABLED: 'false' }), false);
  assert.equal(_test.configured(ENV), true);
});

test('campaign join outbox delivery uses a bounded privacy-safe payload', async () => {
  const calls = [];
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === 'claim_oracle_platform_outbox') {
        return [{
          id: 7,
          event_key: 'campaign.joined:bond-the-duck-2026:42',
          event_name: 'campaign.joined',
          campaign_id: 'bond-the-duck-2026',
          telegram_user_id: 42,
          occurred_at: '2026-09-19T06:00:00+00:00',
          attempt_count: 1,
        }];
      }
      if (name === 'complete_oracle_platform_outbox') return true;
      throw new Error('unexpected rpc');
    },
  };

  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200 };
  };

  const result = await drainOraclePlatformOutbox(client, {
    env: ENV,
    fetchImpl,
    leaseId: '11111111-1111-1111-1111-111111111111',
  });

  assert.deepEqual(result, { configured: true, claimed: 1, delivered: 1, failed: 0 });
  assert.equal(request.url, ENV.ORACLE_PLATFORM_EVENT_URL);
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.headers.authorization, 'Bearer ' + ENV.ORACLE_PROJECT_Q_EVENT_SECRET);
  const payload = JSON.parse(request.options.body);
  assert.deepEqual(payload, {
    event_id: 'campaign.joined:bond-the-duck-2026:42',
    event_name: 'campaign.joined',
    campaign_id: 'bond-the-duck-2026',
    telegram_user_id: 42,
    occurred_at: '2026-09-19T06:00:00+00:00',
  });
  assert.equal('wallet' in payload, false);
  assert.equal('x_user_id' in payload, false);
  assert.equal(calls.at(-1).name, 'complete_oracle_platform_outbox');
});

test('delivery failure is retained for bounded retry instead of blocking campaign state', async () => {
  const calls = [];
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === 'claim_oracle_platform_outbox') {
        return [{
          id: 8,
          event_key: 'campaign.joined:bond-the-duck-2026:43',
          event_name: 'campaign.joined',
          campaign_id: 'bond-the-duck-2026',
          telegram_user_id: 43,
          occurred_at: '2026-09-19T06:01:00+00:00',
          attempt_count: 2,
        }];
      }
      if (name === 'fail_oracle_platform_outbox') return true;
      throw new Error('unexpected rpc');
    },
  };
  const fetchImpl = async () => ({ ok: false, status: 503 });

  const result = await drainOraclePlatformOutbox(client, {
    env: ENV,
    fetchImpl,
    leaseId: '22222222-2222-2222-2222-222222222222',
  });

  assert.deepEqual(result, { configured: true, claimed: 1, delivered: 0, failed: 1 });
  const failed = calls.find(({ name }) => name === 'fail_oracle_platform_outbox');
  assert.ok(failed);
  assert.equal(failed.args.p_error, 'oracle_platform_http_503');
  assert.ok(failed.args.p_retry_after_seconds >= 30);
  assert.ok(failed.args.p_retry_after_seconds <= 3600);
});

test('database migration atomically couples first enrollment with a unique outbox fact', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/20260919070000_oracle_platform_event_outbox.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /create table if not exists public\.oracle_platform_outbox/i);
  assert.match(sql, /unique/i);
  assert.match(sql, /create or replace function public\.link_oracle_identity/i);
  assert.match(sql, /if v_existing_enrolled_at is null then/i);
  assert.match(sql, /'campaign\.joined:' \|\| p_campaign_id/i);
  assert.match(sql, /on conflict \(event_key\) do nothing/i);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on public\.oracle_platform_outbox from public, anon, authenticated/i);
});
