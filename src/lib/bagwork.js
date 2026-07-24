import { supabase } from './supabase.js';
import { awardXp } from './xp.js';
import * as telegram from './telegram.js';

const XP_PER_SOL = Number(process.env.XP_PER_SOL ?? 1000);
const FAWKQ_WEBSITE_URL = process.env.FAWKQ_WEBSITE_URL ?? 'https://fawkq.com';
const FAWKQ_BAGWORK_URL = process.env.FAWKQ_BAGWORK_URL ?? 'https://fawkq.com/bagwork';

const TASKS_CACHE_TTL_MS = 5 * 60 * 1000;
let tasksCache = null; // { data, expires }

const FEEDBACK_TTL_MS = 24 * 60 * 60 * 1000;
const pendingFeedback = new Map(); // userId -> { expires }

function normalizeHandle(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim().toLowerCase().replace(/^@/, '');
  return trimmed || null;
}

async function safeDm(userId, text) {
  try {
    await telegram.sendMessage(userId, text, {});
  } catch (err) {
    console.error(`bagwork: failed to DM user ${userId}`, err);
  }
}

async function matchTelegramUser(telegramHandle) {
  const handle = normalizeHandle(telegramHandle);
  if (!handle) return null;
  const rows = await supabase.select('users', `?username=ilike.${encodeURIComponent(handle)}&select=id,username`);
  return rows?.[0] ?? null;
}

async function findExistingPayout(submissionId) {
  const rows = await supabase.select(
    'bagwork_payouts',
    `?submission_id=eq.${encodeURIComponent(submissionId)}&select=id`
  );
  return rows?.[0] ?? null;
}

async function hasPriorPayout(telegramHandle) {
  const rows = await supabase.select(
    'bagwork_payouts',
    `?telegram=eq.${encodeURIComponent(telegramHandle)}&select=id&limit=1`
  );
  return (rows?.length ?? 0) > 0;
}

async function postPaidAnnouncement({ handle, sol, txSig }) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const threadId = telegram.getTopicId('fawkq-announcements');
  const text = ['🧾 *Bag Work Paid*', `@${handle} — ${sol} SOL`, `https://solscan.io/tx/${txSig}`].join('\n');
  try {
    await telegram.sendMessage(chatId, text, { threadId });
  } catch (err) {
    console.error('bagwork: failed to post paid announcement', err);
  }
}

async function sendFirstPayoutFeedbackAsk(userId) {
  pendingFeedback.set(userId, { expires: Date.now() + FEEDBACK_TTL_MS });
  const text = [
    '🎉 Congrats on your first paid bag work piece!',
    '',
    'Two quick questions — reply here, one message is fine:',
    '1. Was the rate fair for the work?',
    '2. Was anything about the process confusing?',
  ].join('\n');
  try {
    await telegram.sendMessage(userId, text, {});
  } catch (err) {
    console.error(`bagwork: failed to DM first-payout feedback ask to ${userId}`, err);
    pendingFeedback.delete(userId);
  }
}

// The site is the source of truth for tasks/judging/payouts — the bot never
// self-verifies, it only records what the site already decided and paid.
async function handleBagworkPaid(payload) {
  const submissionId = payload.submission_id;
  const handle = normalizeHandle(payload.handle);
  const telegramHandle = normalizeHandle(payload.telegram);
  const tier = payload.tier;
  const sol = Number(payload.sol);
  const txSig = payload.tx_sig;

  if (!submissionId || !handle || !tier || !Number.isFinite(sol) || sol < 0 || !txSig) {
    throw new Error('invalid bagwork_paid payload');
  }

  const existing = await findExistingPayout(submissionId);
  if (existing) {
    return { duplicate: true };
  }

  const matchedUser = telegramHandle ? await matchTelegramUser(telegramHandle) : null;
  const isFirstPayout = telegramHandle && matchedUser ? !(await hasPriorPayout(telegramHandle)) : false;
  const xpAwarded = matchedUser ? Math.round(sol * XP_PER_SOL) : 0;

  await supabase.insert('bagwork_payouts', [
    {
      submission_id: submissionId,
      handle,
      telegram: telegramHandle,
      user_id: matchedUser?.id ?? null,
      tier,
      sol,
      tx_sig: txSig,
      post_url: payload.post_url ?? null,
      xp_awarded: xpAwarded,
      paid_at: payload.paid_at ?? new Date().toISOString(),
    },
  ]);

  if (matchedUser) {
    await awardXp(matchedUser.id, xpAwarded);
  }

  await postPaidAnnouncement({ handle, sol, txSig });

  if (matchedUser && isFirstPayout) {
    await sendFirstPayoutFeedbackAsk(matchedUser.id);
  }

  return { duplicate: false, matchedUser: !!matchedUser, xpAwarded };
}

// Creators apply for bagwork eligibility BEFORE making content; this is the
// approve/deny decision on that application, separate from a paid piece.
async function handleBagworkClearance(payload) {
  const telegramHandle = normalizeHandle(payload.telegram);
  if (!telegramHandle) return { skipped: true }; // self-reported field; skip when null/unknown

  const matchedUser = await matchTelegramUser(telegramHandle);
  if (!matchedUser) return { skipped: true };

  if (payload.status === 'cleared') {
    await safeDm(matchedUser.id, `✅ You're cleared, go make something! ${FAWKQ_BAGWORK_URL}`);
  } else if (payload.status === 'denied') {
    const reason = payload.feedback ? `: ${payload.feedback}` : '.';
    await safeDm(matchedUser.id, `Your bagwork application wasn't cleared this time${reason}`);
  }

  return { skipped: false };
}

// Routes on the event field; unknown event types are ignored so the site can
// add more without requiring a bot change.
export async function handleBagworkEvent(payload) {
  switch (payload?.event) {
    case 'bagwork_paid':
      return handleBagworkPaid(payload);
    case 'bagwork_clearance':
      return handleBagworkClearance(payload);
    default:
      return { ignored: true };
  }
}

export function hasPendingFeedback(userId) {
  const entry = pendingFeedback.get(userId);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    pendingFeedback.delete(userId);
    return false;
  }
  return true;
}

export async function handleFeedbackReply(message) {
  const userId = message.from.id;
  if (!hasPendingFeedback(userId)) return;
  if (!message.text) return;

  pendingFeedback.delete(userId);
  await supabase.insert('bagwork_feedback', [
    {
      user_id: userId,
      telegram: message.from.username ?? null,
      reply_text: message.text.trim(),
    },
  ]);
  return telegram.sendMessage(userId, 'Thanks for the feedback — logged for the team. 🙏', {});
}

// Top of the Bag Workers leaderboard (see bagwork_leaderboard view) — ranked
// by total SOL earned across paid pieces, keyed by X handle so it stays
// complete even for creators with no matched Telegram account.
export function getBagworkLeaderboard(limit = 10) {
  return supabase.select('bagwork_leaderboard', `?order=total_sol.desc&limit=${limit}`);
}

// Fetches the site's live task list for the /bagwork command, with a short
// cache and a static fallback if the site is unreachable.
export async function getBagworkTasks() {
  if (tasksCache && Date.now() < tasksCache.expires) {
    return tasksCache.data;
  }
  try {
    const res = await fetch(`${FAWKQ_WEBSITE_URL}/api/bagwork/tasks`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    tasksCache = { data, expires: Date.now() + TASKS_CACHE_TTL_MS };
    return data;
  } catch (err) {
    console.error('bagwork: failed to fetch tasks', err);
    return null;
  }
}
