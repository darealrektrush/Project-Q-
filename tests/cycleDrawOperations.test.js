import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  prepareCycleDrawCommitmentPacket,
  publicCommitmentPacketFingerprint,
  resolveFirstFinalizedBlockAtOrAfter,
} from '../src/campaign/cycleDrawOperations.js';

const cycles = Array.from({ length: 5 }, (_, index) => {
  const opens = Date.parse('2026-10-01T15:00:00.000Z') + index * 48 * 60 * 60 * 1000;
  return {
    cycle_id: index + 1,
    opens_at: new Date(opens).toISOString(),
    closes_at: new Date(opens + 48 * 60 * 60 * 1000).toISOString(),
  };
});

test('commitment preparation separates public hashes from private reveal material', () => {
  let counter = 0;
  const result = prepareCycleDrawCommitmentPacket(cycles, {
    generatedAt: '2026-09-30T12:00:00Z',
    revealGenerator: () => String(++counter).padStart(64, '0'),
  });
  assert.equal(result.publicPacket.cycles.length, 5);
  assert.equal(result.privatePacket.privateRevealValues.length, 5);
  assert.equal(JSON.stringify(result.publicPacket).includes('revealValue'), false);
  assert.equal(result.publicPacket.packetHash, publicCommitmentPacketFingerprint(result.publicPacket));
  assert.match(result.publicPacket.packetHash, /^[0-9a-f]{64}$/);
  assert.match(result.privatePacket.privatePacketHash, /^[0-9a-f]{64}$/);
});

test('commitment preparation refuses malformed or already-open schedules', () => {
  assert.throws(
    () => prepareCycleDrawCommitmentPacket(cycles.slice(0, 4), {
      generatedAt: '2026-09-30T12:00:00Z',
    }),
    /five scheduled cycles/
  );
  assert.throws(
    () => prepareCycleDrawCommitmentPacket(cycles, {
      generatedAt: '2026-10-01T15:00:00Z',
    }),
    /before campaign opens/
  );
});

test('cutoff resolver chooses first finalized block at or after close with previous bracket proof', async () => {
  const slots = Array.from({ length: 21 }, (_, index) => 90 + index);
  const times = new Map(slots.map((slot) => [slot, 1_000 + (slot - 90)]));
  const connection = {
    async getSlot() { return 110; },
    async getBlockTime(slot) { return times.get(slot) ?? null; },
    async getBlocks(start, end) { return slots.filter((slot) => slot >= start && slot <= end); },
    async getBlock(slot) {
      return { blockhash: String(slot).padStart(32, '1'), blockTime: times.get(slot) };
    },
  };

  // Slot 100 = 1010 seconds, slot 101 = 1011 seconds.
  const result = await resolveFirstFinalizedBlockAtOrAfter(
    connection,
    new Date(1_011_000).toISOString(),
    { searchWindowSlots: 20, maxWindows: 2, slotDurationMs: 1_000 }
  );
  assert.equal(result.previousSlot, 100);
  assert.equal(result.cutoffSlot, 101);
  assert.equal(result.previousBlockTime, new Date(1_010_000).toISOString());
  assert.equal(result.cutoffBlockTime, new Date(1_011_000).toISOString());
});

test('cutoff resolver fails before cycle close is finalized', async () => {
  const connection = {
    async getSlot() { return 100; },
    async getBlockTime() { return 1000; },
  };
  await assert.rejects(
    resolveFirstFinalizedBlockAtOrAfter(
      connection,
      new Date(1_100_000).toISOString()
    ),
    /not finalized/
  );
});

test('draw operation scripts are zero-write and private output is never printed', async () => {
  const prepare = await readFile(
    new URL('../scripts/prepare-bond-draw-commitments.js', import.meta.url),
    'utf8'
  );
  const cutoff = await readFile(
    new URL('../scripts/audit-bond-draw-cutoff.js', import.meta.url),
    'utf8'
  );
  assert.match(prepare, /mode: 0o600/);
  assert.match(prepare, /privateRevealMaterialWritten: true/);
  assert.doesNotMatch(prepare, /console\.log\([^)]*privatePacket/);
  assert.match(prepare, /mutationsPerformed: false/);
  assert.match(cutoff, /mutationsPerformed: false/);
  assert.doesNotMatch(prepare + cutoff, /supabase\.(insert|update|upsert|rpc)\(/);
});
