export const CAMPAIGN_TIME_ZONE = 'America/Vancouver';

export const CYCLE_HOURS = 48;
export const EXPECTED_CYCLES = 5;
export const REVIEW_HANDOFF_DELAY_HOURS = 24;
export const REVIEW_CHECKPOINT_HOURS = 48;
export const REVIEW_MAX_HOURS = 72;
export const PHASED_RELEASE_OFFSETS_DAYS = Object.freeze([6, 12, 18, 24, 30]);

const HOUR_MS = 60 * 60 * 1000;
const CYCLE_MS = CYCLE_HOURS * HOUR_MS;

function timestamp(value) {
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requireTimestamp(value) {
  const parsed = timestamp(value);
  if (!Number.isFinite(parsed)) throw new Error('invalid campaign schedule timestamp');
  return parsed;
}

function orderedCycles(rows = []) {
  if (!Array.isArray(rows)) return [];
  return [...rows].sort((a, b) => Number(a.cycle_id) - Number(b.cycle_id));
}

function normalizedSchedule(rows = []) {
  const ordered = orderedCycles(rows);
  if (ordered.length !== EXPECTED_CYCLES) return null;

  const cycles = ordered.map((row, index) => {
    const opensAt = timestamp(row.opens_at);
    const closesAt = timestamp(row.closes_at);
    if (
      Number(row.cycle_id) !== index + 1
      || !Number.isFinite(opensAt)
      || !Number.isFinite(closesAt)
      || closesAt - opensAt !== CYCLE_MS
      || (index > 0 && opensAt !== timestamp(ordered[index - 1].closes_at))
    ) return null;
    return {
      cycleId: index + 1,
      opensAt: new Date(opensAt).toISOString(),
      closesAt: new Date(closesAt).toISOString(),
    };
  });

  if (cycles.some((cycle) => cycle === null)) return null;

  const activeOpensAt = cycles[0].opensAt;
  const activeClosesAt = cycles.at(-1).closesAt;
  const reviewOpensAt = new Date(timestamp(activeClosesAt) + (REVIEW_HANDOFF_DELAY_HOURS * HOUR_MS)).toISOString();
  const review48HourCheckpointAt = new Date(timestamp(reviewOpensAt) + (REVIEW_CHECKPOINT_HOURS * HOUR_MS)).toISOString();
  const reviewClosesAt = new Date(timestamp(reviewOpensAt) + (REVIEW_MAX_HOURS * HOUR_MS)).toISOString();

  return {
    cycles,
    activeOpensAt,
    activeClosesAt,
    reviewOpensAt,
    review48HourCheckpointAt,
    reviewClosesAt,
  };
}

export function getCampaignScheduleState(now = new Date(), rows = []) {
  const current = requireTimestamp(now);
  const schedule = normalizedSchedule(rows);

  if (!schedule) {
    return {
      phase: 'PRE_LAUNCH',
      label: 'Campaign dates pending',
      targetAt: null,
      currentCycle: null,
    };
  }

  const activeOpens = timestamp(schedule.activeOpensAt);
  const activeCloses = timestamp(schedule.activeClosesAt);
  const reviewOpens = timestamp(schedule.reviewOpensAt);
  const reviewCheckpoint = timestamp(schedule.review48HourCheckpointAt);
  const reviewCloses = timestamp(schedule.reviewClosesAt);

  if (current < activeOpens) {
    return {
      phase: 'PRE_LAUNCH',
      label: 'Campaign opens',
      targetAt: schedule.activeOpensAt,
      currentCycle: null,
    };
  }
  if (current < activeCloses) {
    const currentCycle = schedule.cycles.find(({ opensAt, closesAt }) =>
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
    return {
      phase: 'HANDOFF',
      label: 'Final review opens',
      targetAt: schedule.reviewOpensAt,
      currentCycle: null,
    };
  }
  if (current < reviewCheckpoint) {
    return {
      phase: 'REVIEW',
      label: '48-hour review checkpoint',
      targetAt: schedule.review48HourCheckpointAt,
      currentCycle: null,
    };
  }
  if (current < reviewCloses) {
    return {
      phase: 'REVIEW_EXTENSION',
      label: 'Final review deadline',
      targetAt: schedule.reviewClosesAt,
      currentCycle: null,
    };
  }
  return {
    phase: 'POST_REVIEW',
    label: 'Final review complete',
    targetAt: null,
    currentCycle: null,
  };
}

export function getCampaignRuntimeState(databaseState = 'DRAFT', now = new Date(), {
  participationEnabled = false,
  scheduleReady = false,
  cycles = [],
} = {}) {
  const schedule = getCampaignScheduleState(now, cycles);
  const state = String(databaseState || 'DRAFT');
  const operational = scheduleReady
    && schedule.phase === 'ACTIVE'
    && state === 'ACTIVE'
    && participationEnabled;
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

  return {
    databaseState: state,
    participationEnabled,
    scheduleReady,
    operational,
    displayLabel,
    tone,
    schedule,
  };
}

export function lockedCampaignCyclesMatch(rows) {
  return normalizedSchedule(rows) !== null;
}

export function campaignScheduleCanStillLaunch(rows, now = new Date()) {
  const schedule = normalizedSchedule(rows);
  if (!schedule) return false;
  return timestamp(schedule.activeOpensAt) > requireTimestamp(now);
}
