// Settles accepted-but-uncredited participation events (website votes,
// Telegram trending-bot confirmations) into xp_ledger. Same shape as
// xpSettlement.js's raid settlement, sharing the daily-cap accounting in
// xpCaps.js so the two pipelines can never independently double-spend a
// participant's daily allowance.
//
// Per the corrected master spec ("Bond the Duck - Finalized Master Campaign
// Build 3"), website voting and Telegram-bot confirmations are NOT the same
// flat rate:
//   - Telegram trending bots: 2 XP per verified bot confirmation, flat, no
//     bonus. Up to 8 XP/day across the 4 named bots.
//   - Website voting: 1 XP per accepted site, PLUS a one-time 2 XP
//     "all currently-available sites completed" bonus once every voting
//     site that is currently accepting verified events (classification not
//     SOURCE_UNAVAILABLE/REMOVED_FOR_INTEGRITY) has been credited for that
//     participant in this campaign. Max 11 XP for all 9 sites (9 + 2).
// Both still settle through the shared 15 XP/day participation cap and the
// 75 XP/day overall cap.

import { DAILY_XP_CAPS, utcDayKey, loadDailyXpUsage } from './xpCaps.js';

export const VOTE_XP_PER_SITE = 1;
export const VOTE_COMPLETION_BONUS_XP = 2;
export const BOT_XP_PER_ACTION = 2;

const PENDING_PARTICIPATION_EVENTS_QUERY =
  '?credited=eq.false&reason=is.null&select=id,cycle_id,source,source_key,telegram_user_id,verified_at' +
  '&order=verified_at.asc';

function voteBonusIdempotencyKey(campaignId, telegramUserId) {
  return `participation-vote-bonus:${campaignId}:${telegramUserId}`;
}

async function hasVoteCompletionBonus(client, campaignId, telegramUserId) {
  const rows = await client.select(
    'xp_ledger',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}` +
      `&idempotency_key=eq.${encodeURIComponent(voteBonusIdempotencyKey(campaignId, telegramUserId))}` +
      '&select=id&limit=1'
  );
  return rows.length > 0;
}

// Voting sites currently accepting verified events. A site pulled out of
// rotation (SOURCE_UNAVAILABLE) or permanently dropped (REMOVED_FOR_INTEGRITY)
// no longer counts toward "all sites completed", matching how the ingest RPC
// itself refuses events for those classifications.
async function countAvailableVoteSites(client, campaignId) {
  const rows = await client.select(
    'verification_sources',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}&source=eq.vote` +
      '&classification=not.in.(SOURCE_UNAVAILABLE,REMOVED_FOR_INTEGRITY)' +
      '&select=source_key'
  );
  return rows.length;
}

async function countCreditedVoteSites(client, campaignId, telegramUserId) {
  const rows = await client.select(
    'campaign_participation_events',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}` +
      `&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
      '&source=eq.vote&credited=eq.true&select=source_key'
  );
  return new Set(rows.map((row) => row.source_key)).size;
}

// Opportunistically awards the one-time all-sites bonus once every currently
// available voting site has been credited for this participant. `usage` is
// the caller's in-flight daily-usage snapshot (already updated for the site
// XP just awarded in the same settlement pass) so this doesn't need a second
// loadDailyXpUsage round trip.
//
// Known limitation: if the bonus is blocked by a same-day cap, it is only
// retried the next time a *new* vote event for that participant is settled
// (not on a bare cron sweep with nothing pending) -- acceptable for a
// one-time bonus that isn't itself time-sensitive.
async function maybeAwardVoteCompletionBonus(client, campaignId, event, now, usage) {
  const alreadyPaid = await hasVoteCompletionBonus(client, campaignId, event.telegram_user_id);
  if (alreadyPaid) return 0;

  const availableSites = await countAvailableVoteSites(client, campaignId);
  if (availableSites <= 0) return 0;

  const creditedSites = await countCreditedVoteSites(client, campaignId, event.telegram_user_id);
  if (creditedSites < availableSites) return 0;

  const overallRemaining = Math.max(0, DAILY_XP_CAPS.overall - usage.overall);
  const participationRemaining = Math.max(0, DAILY_XP_CAPS.participation - usage.participation);
  const bonusAmount = Math.min(VOTE_COMPLETION_BONUS_XP, overallRemaining, participationRemaining);
  if (bonusAmount <= 0) return 0;

  await client.insert('xp_ledger', [{
    campaign_id: campaignId,
    cycle_id: event.cycle_id,
    telegram_user_id: event.telegram_user_id,
    source: 'vote',
    cap_bucket: 'participation',
    amount: bonusAmount,
    mission_code: 'website-voting-all-sites-bonus',
    idempotency_key: voteBonusIdempotencyKey(campaignId, event.telegram_user_id),
    awarded_at: now.toISOString(),
  }]);

  return bonusAmount;
}

