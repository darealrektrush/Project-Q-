import { createHmac } from 'node:crypto';

import { DEFAULT_CAMPAIGN_ID } from './service.js';
import { DAILY_XP_CAPS, loadDailyXpUsage, utcDayKey } from './xpCaps.js';

export const COMMUNITY_TIME_ZONE = 'America/Vancouver';
export const COMMUNITY_ACTIVITY_RULES = Object.freeze({
  minimumMessages: 5,
  maximumScoredMessages: 10,
  minimumWindows: 3,
  windowMinutes: 30,
  minimumSpanMinutes: 120,
  minimumReplies: 2,
  baseXp: 2,
  rankBonuses: [6, 5, 4, 3, 2],
  maximumDailyXp: 8,
});

function campaignId(env = process.env) {
  return env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
}

function parseIds(value) {
  return new Set(String(value ?? '').split(',').map((id) => id.trim()).filter(Boolean));
}

function localParts(timestamp, timeZone = COMMUNITY_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    day: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function buildCommunityMessageEvent(message, env = process.env) {
  if (env.PROJECT_Q_COMMUNITY_ACTIVITY_ENABLED !== 'true') return null;
  if (!env.PROJECT_Q_COMMUNITY_ACTIVITY_HASH_SECRET) return null;
  if (String(message?.chat?.id ?? '') !== String(env.PROJECT_Q_COMMUNITY_CHAT_ID ?? '')) return null;
  if (!message?.from?.id || message.from.is_bot || !message.text) return null;
  if (parseIds(env.PROJECT_Q_ACTIVITY_EXCLUDED_TELEGRAM_IDS).has(String(message.from.id))) return null;

  const text = normalizeText(message.text);
  if (text.startsWith('/') || text.length < 12) return null;
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length < 3) return null;
  const timestamp = new Date(Number(message.date) * 1000);
  if (!Number.isFinite(timestamp.getTime())) return null;
  const local = localParts(timestamp, env.PROJECT_Q_CAMPAIGN_TIME_ZONE || COMMUNITY_TIME_ZONE);
  const replyTo = message.reply_to_message?.from?.id;
  return {
    campaignId: campaignId(env),
    chatId: String(message.chat.id),
    messageId: String(message.message_id),
    threadId: message.message_thread_id == null ? null : String(message.message_thread_id),
    telegramUserId: String(message.from.id),
    localDay: local.day,
    windowIndex: Math.floor((local.hour * 60 + local.minute) / COMMUNITY_ACTIVITY_RULES.windowMinutes),
    contentHash: createHmac('sha256', env.PROJECT_Q_COMMUNITY_ACTIVITY_HASH_SECRET).update(text).digest('hex'),
    wordCount: words.length,
    replyToUserId: replyTo && String(replyTo) !== String(message.from.id) ? String(replyTo) : null,
    sentAt: timestamp.toISOString(),
  };
}

export async function ingestCommunityMessage(client, event) {
  if (!event) return null;
  return client.rpc('ingest_campaign_community_message', {
    p_campaign_id: event.campaignId,
    p_chat_id: event.chatId,
    p_message_id: event.messageId,
    p_thread_id: event.threadId,
    p_telegram_user_id: event.telegramUserId,
    p_local_day: event.localDay,
    p_window_index: event.windowIndex,
    p_content_hash: event.contentHash,
    p_word_count: event.wordCount,
    p_reply_to_user_id: event.replyToUserId,
    p_sent_at: event.sentAt,
  });
}

export function scoreCommunityParticipant(events, rules = COMMUNITY_ACTIVITY_RULES) {
  const sorted = [...events].sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at));
  const messages = sorted.length;
  const windows = new Set(sorted.map(({ window_index }) => Number(window_index))).size;
  const replies = sorted.filter(({ reply_to_user_id }) => Boolean(reply_to_user_id)).length;
  const spanMinutes = messages > 1
    ? Math.floor((Date.parse(sorted.at(-1).sent_at) - Date.parse(sorted[0].sent_at)) / 60000)
    : 0;
  const eligible = messages >= rules.minimumMessages
    && windows >= rules.minimumWindows
    && replies >= rules.minimumReplies
    && spanMinutes >= rules.minimumSpanMinutes;
  const score = Math.min(messages, rules.maximumScoredMessages)
    + Math.min(replies, 5)
    + Math.min(windows, 4) * 2;
  return { messages, windows, replies, spanMinutes, eligible, score };
}

