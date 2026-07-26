import { supabase } from './supabase.js';
import { awardXp, ensureUser } from './xp.js';
import * as telegram from './telegram.js';
import * as signal from './signal.js';

const XP_PER_SOL = Number(process.env.XP_PER_SOL ?? 1000);
const FAWKQ_WEBSITE_URL = process.env.FAWKQ_WEBSITE_URL ?? 'https://fawkq.com';
const FAWKQ_BAGWORK_URL = process.env.FAWKQ_BAGWORK_URL ?? 'https://fawkq.com/bagwork';

const TASKS_CACHE_TTL_MS = 5 * 60 * 1000;
let tasksCache = null; // { data, expires }

const FEEDBACK_TTL_MS = 24 * 60 * 60 * 1000;

const FEEDBACK_QUESTIONS = [
  'Two quick questions on your first paid piece:',
  '1. Was the rate fair for the work?',
  '2. Was anything about the process confusing?',
  '',
  'One message is fine.',
].join('\n');

function normalizeHandle(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim().toLowerCase().replace(/^@/, '');
  return trimmed || null;
}

// Returns whether the DM actually landed, so callers that must not silently
// "succeed" on a failed delivery (clearance) can react to it.
async function safeDm(userId, text) {
  try {
    await telegram.sendMessage(userId, text, {});
    return true;
  } catch (err) {
    console.error(`bagwork: failed to DM user ${userId}`, err);
    return false;
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

// Dedup on handle + status (see bagwork_clearances). Looks up whatever row
// already exists for this exact verdict, delivered or not.
async function findClearance(handle, status) {
  const rows = await supabase.select(
    'bagwork_clearances',
    `?handle=eq.${encodeURIComponent(handle)}&status=eq.${encodeURIComponent(status)}&select=id,notified_at`
  );
  return rows?.[0] ?? null;
}

// Swallows its own error deliberately: if this bookkeeping write fails after
// the member has already been told, returning non-200 would make the site
// resend and tell them twice. Losing the dedup row is the cheaper failure.
async function recordClearance(row) {
  try {
    await supabase.upsert('bagwork_clearances', [row], 'handle,status');
  } catch (err) {
    console.error('bagwork: failed to record clearance', err);
  }
}

// An X handle is not a Telegram username — Telegram autolinks any @word
// regardless of parse mode, so rendering one as text pings whoever owns
// that name on Telegram. inertHandle keeps every payout announcement safe
// even when the piece can't be matched to a real member.
async function postPaidAnnouncement({ handle, sol, txSig, platform }) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const threadId = telegram.getTopicId('fawkq-announcements');
  const suffix = platform && platform !== 'x' ? ` (${telegram.escapeMarkdown(platform)})` : '';
  const text = [
    '🧾 *Bag Work Paid*',
    `${telegram.inertHandle(handle)} — ${sol} SOL${suffix}`,
    `https://solscan.io/tx/${txSig}`,
  ].join('\n');
  try {
    await telegram.sendMessage(chatId, text, { threadId });
  } catch (err) {
    console.error('bagwork: failed to post paid announcement', err);
  }
}

async function postToBagwork(text, replyMarkup) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const threadId = telegram.getTopicId('fawkq-bagwork');
  if (!chatId || !Number.isFinite(threadId)) {
    console.error('bagwork: fawkq-bagwork topic not configured; skipping post');
    return null;
  }
  try {
    return await telegram.sendMessage(chatId, text, { threadId, replyMarkup });
  } catch (err) {
    console.error('bagwork: failed to post to fawkq-bagwork', err);
    return null;
  }
}

async function sendFirstPayoutFeedbackAsk({ telegramHandle, userId }) {
  const link = telegram.botDeepLink('bwfeedback');
  const sent = await postToBagwork(
    [
      `🎉 ${telegram.mention(telegramHandle, userId)} — first paid piece. Two questions:`,
      '1. Was the rate fair for the work?',
      '2. Was anything about the process confusing?',
      '_Reply to this message, or answer privately with the button._',
    ].join('\n'),
    link ? { inline_keyboard: [[{ text: '✍️ Answer privately', url: link }]] } : undefined
  );
  if (!sent || !userId) return;
  await supabase.upsert('bagwork_feedback_prompts', [{
    user_id: userId,
    chat_id: sent.chat.id,
    prompt_message_id: sent.message_id,
    expires_at: new Date(Date.now() + FEEDBACK_TTL_MS).toISOString(),
    answered_at: null,
  }], 'user_id');
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
  // Recorded, not acted on: tier already carries the payout decision (a
  // TikTok submission still comes through tagged tier:"video").
  const platform = payload.platform ? String(payload.platform).trim().toLowerCase() : null;

  if (!submissionId || !handle || !tier || !Number.isFinite(sol) || sol < 0 || !txSig) {
    throw new Error('invalid bagwork_paid payload');
  }

  const existing = await findExistingPayout(submissionId);
  if (existing) {
    return { duplicate: true };
  }

  const matchedUser = telegramHandle ? await matchTelegramUser(telegramHandle) : null;
  // Deliberately gated on matchedUser: telegram is self-reported, so without
  // a numeric id there is nobody safe to ask. fawkq.com owns unmatched
  // creators — the bot can only ever ask members it can actually address.
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
      platform,
      xp_awarded: xpAwarded,
      paid_at: payload.paid_at ?? new Date().toISOString(),
    },
  ]);

  if (matchedUser) {
    await awardXp(matchedUser.id, xpAwarded);
  }

  if (matchedUser) {
    const verified = await signal.verifyMostRecentClaim(matchedUser.id);
    if (verified) {
      await safeDm(
        matchedUser.id,
        `🙋➡️✅ Your "I'm on it" flag just paid off — verified completion bonus: +${verified.bonusXp} XP.`
      );
    }
  }

  await postPaidAnnouncement({ handle, sol, txSig, platform });

  if (isFirstPayout) {
    await sendFirstPayoutFeedbackAsk({ telegramHandle, userId: matchedUser?.id ?? null });
  }

  return { duplicate: false, matchedUser: !!matchedUser, xpAwarded };
}

