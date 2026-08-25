export const CAMPAIGN_TIME_ZONE = 'America/Vancouver';
export const ACTIVE_OPENS_AT = '2026-09-01T15:00:00.000Z';
export const ACTIVE_CLOSES_AT = '2026-09-15T15:00:00.000Z';
export const REVIEW_OPENS_AT = '2026-09-16T15:00:00.000Z';
export const REVIEW_48_HOUR_CHECKPOINT_AT = '2026-09-18T15:00:00.000Z';
export const REVIEW_CLOSES_AT = '2026-09-19T15:00:00.000Z';

export const CYCLE_HOURS = 48;
export const EXPECTED_CYCLES = 7;
export const PHASED_RELEASE_OFFSETS_DAYS = Object.freeze([6, 12, 18, 24, 30]);

const CYCLE_MS = CYCLE_HOURS * 60 * 60 * 1000;

export const LOCKED_CYCLES = Object.freeze(Array.from({ length: EXPECTED_CYCLES }, (_, index) => {
  const opensAt = new Date(Date.parse(ACTIVE_OPENS_AT) + (index * CYCLE_MS));
  const closesAt = new Date(opensAt.getTime() + CYCLE_MS);
  return Object.freeze({
    cycleId: index + 1,
    opensAt: opensAt.toISOString(),
    closesAt: closesAt.toISOString(),
  });
}));

function timestamp(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requireTimestamp(value) {
  const parsed = value instanceof Date ? value.getTime() : timestamp(value);
  if (!Number.isFinite(parsed)) throw new Error('invalid campaign schedule timestamp');
  return parsed;
}

export function getCampaignScheduleState(now = new Date()) {
  const current = requireTimestamp(now);
  const activeOpens = timestamp(ACTIVE_OPENS_AT);
  const activeCloses = timestamp(ACTIVE_CLOSES_AT);
  const reviewOpens = timestamp(REVIEW_OPENS_AT);
  const reviewCheckpoint = timestamp(REVIEW_48_HOUR_CHECKPOINT_AT);
  const reviewCloses = timestamp(REVIEW_CLOSES_AT);

  if (current < activeOpens) {
    return { phase: 'PRE_LAUNCH', label: 'Campaign opens', targetAt: ACTIVE_OPENS_AT, currentCycle: null };
  }
  if (current < activeCloses) {
    const currentCycle = LOCKED_CYCLES.find(({ opensAt, closesAt }) =>
      current >= timestamp(opensAt) && current < timestamp(closesAt)
    );
    return {
      phase: 'ACTIVE',
      label: `Cycle ${currentCycle.cycleId} closes`,
      targetAt: currentCycle.closesAt,
      currentCycle: currentCycle.cycleId,
    };
  }
  if (current < reviewOpens) {
    return { phase: 'HANDOFF', label: 'Final review opens', targetAt: REVIEW_OPENS_AT, currentCycle: null };
  }
  if (current < reviewCheckpoint) {
    return {
      phase: 'REVIEW',
      label: '48-hour review checkpoint',
      targetAt: REVIEW_48_HOUR_CHECKPOINT_AT,
      currentCycle: null,
    };
  }
  if (current < reviewCloses) {
    return {
      phase: 'REVIEW_EXTENSION',
      label: 'Final review deadline',
      targetAt: REVIEW_CLOSES_AT,
      currentCycle: null,
    };
  }
  return { phase: 'POST_REVIEW', label: 'Final review complete', targetAt: null, currentCycle: null };
}

export function getCampaignRuntimeState(databaseState = 'DRAFT', now = new Date(), {
  participationEnabled = false,
  scheduleReady = false,
} = {}) {
  const schedule = getCampaignScheduleState(now);
  const state = String(databaseState || 'DRAFT');
  const operational = schedule.phase === 'ACTIVE' && state === 'ACTIVE' && participationEnabled && scheduleReady;
  let displayLabel = schedule.phase.replaceAll('_', ' ');
  let tone = 'pending';

  if (schedule.phase === 'PRE_LAUNCH') displayLabel = 'PRE-LAUNCH';
  if (schedule.phase === 'ACTIVE') {
    displayLabel = operational ? `CYCLE ${schedule.currentCycle} LIVE` : 'LAUNCH BLOCKED';
    tone = operational ? 'success' : 'blocked';
  }
  if (schedule.phase === 'HANDOFF') displayLabel = 'CAMPAIGN HANDOFF';
  if (schedule.phase === 'REVIEW') displayLabel = 'FINAL REVIEW';
  if (schedule.phase === 'REVIEW_EXTENSION') displayLabel = 'EXTENDED REVIEW';
  if (schedule.phase === 'POST_REVIEW') displayLabel = 'POST-REVIEW';

  return { databaseState: state, participationEnabled, scheduleReady, operational, displayLabel, tone, schedule };
}

export function lockedCampaignCyclesMatch(rows) {
  if (!Array.isArray(rows) || rows.length !== EXPECTED_CYCLES) return false;
  const ordered = [...rows].sort((a, b) => Number(a.cycle_id) - Number(b.cycle_id));
  return ordered.every((row, index) => {
    const locked = LOCKED_CYCLES[index];
    return Number(row.cycle_id) === locked.cycleId
      && timestamp(row.opens_at) === timestamp(locked.opensAt)
      && timestamp(row.closes_at) === timestamp(locked.closesAt);
  });
}
