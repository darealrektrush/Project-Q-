import { DEFAULT_CAMPAIGN_ID } from './service.js';

const CYCLE_COUNT = 5;
const CYCLE_MS = 48 * 60 * 60 * 1000;
const REVIEW_MS = 72 * 60 * 60 * 1000;
const PHASED_RELEASE_MS = 30 * 24 * 60 * 60 * 1000;
const PACIFIC_ZONE = 'America/Vancouver';

function campaignId(env = process.env) {
  return env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
}

function localParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PACIFIC_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function formatPacificDate(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PACIFIC_ZONE,
    year: 'numeric', month: 'short', day: '2-digit',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(value));
}

export function parsePacificStart(input) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(input.trim());
  if (!match) throw new Error('Use YYYY-MM-DD HH:MM, for example 2026-09-01 08:00.');
  const [, year, month, day, hour, minute] = match;
  const numbers = [year, month, day, hour, minute].map(Number);
  const [y, m, d, h, min] = numbers;
  if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59) {
    throw new Error('That date or time is not valid.');
  }

  const desiredUtc = Date.UTC(y, m - 1, d, h, min, 0);
  let instant = new Date(desiredUtc);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = localParts(instant);
    const representedUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    instant = new Date(instant.getTime() + (desiredUtc - representedUtc));
  }
  const verified = localParts(instant);
  if ([verified.year, verified.month, verified.day, verified.hour, verified.minute].join('-')
    !== [year, month, day, hour, minute].join('-')) {
    throw new Error('That local time does not exist because of a daylight-saving change. Choose another time.');
  }
  return instant;
}

export function buildCampaignTimeline(startInput, now = new Date()) {
  const start = parsePacificStart(startInput);
  if (start.getTime() <= now.getTime()) throw new Error('The campaign start must be in the future.');
  return Array.from({ length: CYCLE_COUNT }, (_, index) => {
    const opensAt = new Date(start.getTime() + index * CYCLE_MS);
    const closesAt = new Date(opensAt.getTime() + CYCLE_MS);
    return { cycleId: index + 1, opensAt: opensAt.toISOString(), closesAt: closesAt.toISOString() };
  });
}

export function buildCampaignMilestones(timeline) {
  if (!Array.isArray(timeline) || timeline.length !== CYCLE_COUNT) {
    throw new Error('Five campaign cycles are required to calculate milestones.');
  }
  const activityClosesAt = new Date(timeline[CYCLE_COUNT - 1].closesAt);
  if (Number.isNaN(activityClosesAt.getTime())) throw new Error('The campaign timeline contains an invalid closing date.');
  const day13ReleaseAt = new Date(activityClosesAt.getTime() + REVIEW_MS);
  const phasedReleaseCompletesAt = new Date(day13ReleaseAt.getTime() + PHASED_RELEASE_MS);
  return {
    activityClosesAt: activityClosesAt.toISOString(),
    reviewClosesAt: day13ReleaseAt.toISOString(),
    day13ReleaseAt: day13ReleaseAt.toISOString(),
    phasedReleaseCompletesAt: phasedReleaseCompletesAt.toISOString(),
  };
}

export function buildCampaignTimelineText(timeline, heading = 'Bond the Duck // Timeline Preview') {
  const milestones = buildCampaignMilestones(timeline);
  return [
    `🗓 *${heading}*`,
    '_Vancouver time • five consecutive 48-hour cycles_',
    '',
    ...timeline.map((cycle) => [
      `*Cycle ${cycle.cycleId}*`,
      `${formatPacificDate(cycle.opensAt)} → ${formatPacificDate(cycle.closesAt)}`,
    ].join('\n')),
    '',
    '*Review & release milestones*',
    `Activity closes: ${formatPacificDate(milestones.activityClosesAt)}`,
    `Verification deadline: ${formatPacificDate(milestones.reviewClosesAt)}`,
    `Day 13 release: ${formatPacificDate(milestones.day13ReleaseAt)}`,
    `Phased 25% completes: ${formatPacificDate(milestones.phasedReleaseCompletesAt)}`,
  ].join('\n');
}

export async function getCampaignTimeline(client, env = process.env) {
  const id = campaignId(env);
  const rows = await client.select(
    'cycles',
    `?campaign_id=eq.${encodeURIComponent(id)}&select=cycle_id,opens_at,closes_at,finalized_at&order=cycle_id.asc`
  );
  return rows.map((row) => ({
    cycleId: Number(row.cycle_id), opensAt: row.opens_at, closesAt: row.closes_at,
    finalizedAt: row.finalized_at,
  }));
}

export async function saveDraftCampaignTimeline(client, timeline, adminUserId, env = process.env) {
  const id = campaignId(env);
  if (!Array.isArray(timeline) || timeline.length !== CYCLE_COUNT) throw new Error('Five campaign cycles are required.');
  const [campaignRows, existingRows] = await Promise.all([
    client.select('campaigns', `?id=eq.${encodeURIComponent(id)}&select=state&limit=1`),
    client.select('cycles', `?campaign_id=eq.${encodeURIComponent(id)}&select=cycle_id,allocation_base_units,finalized_at`),
  ]);
  if (campaignRows[0]?.state !== 'DRAFT') throw new Error('Timeline changes are allowed only while the campaign is DRAFT.');
  if (existingRows.some((row) => row.finalized_at)) throw new Error('A finalized cycle cannot be rescheduled.');
  const allocations = new Map(existingRows.map((row) => [Number(row.cycle_id), row.allocation_base_units]));
  const rows = timeline.map((cycle) => ({
    campaign_id: id,
    cycle_id: cycle.cycleId,
    opens_at: cycle.opensAt,
    closes_at: cycle.closesAt,
    allocation_base_units: allocations.get(cycle.cycleId) ?? '0',
  }));
  await client.upsert('cycles', rows, 'campaign_id,cycle_id');
  console.info('campaign timeline updated', { campaignId: id, adminUserId: String(adminUserId) });
  return rows;
}