export function rankCommunityDay(events, rules = COMMUNITY_ACTIVITY_RULES) {
  const grouped = new Map();
  for (const event of events) {
    const key = String(event.telegram_user_id);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  const rows = [...grouped.entries()].map(([telegramUserId, userEvents]) => ({
    telegramUserId,
    ...scoreCommunityParticipant(userEvents, rules),
  })).sort((a, b) => Number(b.eligible) - Number(a.eligible)
    || b.score - a.score
    || a.telegramUserId.localeCompare(b.telegramUserId, 'en', { numeric: true }));
  let eligibleRank = 0;
  return rows.map((row) => {
    const rank = row.eligible ? ++eligibleRank : null;
    const rankXp = rank && rank <= rules.rankBonuses.length ? rules.rankBonuses[rank - 1] : 0;
    return { ...row, rank, baseXp: row.eligible ? rules.baseXp : 0, rankXp };
  });
}

export async function settleCommunityActivityDay(
  client,
  localDay,
  { id = campaignId(), awardedAt = new Date().toISOString(), rules = COMMUNITY_ACTIVITY_RULES } = {}
) {
  const [events, cycles] = await Promise.all([
    client.select('campaign_community_messages',
      `?campaign_id=eq.${encodeURIComponent(id)}&local_day=eq.${encodeURIComponent(localDay)}` +
      '&select=telegram_user_id,window_index,reply_to_user_id,sent_at&order=sent_at.asc'),
    client.select('cycles', `?campaign_id=eq.${encodeURIComponent(id)}` +
      `&opens_at=lte.${encodeURIComponent(awardedAt)}&closes_at=gt.${encodeURIComponent(awardedAt)}` +
      '&select=cycle_id&limit=1'),
  ]);
  const cycleId = Number(cycles[0]?.cycle_id);
  if (!cycleId) throw new Error('community activity settlement is outside an active cycle');
  const results = rankCommunityDay(events, rules);
  for (const result of results) {
    let xpAwarded = 0;
    if (result.eligible) {
      const usage = await loadDailyXpUsage(client, id, result.telegramUserId, utcDayKey(awardedAt));
      const available = Math.max(0, Math.min(
        DAILY_XP_CAPS.overall - usage.overall,
        DAILY_XP_CAPS.participation - usage.participation
      ));
      xpAwarded = Math.min(result.baseXp + result.rankXp, rules.maximumDailyXp, available);
      const key = `community-pulse:${localDay}:${result.telegramUserId}`;
      const existing = await client.select('xp_ledger',
        `?campaign_id=eq.${encodeURIComponent(id)}&idempotency_key=eq.${encodeURIComponent(key)}&select=id,amount&limit=1`);
      if (existing[0]) xpAwarded = Number(existing[0].amount);
      else if (xpAwarded > 0) await client.insert('xp_ledger', [{
        campaign_id: id, cycle_id: cycleId, telegram_user_id: result.telegramUserId,
        source: 'mission', cap_bucket: 'participation', amount: xpAwarded,
        mission_code: 'community-pulse', idempotency_key: key, awarded_at: awardedAt,
      }]);
    }
    await client.upsert('campaign_community_daily_scores', [{
      campaign_id: id, local_day: localDay, telegram_user_id: result.telegramUserId,
      qualifying_messages: result.messages, distinct_windows: result.windows,
      reply_count: result.replies, activity_span_minutes: result.spanMinutes,
      score: result.score, eligible: result.eligible, daily_rank: result.rank,
      base_xp: result.baseXp, rank_xp: result.rankXp, xp_awarded: xpAwarded,
      settled_at: awardedAt,
    }], 'campaign_id,local_day,telegram_user_id');
  }
  return results;
}

export async function getCommunityActivityProfile(client, telegramUserId, { id = campaignId() } = {}) {
  const rows = await client.select('campaign_community_daily_scores',
    `?campaign_id=eq.${encodeURIComponent(id)}&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
    '&select=local_day,qualifying_messages,distinct_windows,reply_count,activity_span_minutes,score,eligible,daily_rank,xp_awarded' +
    '&order=local_day.desc&limit=10');
  return { today: rows[0] ?? null, history: rows };
}

export function closedCommunityActivityProfile() {
  return { today: null, history: [], unavailable: true };
}
