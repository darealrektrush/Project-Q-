import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CYCLE_HOURS,
  EXPECTED_CYCLES,
  REVIEW_HANDOFF_DELAY_HOURS,
  REVIEW_CHECKPOINT_HOURS,
  REVIEW_MAX_HOURS,
  PHASED_RELEASE_OFFSETS_DAYS,
  campaignScheduleCanStillLaunch,
  getCampaignRuntimeState,
  getCampaignScheduleState,
  lockedCampaignCyclesMatch,
} from '../src/campaign/schedule.js';

const hour = 60 * 60 * 1000;
const day = 24 * hour;

function fiveCycles(activeOpensAt = '2026-10-01T15:00:00.000Z') {
  const start = Date.parse(activeOpensAt);
  return Array.from({ length: EXPECTED_CYCLES }, (_, index) => {
    const opens = start + (index * CYCLE_HOURS * hour);
    const closes = opens + (CYCLE_HOURS * hour);
    return {
      cycle_id: index + 1,
      opens_at: new Date(opens).toISOString(),
      closes_at: new Date(closes).toISOString(),
    };
  });
}

test('campaign schedule contract is five contiguous 48-hour cycles without fixed calendar dates', () => {
  const rows = fiveCycles();
  assert.equal(EXPECTED_CYCLES, 5);
  assert.equal(lockedCampaignCyclesMatch(rows), true);
  assert.equal(Date.parse(rows.at(-1).closes_at) - Date.parse(rows[0].opens_at), 10 * day);
  rows.forEach((cycle, index) => {
    assert.equal(Date.parse(cycle.closes_at) - Date.parse(cycle.opens_at), 48 * hour);
    if (index > 0) assert.equal(cycle.opens_at, rows[index - 1].closes_at);
  });
});

test('review timing remains 24-hour handoff then 48-hour checkpoint and 72-hour maximum', () => {
  assert.equal(REVIEW_HANDOFF_DELAY_HOURS, 24);
  assert.equal(REVIEW_CHECKPOINT_HOURS, 48);
  assert.equal(REVIEW_MAX_HOURS, 72);
  assert.deepEqual(PHASED_RELEASE_OFFSETS_DAYS, [6, 12, 18, 24, 30]);
});

test('Mini App target starts at 8 AM Vancouver time and preserves five contiguous cycles', async () => {
  const campaign = JSON.parse(await readFile(
    new URL('../public/campaign-app/campaigns/bond-the-duck-2026.json', import.meta.url),
    'utf8'
  ));
  assert.equal(campaign.status, 'DRAFT');
  assert.equal(campaign.schedule.activeOpensAt, '2026-09-29T15:00:00.000Z');
  assert.equal(campaign.schedule.activeClosesAt, '2026-10-09T15:00:00.000Z');
  assert.equal(campaign.schedule.reviewOpensAt, '2026-10-10T15:00:00.000Z');
  assert.equal(campaign.schedule.review48HourCheckpointAt, '2026-10-12T15:00:00.000Z');
  assert.equal(campaign.schedule.reviewClosesAt, '2026-10-13T15:00:00.000Z');
  assert.equal(campaign.schedule.cycles.length, EXPECTED_CYCLES);
  assert.equal(lockedCampaignCyclesMatch(campaign.schedule.cycles.map(({ cycleId, opensAt, closesAt }) => ({
    cycle_id: cycleId, opens_at: opensAt, closes_at: closesAt,
  }))), true);
  assert.deepEqual(
    campaign.schedule.phasedRelease.offsetDaysAfterPostReviewRelease,
    PHASED_RELEASE_OFFSETS_DAYS
  );
});

test('readiness accepts any exact future five-cycle schedule and rejects structural drift', () => {
  const rows = fiveCycles().reverse();
  assert.equal(lockedCampaignCyclesMatch(rows), true);
  assert.equal(lockedCampaignCyclesMatch(rows.slice(1)), false);
  assert.equal(lockedCampaignCyclesMatch(rows.map((row) => row.cycle_id === 5
    ? { ...row, closes_at: new Date(Date.parse(row.closes_at) + hour).toISOString() }
    : row)), false);
  assert.equal(lockedCampaignCyclesMatch(rows.map((row) => row.cycle_id === 3
    ? { ...row, opens_at: new Date(Date.parse(row.opens_at) + hour).toISOString() }
    : row)), false);
});

