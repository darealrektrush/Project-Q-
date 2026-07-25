import { supabase } from './supabase.js';
import { awardXp } from './xp.js';
import * as telegram from './telegram.js';
import { findNotableTransfer, truncateWallet, formatTokenAmount } from './onchainSignal.js';
import { getTokenSymbol } from './solana.js';

// Tunable XP economy — adjust freely, nothing else depends on these values.
const REVEAL_COST_XP = 5;
const REVEAL_WIN_BONUS_XP = 20; // net +15 on a win, net -5 on a miss
const REVEAL_WIN_CHANCE = 0.5;
const HINT_COSTS = { hint_1: 3, hint_2: 5, hint_3: 8 };

const FLAVORS = ['signal_detected', 'unknown_transmission', 'mission_available'];

const SIGNAL_DETECTED_FALLBACKS = [
  '🟢 *SIGNAL DETECTED*\nA wallet just aped into something unusual... will it send?',
  '🟢 *SIGNAL DETECTED*\nSomething just moved on-chain. Feels like more than noise...',
  '🟢 *SIGNAL DETECTED*\nActivity just spiked. Could be nothing. Could be something.',
];

const UNKNOWN_TRANSMISSION_SETS = [
  {
    hint_1: "It's not one you've heard mentioned here before.",
    hint_2: 'The community around it is small but loud.',
    hint_3: "Whether it's signal or noise is still anyone's guess. (This is a game, not a call to buy anything.)",
  },
  {
    hint_1: 'Chatter about it picked up in the last few hours.',
    hint_2: 'A few wallets have been quietly accumulating.',
    hint_3: 'Could fade by tomorrow, could still be early. (This is a game, not a call to buy anything.)',
  },
  {
    hint_1: "It's been floating around smaller Telegram groups.",
    hint_2: 'Nothing official yet — just chatter and screenshots.',
    hint_3: "Half the fun is not knowing until it's obvious. (This is a game, not a call to buy anything.)",
  },
  {
    hint_1: 'Someone in another server mentioned it in passing.',
    hint_2: 'The name alone has a few people curious.',
    hint_3: 'No promises here — just keeping you plugged in. (This is a game, not a call to buy anything.)',
  },
  {
    hint_1: "It's got that right-place-right-time energy.",
    hint_2: "Early enough that most people haven't noticed yet.",
    hint_3: 'Could be nothing. (This is a game, not a call to buy anything.)',
  },
  {
    hint_1: "Not a name you'd recognize from the usual lists.",
    hint_2: 'Momentum is building slowly, not all at once.',
    hint_3: "Could be nothing — that's kind of the point of this game.",
  },
];

async function getRecentSignalSignatures() {
  const rows = await supabase.select(
    'signals',
    '?tx_signature=not.is.null&order=created_at.desc&limit=25&select=tx_signature'
  );
  return (rows ?? []).map((r) => r.tx_signature);
}

async function buildSignalDetectedContent() {
  const alreadyPostedSignatures = await getRecentSignalSignatures();
  const transfer = await findNotableTransfer({ alreadyPostedSignatures });

  if (!transfer) {
    const teaser = SIGNAL_DETECTED_FALLBACKS[Math.floor(Math.random() * SIGNAL_DETECTED_FALLBACKS.length)];
    return { teaser_text: teaser, reveal_text: null, source: 'synthetic' };
  }

  let symbol = null;
  try {
    symbol = await getTokenSymbol(process.env.TOKEN_MINT);
  } catch {
    // non-fatal — falls back to generic wording below
  }

  const wallet = truncateWallet(transfer.wallet);
  const amount = formatTokenAmount(transfer.amount);
  const label = symbol ? `$${symbol}` : 'tokens';

  return {
    teaser_text: `🟢 *SIGNAL DETECTED*\nWallet \`${wallet}\` just moved ${amount} ${label}. Unusual timing... will it send?`,
    reveal_text: null,
    source: 'onchain',
    tx_signature: transfer.signature,
    wallet: transfer.wallet,
    amount_tokens: transfer.amount,
  };
}

function buildContent(kind) {
  if (kind === 'signal_detected') {
    return {
      teaser_text: '🟢 *SIGNAL DETECTED*\nA wallet just aped into something unusual... will it send?',
      reveal_text: null, // resolved per-user at reveal time (win/miss is randomized then)
    };
  }
  if (kind === 'unknown_transmission') {
    const set = UNKNOWN_TRANSMISSION_SETS[Math.floor(Math.random() * UNKNOWN_TRANSMISSION_SETS.length)];
    return {
      teaser_text: '🟡 *UNKNOWN TRANSMISSION*\nA Solana project is about to trend. Three hints available.',
      ...set,
    };
  }
  return {
    teaser_text: "🔴 *MISSION AVAILABLE*\nFirst 50 to complete today's Bag Working task earn bonus XP.",
  };
}

