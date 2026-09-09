import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ACTIVE_OPENS_AT,
  ACTIVE_CLOSES_AT,
  REVIEW_OPENS_AT,
  REVIEW_48_HOUR_CHECKPOINT_AT,
  REVIEW_CLOSES_AT,
  EXPECTED_CYCLES,
  LOCKED_CYCLES,
  PHASED_RELEASE_OFFSETS_DAYS,
  campaignScheduleCanStillLaunch,
  getCampaignRuntimeState,
  getCampaignScheduleState,
  lockedCampaignCyclesMatch,
} from '../src/campaign/schedule.js';

const hour = 60 * 60 * 1000;
const day = 24 * hour;

test('locked campaign schedule is 10 active days across five contiguous 48-hour cycles', () => {
  assert.equal(Date.parse(ACTIVE_CLOSES_AT) - Date.parse(ACTIVE_OPENS_AT), 10 * day);
  assert.equal(EXPECTED_CYCLES, 5);
  assert.equal(LOCKED_CYCLES.length, 5);
  assert.equal(LOCKED_CYCLES[0].opensAt, ACTIVE_OPENS_AT);
  assert.equal(LOCKED_CYCLES.at(-1).closesAt, ACTIVE_CLOSES_AT);
  LOCKED_CYCLES.forEach((cycle, index) => {
    assert.equal(Date.parse(cycle.closesAt) - Date.parse(cycle.opensAt), 48 * hour);
    if (index > 0) assert.equal(cycle.opensAt, LOCKED_CYCLES[index - 1].closesAt);
  });
});

test('final review has a 48-hour clearance checkpoint and a 72-hour maximum', () => {
  assert.equal(Date.parse(REVIEW_48_HOUR_CHECKPOINT_AT) - Date.parse(REVIEW_OPENS_AT), 48 * hour);
  assert.equal(Date.parse(REVIEW_CLOSES_AT) - Date.parse(REVIEW_OPENS_AT), 72 * hour);
  assert.deepEqual(PHASED_RELEASE_OFFSETS_DAYS, [6, 12, 18, 24, 30]);
});

test('Mini App schedule stays identical to the server schedule contract', async () => {
  const campaign = JSON.parse(await readFile(new URL('../public/campaign-app/campaigns/bond-the-duck-2026.json', import.meta.url), 'utf8'));
  assert.equal(campaign.schedule.activeOpensAt, ACTIVE_OPENS_AT);
  assert.equal(campaign.schedule.activeClosesAt, ACTIVE_CLOSES_AT);
  assert.equal(campaign.schedule.reviewOpensAt, REVIEW_OPENS_AT);
  assert.equal(campaign.schedule.review48HourCheckpointAt, REVIEW_48_HOUR_CHECKPOINT_AT);
  assert.equal(campaign.schedule.reviewClosesAt, REVIEW_CLOSES_AT);
  assert.deepEqual(campaign.schedule.cycles, LOCKED_CYCLES);
  assert.deepEqual(campaign.schedule.phasedRelease.offsetDaysAfterPostReviewRelease, PHASED_RELEASE_OFFSETS_DAYS);
});

test('readiness accepts only the exact locked cycle boundaries', () => {
  const rows = LOCKED_CYCLES.map(({ cycleId, opensAt, closesAt }) => ({
    cycle_id: cycleId,
    opens_at: opensAt,
    closes_at: closesAt,
  })).reverse();
  assert.equal(lockedCampaignCyclesMatch(rows), true);
  assert.equal(lockedCampaignCyclesMatch(rows.slice(1)), false);
  assert.equal(lockedCampaignCyclesMatch(rows.map((row) => row.cycle_id === 5
    ? { ...row, closes_at: '2026-09-11T16:00:00.000Z' }
    : row)), false);
});

test('launch readiness rejects a locked schedule after its opening time', () => {
  const rows = LOCKED_CYCLES.map(({ cycleId, opensAt, closesAt }) => ({
    cycle_id: cycleId,
    opens_at: opensAt,
    closes_at: closesAt,
  }));

  assert.equal(campaignScheduleCanStillLaunch(rows, '2026-09-01T14:59:59.999Z'), true);
  assert.equal(campaignScheduleCanStillLaunch(rows, ACTIVE_OPENS_AT), false);
  assert.equal(campaignScheduleCanStillLaunch(rows, '2026-09-08T00:00:00.000Z'), false);
  assert.equal(campaignScheduleCanStillLaunch(rows.slice(1), '2026-08-31T00:00:00.000Z'), false);
});

test('runtime advances deterministically across every locked schedule boundary', () => {
  assert.equal(getCampaignScheduleState('2026-09-01T14:59:59.999Z').phase, 'PRE_LAUNCH');
  assert.deepEqual(getCampaignScheduleState(ACTIVE_OPENS_AT), {
    phase: 'ACTIVE', label: 'Cycle 1 closes', targetAt: LOCKED_CYCLES[0].closesAt, currentCycle: 1,
  });
  assert.equal(getCampaignScheduleState(LOCKED_CYCLES[1].opensAt).currentCycle, 2);
  assert.equal(getCampaignScheduleState(ACTIVE_CLOSES_AT).phase, 'HANDOFF');
  assert.equal(getCampaignScheduleState(REVIEW_OPENS_AT).phase, 'REVIEW');
  assert.equal(getCampaignScheduleState(REVIEW_48_HOUR_CHECKPOINT_AT).phase, 'REVIEW_EXTENSION');
  assert.equal(getCampaignScheduleState(REVIEW_CLOSES_AT).phase, 'POST_REVIEW');
  assert.throws(() => getCampaignScheduleState('not-a-date'), /invalid campaign schedule timestamp/);
});

test('calendar time cannot open operations without authoritative ACTIVE database state', () => {
  const blocked = getCampaignRuntimeState('DRAFT', '2026-09-02T15:00:00Z');
  assert.equal(blocked.schedule.currentCycle, 1);
  assert.equal(blocked.operational, false);
  assert.equal(blocked.displayLabel, 'LAUNCH BLOCKED');
  assert.equal(getCampaignRuntimeState('ACTIVE', '2026-09-02T15:00:00Z').operational, false);
  assert.equal(getCampaignRuntimeState('ACTIVE', '2026-09-02T15:00:00Z', { participationEnabled: true }).operational, false);
  const live = getCampaignRuntimeState('ACTIVE', '2026-09-02T15:00:00Z', {
    participationEnabled: true, scheduleReady: true,
  });
  assert.equal(live.operational, true);
  assert.equal(live.displayLabel, 'CYCLE 1 LIVE');
  assert.equal(getCampaignRuntimeState('ACTIVE', '2026-08-31T15:00:00Z', {
    participationEnabled: true, scheduleReady: true,
  }).operational, false);
});

test('historical schedule migration remains immutable and non-activating', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260825073000_lock_bond_the_duck_schedule.sql', import.meta.url), 'utf8');
  assert.match(sql, /cycle_id between 1 and 7/g);
  assert.match(sql, /refusing to reschedule Bond the Duck after cycle evidence exists/);
  assert.match(sql, /'bond-the-duck-2026', 7, '2026-09-13T15:00:00Z', '2026-09-15T15:00:00Z'/);
  assert.doesNotMatch(sql, /update\s+public\.campaigns[\s\S]*state/i);
  assert.doesNotMatch(sql, /grant\s+.*\s+to\s+(anon|authenticated)/i);
});
