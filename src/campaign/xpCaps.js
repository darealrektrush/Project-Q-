// Shared daily-cap accounting for every campaign XP settlement pipeline
// (Oracle raids in xpSettlement.js, website voting / Telegram-bot
// participation in participationSettlement.js, and whatever else lands in
// xp_ledger later). Kept in one place so every source checks the exact same
// numbers instead of each settlement module re-deriving them.
//
// Numbers are the public campaign ruleset already shipped in
// public/campaign-app/campaigns/bond-the-duck-2026.json and referenced in
// src/campaign/ui.js: a 75/day overall cap, a 20/day "Project Q missions"
// cap (Oracle raids today), a 15/day participation cap for website voting
// and Community Pulse, and a dedicated 20/day Telegram trending-bot cap.

export const DAILY_XP_CAPS = Object.freeze({
  overall: 75,
  mission: 20,
  participation: 15,
  trending: 20,
});

export const CAMPAIGN_TIME_ZONE = 'America/Vancouver';

function zonedParts(timestamp, timeZone = CAMPAIGN_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function campaignDayKey(timestamp, timeZone = CAMPAIGN_TIME_ZONE) {
  const parts = zonedParts(timestamp, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function zonedMidnight(day, timeZone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day))) throw new Error('invalid campaign day');
  const [year, month, date] = day.split('-').map(Number);
  const targetWallTime = Date.UTC(year, month - 1, date);
  let candidate = targetWallTime;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedParts(candidate, timeZone);
    const representedWallTime = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    const adjustment = targetWallTime - representedWallTime;
    candidate += adjustment;
    if (adjustment === 0) break;
  }
  return new Date(candidate);
}

export function campaignDayBounds(day, timeZone = CAMPAIGN_TIME_ZONE) {
  const [year, month, date] = String(day).split('-').map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
  const start = zonedMidnight(day, timeZone);
  const end = zonedMidnight(nextDay, timeZone);
  if (campaignDayKey(start, timeZone) !== day || !(end > start)) {
    throw new Error('could not resolve campaign day boundaries');
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function loadDailyXpUsage(client, campaignId, telegramUserId, day) {
  const { start, end } = campaignDayBounds(day);
  const rows = await client.select(
    'xp_ledger',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}` +
      `&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
      `&awarded_at=gte.${encodeURIComponent(start)}` +
      `&awarded_at=lt.${encodeURIComponent(end)}` +
      '&select=amount,cap_bucket'
  );
  return rows.reduce(
    (totals, row) => {
      const amount = Number(row.amount);
      totals.overall += amount;
      totals[row.cap_bucket] = (totals[row.cap_bucket] ?? 0) + amount;
      return totals;
    },
    { overall: 0, mission: 0, participation: 0, trending: 0, other: 0 }
  );
}
