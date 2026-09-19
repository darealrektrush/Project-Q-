import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../supabase/migrations/20260919161000_project_q_campaign_intelligence.sql', import.meta.url),
  'utf8'
);
const normalized = sql.replace(/\s+/g, ' ').toLowerCase();

test('campaign intelligence RPC is service-role only and security invoker', () => {
  assert.match(normalized, /security invoker/);
  assert.match(
    normalized,
    /revoke all on function public\.project_q_campaign_intelligence\(text\) from public, anon, authenticated/
  );
  assert.match(
    normalized,
    /grant execute on function public\.project_q_campaign_intelligence\(text\) to service_role/
  );
});

test('campaign intelligence returns aggregate categories without member-level projection', () => {
  for (const key of [
    "'identity'",
    "'xp'",
    "'raid_evidence'",
    "'participation_evidence'",
    "'buy_to_earn'",
    "'rewards'",
  ]) {
    assert.ok(sql.includes(key), `missing aggregate section ${key}`);
  }

  // The contract may count rows based on these private columns, but must never
  // place their values in jsonb_build_object output.
  assert.doesNotMatch(
    normalized,
    /jsonb_build_object\([^;]*(telegram_user_id|reward_wallet|x_user_id|fawkq_token_account)\s*,/s
  );
});

test('campaign intelligence preserves base-unit reward totals as text', () => {
  assert.match(normalized, /sum\(gross_base_units\).*::text/s);
  assert.match(normalized, /'allocated_base_units'/);
});

test('campaign intelligence distinguishes credited progress from mission completion', () => {
  assert.match(normalized, /'raid_evidence'/);
  assert.match(normalized, /'participation_evidence'/);
  assert.doesNotMatch(normalized, /'missions_completed'/);
  assert.doesNotMatch(normalized, /'mission_completion'/);
});