function buildReplyMarkup(kind, signalId) {
  if (kind === 'signal_detected') {
    return {
      inline_keyboard: [[
        { text: '🔍 Reveal', callback_data: `signal:reveal:${signalId}` },
        { text: '🤷 Ignore', callback_data: `signal:ignore:${signalId}` },
      ]],
    };
  }
  if (kind === 'unknown_transmission') {
    return {
      inline_keyboard: [[
        { text: `Hint 1 (${HINT_COSTS.hint_1} XP)`, callback_data: `signal:hint_1:${signalId}` },
        { text: `Hint 2 (${HINT_COSTS.hint_2} XP)`, callback_data: `signal:hint_2:${signalId}` },
        { text: `Hint 3 (${HINT_COSTS.hint_3} XP)`, callback_data: `signal:hint_3:${signalId}` },
      ]],
    };
  }
  return undefined; // mission_available is a plain announcement, no buttons
}

// Creates a new signal, posts it to fawkq-announcements, and stores the
// resulting message_id so /signal can repost the same content into chat.
export async function createAndPostSignal() {
  const kind = FLAVORS[Math.floor(Math.random() * FLAVORS.length)];
  const content = kind === 'signal_detected' ? await buildSignalDetectedContent() : buildContent(kind);

  const [row] = await supabase.insert('signals', [{
    kind,
    teaser_text: content.teaser_text,
    reveal_text: content.reveal_text ?? null,
    hint_1: content.hint_1 ?? null,
    hint_2: content.hint_2 ?? null,
    hint_3: content.hint_3 ?? null,
    status: kind === 'mission_available' ? 'resolved' : 'open',
    source: content.source ?? 'synthetic',
    tx_signature: content.tx_signature ?? null,
    wallet: content.wallet ?? null,
    amount_tokens: content.amount_tokens ?? null,
  }]);

  const chatId = process.env.TELEGRAM_CHAT_ID;
  const threadId = telegram.getTopicId('fawkq-announcements');

  // fawkq-announcements is post-only — no buttons here, they'd never work
  // (the topic guard blocks all interaction there). Reveal/hint/ignore only
  // work on the /signal repost into fawkq-chat, see repostSignalToChat.
  const announceText =
    kind === 'mission_available'
      ? content.teaser_text
      : `${content.teaser_text}\n\n💬 Head to fawkq-chat and type /signal to act on it.`;
  const message = await telegram.sendMessage(chatId, announceText, { threadId });

  await supabase.update('signals', `?id=eq.${row.id}`, {
    chat_id: chatId,
    message_id: message.message_id,
    thread_id: threadId,
  });

  return row;
}

export async function getLatestOpenSignal() {
  const rows = await supabase.select('signals', '?status=eq.open&order=created_at.desc&limit=1');
  return rows?.[0] ?? null;
}

// Reposts the current open signal (if any) into the interactive chat topic
// so members can act on it without needing to touch the announcements topic.
export async function repostSignalToChat(chatId, threadId) {
  const signal = await getLatestOpenSignal();
  if (!signal) return null;
  const replyMarkup = buildReplyMarkup(signal.kind, signal.id);
  await telegram.sendMessage(chatId, signal.teaser_text, { threadId, replyMarkup });
  return signal;
}

async function recordInteraction(signalId, userId, action, xpDelta) {
  // Unique (signal_id, user_id, action) constraint means a second attempt
  // throws instead of double-charging/double-paying the same user.
  await supabase.insert('signal_interactions', [{ signal_id: signalId, user_id: userId, action, xp_delta: xpDelta }]);
}

export async function handleReveal(signalId, userId) {
  try {
    await recordInteraction(signalId, userId, 'reveal', -REVEAL_COST_XP);
  } catch {
    return 'You already revealed this Signal.';
  }
  await awardXp(userId, -REVEAL_COST_XP);

  const rows = await supabase.select('signals', `?id=eq.${signalId}&select=source,wallet,amount_tokens`);
  const signal = rows?.[0];
  const detail = signal?.source === 'onchain'
    ? `Wallet ${truncateWallet(signal.wallet)} moved ${formatTokenAmount(signal.amount_tokens)} tokens. `
    : '';

  const won = Math.random() < REVEAL_WIN_CHANCE;
  if (won) {
    await awardXp(userId, REVEAL_WIN_BONUS_XP);
    return `📡 ${detail}It sent! +${REVEAL_WIN_BONUS_XP - REVEAL_COST_XP} XP net.`;
  }
  return `📡 ${detail}False alarm — nothing this time. -${REVEAL_COST_XP} XP.`;
}

export async function handleIgnore(signalId, userId) {
  try {
    await recordInteraction(signalId, userId, 'ignore', 0);
  } catch {
    return 'Already noted.';
  }
  return 'Noted — sometimes ignoring the noise is the right call.';
}

export async function handleHint(signalId, userId, hintKey) {
  const cost = HINT_COSTS[hintKey];
  try {
    await recordInteraction(signalId, userId, hintKey, -cost);
  } catch {
    return 'You already bought this hint.';
  }
  await awardXp(userId, -cost);

  const rows = await supabase.select('signals', `?id=eq.${signalId}&select=${hintKey}`);
  const hintText = rows?.[0]?.[hintKey] ?? 'No hint text available.';
  return `${hintText} (-${cost} XP)`;
}