test('launch readiness requires the locked schedule opening to remain in the future', () => {
  const rows = fiveCycles('2026-10-01T15:00:00.000Z');
  assert.equal(campaignScheduleCanStillLaunch(rows, '2026-10-01T14:59:59.999Z'), true);
  assert.equal(campaignScheduleCanStillLaunch(rows, '2026-10-01T15:00:00.000Z'), false);
  assert.equal(campaignScheduleCanStillLaunch(rows, '2026-10-08T00:00:00.000Z'), false);
  assert.equal(campaignScheduleCanStillLaunch(rows.slice(1), '2026-09-30T00:00:00.000Z'), false);
});

test('runtime stays pre-launch when no authoritative cycle schedule exists', () => {
  assert.deepEqual(getCampaignScheduleState('2026-09-19T23:00:00Z', []), {
    phase: 'PRE_LAUNCH',
    label: 'Campaign dates pending',
    targetAt: null,
    currentCycle: null,
  });
  const runtime = getCampaignRuntimeState('DRAFT', '2026-09-19T23:00:00Z', {
    participationEnabled: false,
    scheduleReady: false,
    cycles: [],
  });
  assert.equal(runtime.displayLabel, 'PRE-LAUNCH');
  assert.equal(runtime.operational, false);
});

test('runtime advances deterministically from authoritative database cycle rows', () => {
  const rows = fiveCycles('2026-10-01T15:00:00.000Z');
  const activeOpensAt = rows[0].opens_at;
  const activeClosesAt = rows.at(-1).closes_at;
  const reviewOpensAt = new Date(Date.parse(activeClosesAt) + 24 * hour).toISOString();
  const reviewCheckpointAt = new Date(Date.parse(reviewOpensAt) + 48 * hour).toISOString();
  const reviewClosesAt = new Date(Date.parse(reviewOpensAt) + 72 * hour).toISOString();

  assert.equal(getCampaignScheduleState('2026-10-01T14:59:59.999Z', rows).phase, 'PRE_LAUNCH');
  assert.deepEqual(getCampaignScheduleState(activeOpensAt, rows), {
    phase: 'ACTIVE', label: 'Cycle 1 closes', targetAt: rows[0].closes_at, currentCycle: 1,
  });
  assert.equal(getCampaignScheduleState(rows[1].opens_at, rows).currentCycle, 2);
  assert.equal(getCampaignScheduleState(activeClosesAt, rows).phase, 'HANDOFF');
  assert.equal(getCampaignScheduleState(reviewOpensAt, rows).phase, 'REVIEW');
  assert.equal(getCampaignScheduleState(reviewCheckpointAt, rows).phase, 'REVIEW_EXTENSION');
  assert.equal(getCampaignScheduleState(reviewClosesAt, rows).phase, 'POST_REVIEW');
  assert.throws(() => getCampaignScheduleState('not-a-date', rows), /invalid campaign schedule timestamp/);
});

test('calendar time cannot open operations without ACTIVE database state and enabled participation', () => {
  const rows = fiveCycles('2026-10-01T15:00:00.000Z');
  const now = '2026-10-02T15:00:00Z';
  const blocked = getCampaignRuntimeState('DRAFT', now, {
    participationEnabled: true,
    scheduleReady: true,
    cycles: rows,
  });
  assert.equal(blocked.schedule.currentCycle, 1);
  assert.equal(blocked.operational, false);
  assert.equal(blocked.displayLabel, 'LAUNCH BLOCKED');

  const live = getCampaignRuntimeState('ACTIVE', now, {
    participationEnabled: true,
    scheduleReady: true,
    cycles: rows,
  });
  assert.equal(live.operational, true);
  assert.equal(live.displayLabel, 'CYCLE 1 LIVE');

  assert.equal(getCampaignRuntimeState('ACTIVE', '2026-09-30T15:00:00Z', {
    participationEnabled: true,
    scheduleReady: true,
    cycles: rows,
  }).operational, false);
});

test('historical schedule migration remains immutable history and never activates Bond', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260825073000_lock_bond_the_duck_schedule.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /cycle_id between 1 and 7/g);
  assert.match(sql, /refusing to reschedule Bond the Duck after cycle evidence exists/);
  assert.doesNotMatch(sql, /update\s+public\.campaigns[\s\S]*state/i);
  assert.doesNotMatch(sql, /grant\s+.*\s+to\s+(anon|authenticated)/i);
});
