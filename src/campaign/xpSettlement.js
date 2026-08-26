// Campaign XP settlement: turns accepted-but-uncredited Oracle raid events
// into `xp_ledger` awards. `ingest_oracle_raid_event` only records that a
// verified action arrived (`credited=false`); it never decides how much,
// or whether, that action is worth in campaign XP. This module is the
// separate settlement pipeline the ingest bridge and docs describe:
// docs/BOND-THE-DUCK-TELEGRAM-UI.md: "An accepted event is stored with
// credited=false; ... The separate campaign settlement pipeline applies
// the campaign's daily caps and writes any award to xp_ledger."
//
// Numbers below are the public campaign ruleset already shipped in
// public/campaign-app/campaigns/bond-the-duck-2026.json and referenced in
// src/campaign/ui.js: Oracle X Raids pay "Up to 20 XP" across 5 verified
// actions/day (4 XP each) inside the 20/day "Project Q missions" cap, and
// every award also counts against the 75/day overall cap. Website voting
// and Telegram-bot XP settle through participationSettlement.js instead --
// see that file and supabase/campaign_participation.sql.

import { DAILY_XP_CAPS, campaignDayKey, loadDailyXpUsage } from './xpCaps.js';

export { DAILY_XP_CAPS };
export const RAID_XP_PER_ACTION = 4;

const PENDING_RAID_EVENTS_QUERY =
  '?credited=eq.false&reason=is.null&select=id,cycle_id,telegram_user_id,verified_at,action,raid_id' +
  '&order=verified_at.asc';

// Settles exactly one pending raid event. Exported separately so callers
// (and tests) can settle a single known event without a full sweep.
export async function settleRaidEvent(client, campaignId, event, now = new Date()) {
  const day = campaignDayKey(now);
  const usage = await loadDailyXpUsage(client, campaignId, event.telegram_user_id, day);
  const overallRemaining = Math.max(0, DAILY_XP_CAPS.overall - usage.overall);
  const missionRemaining = Math.max(0, DAILY_XP_CAPS.mission - usage.mission);
  const amount = Math.min(RAID_XP_PER_ACTION, overallRemaining, missionRemaining);

  if (amount <= 0) {
    await client.update('campaign_raid_events', `?id=eq.${event.id}&credited=eq.false`, {
      reason: 'daily_cap_reached',
    });
    return { eventId: event.id, credited: false, amount: 0, reason: 'daily_cap_reached' };
  }

  // xp_ledger is append-only (DB trigger rejects UPDATE/DELETE); a stable
  // idempotency_key tied to the raid event id keeps a re-run of this sweep
  // from double-crediting the same action.
  await client.insert('xp_ledger', [{
    campaign_id: campaignId,
    cycle_id: event.cycle_id,
    telegram_user_id: event.telegram_user_id,
    source: 'raid',
    cap_bucket: 'mission',
    amount,
    mission_code: 'oracle-raids',
    idempotency_key: `raid-settlement:${event.id}`,
    awarded_at: now.toISOString(),
  }]);

  const credited = await client.update('campaign_raid_events', `?id=eq.${event.id}&credited=eq.false`, {
    credited: true,
  });
  if (!credited?.length) {
    // Lost a race with another settlement run after the XP insert above.
    // The idempotency_key unique constraint on xp_ledger already prevents a
    // duplicate award; surface this loudly rather than pretending success.
    throw new Error(`raid event ${event.id} was credited concurrently`);
  }

  return { eventId: event.id, credited: true, amount, reason: null };
}

// Sweeps every pending raid event for one campaign, oldest first, so a
// participant's earliest verified actions consume their daily cap before
// later ones. Processes events sequentially: each settlement depends on the
// running daily total for that participant, so they cannot run concurrently
// against the same user without re-reading fresh usage.
export async function settleCampaignRaidXp(client, campaignId, { now = new Date(), limit = 200 } = {}) {
  const campaignRows = await client.select(
    'campaigns',
    `?id=eq.${encodeURIComponent(campaignId)}&select=id,state&limit=1`
  );
  if (campaignRows[0]?.state !== 'ACTIVE') {
    return { settled: [], skipped: 'campaign is not ACTIVE' };
  }

  const pending = await client.select(
    'campaign_raid_events',
    `${PENDING_RAID_EVENTS_QUERY}&limit=${limit}`
  );

  const settled = [];
  for (const event of pending) {
    settled.push(await settleRaidEvent(client, campaignId, event, now));
  }
  return { settled, skipped: null };
}
