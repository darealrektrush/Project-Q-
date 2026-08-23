import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCampaignTimeline,
  buildCampaignMilestones,
  buildCampaignTimelineText,
  parsePacificStart,
  saveDraftCampaignTimeline,
} from '../src/campaign/timeline.js';

test('Vancouver campaign start produces five contiguous 48-hour cycles', () => {
  const timeline = buildCampaignTimeline('2026-09-01 08:00', new Date('2026-08-22T00:00:00Z'));
  assert.equal(timeline.length, 5);
  assert.equal(timeline[0].opensAt, '2026-09-01T15:00:00.000Z');
  assert.equal(timeline[4].closesAt, '2026-09-11T15:00:00.000Z');
  for (let index = 1; index < timeline.length; index += 1) {
    assert.equal(timeline[index].opensAt, timeline[index - 1].closesAt);
  }
});

test('timeline derives the review, Day 13 and phased-release milestones', () => {
  const timeline = buildCampaignTimeline('2026-09-01 08:00', new Date('2026-08-22T00:00:00Z'));
  const milestones = buildCampaignMilestones(timeline);

  assert.deepEqual(milestones, {
    activityClosesAt: '2026-09-11T15:00:00.000Z',
    reviewClosesAt: '2026-09-14T15:00:00.000Z',
    day13ReleaseAt: '2026-09-14T15:00:00.000Z',
    phasedReleaseCompletesAt: '2026-10-14T15:00:00.000Z',
  });
  const text = buildCampaignTimelineText(timeline);
  assert.match(text, /Review & release milestones/);
  assert.match(text, /Day 13 release: Sep 14, 2026, 8:00 a\.m\. PDT/);
  assert.match(text, /Phased 25% completes: Oct 14, 2026, 8:00 a\.m\. PDT/);
});

test('milestones reject incomplete and invalid timelines', () => {
  assert.throws(() => buildCampaignMilestones([]), /Five campaign cycles/);
  assert.throws(() => buildCampaignMilestones([
    { closesAt: 'x' }, { closesAt: 'x' }, { closesAt: 'x' }, { closesAt: 'x' }, { closesAt: 'x' },
  ]), /invalid closing date/);
});

test('timeline parser rejects malformed and invalid Vancouver dates', () => {
  assert.throws(() => parsePacificStart('September 1'), /YYYY-MM-DD/);
  assert.throws(() => parsePacificStart('2027-02-30 08:00'), /daylight-saving/);
});

test('timeline save is draft-only and preserves existing allocations', async () => {
  const timeline = buildCampaignTimeline('2026-09-01 08:00', new Date('2026-08-22T00:00:00Z'));
  let saved;
  const client = {
    select: async (table) => table === 'campaigns'
      ? [{ state: 'DRAFT' }]
      : [{ cycle_id: 1, allocation_base_units: '123', finalized_at: null }],
    upsert: async (table, rows, conflict) => { saved = { table, rows, conflict }; },
  };
  await saveDraftCampaignTimeline(client, timeline, 42);
  assert.equal(saved.table, 'cycles');
  assert.equal(saved.conflict, 'campaign_id,cycle_id');
  assert.equal(saved.rows[0].allocation_base_units, '123');
  assert.equal(saved.rows[1].allocation_base_units, '0');
});

test('timeline save refuses active or finalized campaigns', async () => {
  const timeline = buildCampaignTimeline('2026-09-01 08:00', new Date('2026-08-22T00:00:00Z'));
  await assert.rejects(() => saveDraftCampaignTimeline({
    select: async (table) => table === 'campaigns' ? [{ state: 'ACTIVE' }] : [],
  }, timeline, 42), /only while the campaign is DRAFT/);
  await assert.rejects(() => saveDraftCampaignTimeline({
    select: async (table) => table === 'campaigns'
      ? [{ state: 'DRAFT' }]
      : [{ cycle_id: 1, allocation_base_units: '0', finalized_at: '2026-09-03T00:00:00Z' }],
  }, timeline, 42), /finalized cycle/);
});
