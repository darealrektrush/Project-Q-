import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('draw RPC privilege migration keeps tables closed and grants only audited functions', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920125000_fix_bond_draw_rpc_privileges.sql', import.meta.url),
    'utf8'
  );

  assert.match(sql, /security definer/);
  assert.match(sql, /record_campaign_cycle_draw_commitment\(text,integer,text\)/);
  assert.match(sql, /record_campaign_cycle_draw_cutoff\(text,integer,bigint,text,timestamptz,bigint,text,timestamptz\)/);
  assert.match(sql, /record_campaign_cycle_draw_reveal\(text,integer,text\)/);
  assert.match(sql, /finalize_campaign_cycle_draw\(text,integer\)/);

  assert.match(sql, /revoke all on function public\.record_campaign_cycle_draw_commitment[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.record_campaign_cycle_draw_commitment[\s\S]*to service_role/);
  assert.doesNotMatch(sql, /grant\s+insert\s+on\s+public\.campaign_cycle_draw_/i);
});

test('atomic commitment packet requires exact five-cycle set and calls hardened commitment RPC', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920130000_atomic_bond_draw_commitment_packet.sql', import.meta.url),
    'utf8'
  );

  assert.match(sql, /jsonb_array_length\(p_commitments\) <> 5/);
  assert.match(sql, /array\[1,2,3,4,5\]::integer\[\]/);
  assert.match(sql, /record_campaign_cycle_draw_commitment/);
  assert.match(sql, /commitmentCount', 5/);
  assert.match(sql, /grant execute on function public\.record_campaign_cycle_draw_commitment_packet\(text,jsonb\)[\s\S]*to service_role/);
  assert.match(sql, /revoke all on function public\.record_campaign_cycle_draw_commitment_packet\(text,jsonb\)[\s\S]*from public, anon, authenticated/);
});