// Creators apply for bagwork eligibility BEFORE making content; this is the
// approve/deny decision on that application, separate from a paid piece.
// Dedup key is handle + status: only a *delivered* verdict burns the key, so
// a silent skip (no_telegram / unmatched) stays re-runnable if the site
// resends after the creator finally joins the group.
async function handleBagworkClearance(payload) {
  const handle = normalizeHandle(payload.handle);
  const status = payload.status;
  if (!handle || (status !== 'cleared' && status !== 'denied')) {
    throw new Error('invalid bagwork_clearance payload');
  }

  const prior = await findClearance(handle, status);
  if (prior?.notified_at) return { duplicate: true };

  const telegramHandle = normalizeHandle(payload.telegram);
  const matchedUser = telegramHandle ? await matchTelegramUser(telegramHandle) : null;
  const base = { handle, status, telegram: telegramHandle, user_id: matchedUser?.id ?? null };

  if (!telegramHandle) {
    await recordClearance({ ...base, outcome: 'skipped_no_telegram', notified_at: null });
    return { skipped: true, reason: 'no_telegram' };
  }
  if (!matchedUser) {
    // Self-reported handle we've never seen in the group. Tagging it would
    // ping a stranger, so fawkq.com owns telling this creator instead.
    await recordClearance({ ...base, outcome: 'skipped_unmatched', notified_at: null });
    return { skipped: true, reason: 'unmatched' };
  }

  if (status === 'cleared') {
    const sent = await postToBagwork(
      [
        `✅ ${telegram.mention(telegramHandle, matchedUser.id)} — you're cleared.`,
        'Go make something. Flat rate, no caps, quality is the only gate.',
      ].join('\n'),
      { inline_keyboard: [[{ text: '💼 Open Bag Work', url: FAWKQ_BAGWORK_URL }]] }
    );
    if (!sent) {
      await recordClearance({ ...base, outcome: 'post_failed', notified_at: null });
      return { skipped: true, reason: 'post_failed' };
    }
  } else {
    // Never public. If the DM can't be delivered the site's status page
    // carries the reason.
    const reason = payload.feedback ? `: ${payload.feedback}` : '.';
    const delivered = await safeDm(matchedUser.id, `Your bagwork application wasn't cleared this time${reason}`);
    if (!delivered) {
      await recordClearance({ ...base, outcome: 'post_failed', notified_at: null });
      return { skipped: true, reason: 'dm_failed' };
    }
  }

  await recordClearance({
    ...base,
    outcome: status === 'cleared' ? 'posted' : 'dm',
    notified_at: new Date().toISOString(),
  });
  return { skipped: false, duplicate: false };
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

export async function getPendingFeedback(userId) {
  const rows = await supabase.select(
    'bagwork_feedback_prompts',
    `?user_id=eq.${userId}&answered_at=is.null&select=*`
  );
  const row = rows?.[0];
  if (!row || Date.now() > new Date(row.expires_at).getTime()) return null;
  return row;
}

// Only consume a message as feedback when it's unambiguous — otherwise a
// member with an open prompt has their normal chat swallowed.
export function isFeedbackReply(message, prompt) {
  if (!prompt || !message.text) return false;
  if (message.chat.type === 'private') return true;
  return message.reply_to_message?.message_id === prompt.prompt_message_id;
}

export async function handleFeedbackReply(message, prompt) {
  const userId = message.from.id;
  const text = message.text.trim();
  const isPrivate = message.chat.type === 'private';

  if (text.startsWith('/start')) {
    if (isPrivate) await safeDm(userId, FEEDBACK_QUESTIONS);
    return;
  }

  // bagwork_feedback.user_id has a FK to users(id); the DM path is the only
  // one that can reach here without users already having a row for them.
  await ensureUser(userId, message.from.username ?? null);

  await supabase.insert('bagwork_feedback', [
    {
      user_id: userId,
      telegram: message.from.username ?? null,
      reply_text: text,
      source: isPrivate ? 'dm' : 'fawkq-bagwork',
    },
  ]);

  await supabase.update(
    'bagwork_feedback_prompts',
    `?user_id=eq.${userId}`,
    { answered_at: new Date().toISOString() }
  );

  const thanks = 'Thanks for the feedback — logged for the team. 🙏';
  if (isPrivate) return safeDm(userId, thanks);
  return telegram.sendMessage(message.chat.id, thanks, {
    threadId: message.message_thread_id,
  });
}

export async function handleFeedbackDeepLink(message) {
  const userId = message.from.id;
  const prompt = await getPendingFeedback(userId);
  if (!prompt) {
    return safeDm(userId, 'Nothing open on my end right now — thanks for stopping by. 🙏');
  }
  return safeDm(userId, FEEDBACK_QUESTIONS);
}

export function getBagworkLeaderboard(limit = 10) {
  return supabase.select('bagwork_leaderboard', `?order=total_sol.desc&limit=${limit}`);
}

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