// Settles exactly one pending participation event.
export async function settleParticipationEvent(client, campaignId, event, now = new Date()) {
  const day = utcDayKey(now.toISOString());
  const usage = await loadDailyXpUsage(client, campaignId, event.telegram_user_id, day);
  const overallRemaining = Math.max(0, DAILY_XP_CAPS.overall - usage.overall);
  const participationRemaining = Math.max(0, DAILY_XP_CAPS.participation - usage.participation);

  const perActionAmount = event.source === 'vote' ? VOTE_XP_PER_SITE : BOT_XP_PER_ACTION;
  const amount = Math.min(perActionAmount, overallRemaining, participationRemaining);

  if (amount <= 0) {
    await client.update('campaign_participation_events', `?id=eq.${event.id}&credited=eq.false`, {
      reason: 'daily_cap_reached',
    });
    return { eventId: event.id, credited: false, amount: 0, bonusAmount: 0, reason: 'daily_cap_reached' };
  }

  await client.insert('xp_ledger', [{
    campaign_id: campaignId,
    cycle_id: event.cycle_id,
    telegram_user_id: event.telegram_user_id,
    source: event.source,
    cap_bucket: 'participation',
    amount,
    mission_code: event.source_key,
    idempotency_key: `participation-settlement:${event.id}`,
    awarded_at: now.toISOString(),
  }]);

  const credited = await client.update('campaign_participation_events', `?id=eq.${event.id}&credited=eq.false`, {
    credited: true,
  });
  if (!credited?.length) {
    // Lost a race with another settlement run after the XP insert above.
    // The idempotency_key unique constraint on xp_ledger already prevents a
    // duplicate award; surface this loudly rather than pretending success.
    throw new Error(`participation event ${event.id} was credited concurrently`);
  }

  // Keep the in-memory usage snapshot current so a same-pass completion-bonus
  // check (and any later event in this sweep for the same participant) sees
  // an accurate running total without re-querying xp_ledger.
  usage.overall += amount;
  usage.participation += amount;

  let bonusAmount = 0;
  if (event.source === 'vote') {
    bonusAmount = await maybeAwardVoteCompletionBonus(client, campaignId, event, now, usage);
  }

  return { eventId: event.id, credited: true, amount, bonusAmount, reason: null };
}

// Sweeps every pending participation event for one campaign, oldest first,
// for the same reason xpSettlement.js does: a participant's earliest
// verified actions should consume their daily cap before later ones.
export async function settleCampaignParticipationXp(client, campaignId, { now = new Date(), limit = 200 } = {}) {
  const campaignRows = await client.select(
    'campaigns',
    `?id=eq.${encodeURIComponent(campaignId)}&select=id,state&limit=1`
  );
  if (campaignRows[0]?.state !== 'ACTIVE') {
    return { settled: [], skipped: 'campaign is not ACTIVE' };
  }

  const pending = await client.select(
    'campaign_participation_events',
    `${PENDING_PARTICIPATION_EVENTS_QUERY}&limit=${limit}`
  );

  const settled = [];
  for (const event of pending) {
    settled.push(await settleParticipationEvent(client, campaignId, event, now));
  }
  return { settled, skipped: null };
}
