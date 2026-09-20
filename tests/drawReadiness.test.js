import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateBondDrawCommitments } from '../src/campaign/drawReadiness.js';

const cycles = Array.from({ length: 5 }, (_, index) => {
  const opens = Date.parse('2026-10-01T15:00:00Z') + index * 48 * 60 * 60 * 1000;
  return {
    cycle_id: index + 1,
    opens_at: new Date(opens).toISOString(),
    closes_at: new Date(opens + 48 * 60 * 60 * 1000).toISOString(),
  };
});

const commitments = cycles.map((cycle, index) => ({
  campaign_id: 'bond-the-duck-2026',
  cycle_id: cycle.cycle_id,
  protocol_version: 'bond-draw-v1',
  commit_hash: String(index + 1).padStart(64, 'a').slice(-64),
  committed_at: '2026-09-30T12:00:00Z',
}));

test('exact five pre-open draw commitments pass readiness', () => {
  const state = evaluateBondDrawCommitments(cycles, commitments);
  assert.equal(state.ready, true);
  assert.equal(state.commitmentCount, 5);
  assert.deepEqual(state.commitments.map(({ cycle_id }) => cycle_id), [1,2,3,4,5]);
  assert.deepEqual(state.blockers, []);
});

test('missing, malformed, late and wrong-protocol commitments fail closed', () => {
  const variants = [
    commitments.slice(0, 4),
    commitments.map((row, index) => index === 0 ? { ...row, commit_hash: 'bad' } : row),
    commitments.map((row, index) => index === 1 ? { ...row, protocol_version: 'other' } : row),
    commitments.map((row, index) => index === 2 ? { ...row, committed_at: cycles[2].opens_at } : row),
    commitments.map((row, index) => index === 3 ? { ...row, campaign_id: 'wrong' } : row),
  ];
  for (const rows of variants) assert.equal(evaluateBondDrawCommitments(cycles, rows).ready, false);
});
