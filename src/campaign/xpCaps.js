// Shared daily-cap accounting for every campaign XP settlement pipeline
// (Oracle raids in xpSettlement.js, website voting / Telegram-bot
// participation in participationSettlement.js, and whatever else lands in
// xp_ledger later). Kept in one place so every source checks the exact same
// numbers instead of each settlement module re-deriving them.
//
// Numbers are the public campaign ruleset already shipped in
// public/campaign-app/campaigns/bond-the-duck-2026.json and referenced in
// src/campaign/ui.js: a 75/day overall cap, a 20/day "Project Q missions"
// cap (Oracle raids today), and a 15/day participation cap shared by
// website voting and Telegram-bot confirmations.

export const DAILY_XP_CAPS = Object.freeze({
  overall: 75,
  mission: 20,
  participation: 15,
});

export function utcDayKey(isoTimestamp) {
  return isoTimestamp.slice(0, 10);
}

export async function loadDailyXpUsage(client, campaignId, telegramUserId, day) {
  const rows = await client.select(
    'xp_ledger',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}` +
      `&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
      `&awarded_at=gte.${encodeURIComponent(`${day}T00:00:00.000Z`)}` +
      `&awarded_at=lt.${encodeURIComponent(`${day}T23:59:59.999999Z`)}` +
      '&select=amount,cap_bucket'
  );
  return rows.reduce(
    (totals, row) => {
      const amount = Number(row.amount);
      totals.overall += amount;
      totals[row.cap_bucket] = (totals[row.cap_bucket] ?? 0) + amount;
      return totals;
    },
    { overall: 0, mission: 0, participation: 0, other: 0 }
  );
}
