import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Bond draw timing is database-authoritative and direct inserts are revoked', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920120000_harden_bond_draw_server_time.sql', import.meta.url),
    'utf8'
  );

  assert.match(sql, /recorded_at timestamptz := clock_timestamp\(\)/);
  assert.match(sql, /recorded_at >= cycle_row\.opens_at/);
  assert.match(sql, /recorded_at < cycle_row\.closes_at/);
  assert.match(sql, /on_time_value := recorded_at <= cutoff\.cutoff_block_time \+ interval '30 minutes'/);

  assert.match(sql, /revoke insert on public\.campaign_cycle_draw_commitments from service_role/);
  assert.match(sql, /revoke insert on public\.campaign_cycle_draw_cutoffs from service_role/);
  assert.match(sql, /revoke insert on public\.campaign_cycle_draw_reveals from service_role/);
  assert.match(sql, /revoke insert on public\.campaign_cycle_draw_finalizations from service_role/);

  assert.match(sql, /record_campaign_cycle_draw_commitment\(text,integer,text\)/);
  assert.match(sql, /record_campaign_cycle_draw_cutoff\(text,integer,bigint,text,timestamptz,bigint,text,timestamptz\)/);
  assert.match(sql, /record_campaign_cycle_draw_reveal\(text,integer,text\)/);

  assert.doesNotMatch(sql, /record_campaign_cycle_draw_commitment\(text,integer,text,timestamptz\).*grant execute/is);
  assert.doesNotMatch(sql, /record_campaign_cycle_draw_reveal\(text,integer,text,timestamptz\).*grant execute/is);
});
