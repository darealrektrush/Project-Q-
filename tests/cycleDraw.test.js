import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BOND_DRAW_REVEAL_WINDOW_MS,
  cycleDrawCommitHash,
  cycleDrawPublicSeed,
  generateCycleDrawReveal,
  revealDeadline,
  revealIsOnTime,
  verifyCycleCutoffBracket,
} from '../src/campaign/cycleDraw.js';

const campaignId = 'bond-the-duck-2026';
const cycleId = 1;
const revealValue = '1'.repeat(64);
const commitHash = cycleDrawCommitHash({ campaignId, cycleId, revealValue });

test('cycle draw commitment is deterministic and domain-separated', () => {
  assert.match(generateCycleDrawReveal(), /^[0-9a-f]{64}$/);
  assert.match(commitHash, /^[0-9a-f]{64}$/);
  assert.equal(
    cycleDrawCommitHash({ campaignId, cycleId, revealValue }),
    commitHash
  );
  assert.notEqual(
    cycleDrawCommitHash({ campaignId, cycleId: 2, revealValue }),
    commitHash
  );
});

test('public seed is fixed by commitment hash plus cutoff block evidence, not reveal timing', () => {
  const args = {
    campaignId,
    cycleId,
    commitHash,
    cutoffSlot: 123456789,
    cutoffBlockhash: '11111111111111111111111111111111',
  };
  const first = cycleDrawPublicSeed(args);
  const replay = cycleDrawPublicSeed(args);
  assert.equal(first, replay);
  assert.match(first, /^[0-9a-f]{64}$/);
});

test('cutoff bracket requires previous finalized block before close and cutoff block at or after close', () => {
  assert.equal(verifyCycleCutoffBracket({
    closesAt: '2026-10-03T15:00:00.000Z',
    previousSlot: 100,
    previousBlockTime: '2026-10-03T14:59:59.000Z',
    cutoffSlot: 101,
    cutoffBlockTime: '2026-10-03T15:00:00.000Z',
  }), true);

  assert.equal(verifyCycleCutoffBracket({
    closesAt: '2026-10-03T15:00:00.000Z',
    previousSlot: 100,
    previousBlockTime: '2026-10-03T15:00:00.000Z',
    cutoffSlot: 101,
    cutoffBlockTime: '2026-10-03T15:00:01.000Z',
  }), false);
});

test('reveal window is fixed at 30 minutes but never changes the seed formula', () => {
  assert.equal(BOND_DRAW_REVEAL_WINDOW_MS, 30 * 60 * 1000);
  assert.equal(
    revealDeadline('2026-10-03T15:00:00.000Z'),
    '2026-10-03T15:30:00.000Z'
  );
  assert.equal(
    revealIsOnTime('2026-10-03T15:30:00.000Z', '2026-10-03T15:00:00.000Z'),
    true
  );
  assert.equal(
    revealIsOnTime('2026-10-03T15:30:00.001Z', '2026-10-03T15:00:00.000Z'),
    false
  );
});

test('cycle draw migration is append-only, activation-gated and seed formula excludes reveal', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260920100000_bond_cycle_draw_contract.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /campaign_cycle_draw_commitments_immutable/);
  assert.match(sql, /campaign_cycle_draw_cutoffs_immutable/);
  assert.match(sql, /campaign_cycle_draw_reveals_immutable/);
  assert.match(sql, /campaign_cycle_draw_finalizations_immutable/);
  assert.match(sql, /Bond activation requires all five pre-open draw commitments/);
  assert.match(sql, /bond-draw-seed-v1/);
  assert.match(sql, /cutoff\.cutoff_slot::text \|\| '\|' \|\| cutoff\.cutoff_blockhash/);
  assert.doesNotMatch(
    sql.match(/seed_value :=[\s\S]*?insert into public\.campaign_cycle_draw_finalizations/)?.[0] || '',
    /reveal_value/
  );
  assert.doesNotMatch(sql, /grant\s+.*\s+to\s+(anon|authenticated)/i);
});
