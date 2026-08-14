const API_BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function call(method, payload) {
  const res = await fetch(`${API_BASE()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description}`);
  }
  return data.result;
}

export function sendMessage(chatId, text, { threadId, replyMarkup, parseMode = 'Markdown' } = {}) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    message_thread_id: threadId,
    reply_markup: replyMarkup,
    parse_mode: parseMode,
  });
}

export function sendPhoto(chatId, photo, caption, { threadId, replyMarkup, parseMode = 'Markdown' } = {}) {
  return call('sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
    message_thread_id: threadId,
    reply_markup: replyMarkup,
    parse_mode: parseMode,
  });
}

export function editMessageText(chatId, messageId, text, { replyMarkup, parseMode = 'Markdown' } = {}) {
  return call('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: replyMarkup,
    parse_mode: parseMode,
  });
}

export function editMessageCaption(chatId, messageId, caption, { replyMarkup, parseMode = 'Markdown' } = {}) {
  return call('editMessageCaption', {
    chat_id: chatId,
    message_id: messageId,
    caption,
    reply_markup: replyMarkup,
    parse_mode: parseMode,
  });
}

export function answerCallbackQuery(callbackQueryId, text) {
  return call('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

export function getChatMember(chatId, userId) {
  return call('getChatMember', { chat_id: chatId, user_id: userId });
}

export function buildHomeMenu() {
  return {
    inline_keyboard: [
      [
        { text: '📈 Market', callback_data: 'menu:market' },
        { text: '🏆 Leaderboard', callback_data: 'menu:leaderboard' },
      ],
      [
        { text: '🗓 Events', callback_data: 'menu:events' },
        { text: '🎙 Spaces', callback_data: 'menu:spaces' },
      ],
      [
        { text: '🔗 Links', callback_data: 'menu:links' },
        { text: '💼 Bagwork', callback_data: 'menu:bagwork' },
      ],
      [
        { text: '👁 Money', callback_data: 'menu:money' },
        { text: '🚪 The Door', callback_data: 'menu:door' },
      ],
      [
        { text: 'ℹ️ About', callback_data: 'menu:about' },
      ],
    ],
  };
}

export function buildLeaderboardMenu() {
  return {
    inline_keyboard: [
      [
        { text: '🏆 Leaderboard', callback_data: 'menu:leaderboard:xp' },
        { text: '🏗 Bag Workers', callback_data: 'menu:leaderboard:bagwork' },
      ],
    ],
  };
}

export function buildMoneyMenu() {
  return {
    inline_keyboard: [
      [
        { text: '💰 Rewards', callback_data: 'menu:money:rewards' },
        { text: '🧾 Receipts', callback_data: 'menu:money:receipts' },
      ],
      [
        { text: '💳 Wallets', callback_data: 'menu:money:wallets' },
      ],
    ],
  };
}

function parseTopicIds() {
  const raw = process.env.TELEGRAM_TOPIC_IDS ?? '';
  const map = {};
  for (const pair of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [name, id] = pair.split(':').map((s) => s.trim());
    if (name && id) map[name] = Number(id);
  }
  return map;
}

export function getTopicId(name) {
  return parseTopicIds()[name];
}

const REQUIRED_TOPICS = ['fawkq-chat', 'fawkq-announcements', 'fawkq-bagwork'];
const INTERACTIVE_TOPICS = new Set(['fawkq-chat', 'fawkq-bagwork']);

// Logs loudly at startup if TELEGRAM_TOPIC_IDS is missing/malformed, so a
// misconfigured env var shows up in Render's logs immediately instead of
// silently dropping every message.
export function validateTopicIds() {
  const topics = parseTopicIds();
  const missing = REQUIRED_TOPICS.filter((name) => !Number.isFinite(topics[name]));
  if (missing.length) {
    console.error(
      `[telegram] TELEGRAM_TOPIC_IDS is misconfigured — missing or invalid: ${missing.join(', ')}. ` +
        `Expected "fawkq-chat:<id>,fawkq-announcements:<id>,fawkq-bagwork:<id>", got: ${JSON.stringify(process.env.TELEGRAM_TOPIC_IDS ?? '')}`
    );
    return false;
  }
  return true;
}

// Three forum topics are recognized: fawkq-chat and fawkq-bagwork are
// interactive, fawkq-announcements is post-only. Anything else — including
// threadless updates and DMs — is dropped by the caller.
export function guardTopic(threadId) {
  const topics = parseTopicIds();
  const entry = Object.entries(topics).find(([, id]) => id === threadId);
  if (!entry) return { allowed: false, topic: null, interactive: false };
  const [topic] = entry;
  return { allowed: true, topic, interactive: INTERACTIVE_TOPICS.has(topic) };
}

// Escapes Telegram "Markdown" (v1) control characters. Underscores are legal
// in both X and Telegram handles and would otherwise italicise the rest of the
// message — or make Telegram reject the entire send with a parse error.
export function escapeMarkdown(text) {
  return String(text ?? '').replace(/([_*`\[\]])/g, '\\$1');
}

export function mention(handle, userId) {
  const label = escapeMarkdown(handle);
  return userId ? `[@${label}](tg://user?id=${userId})` : `@${label}`;
}

// An X handle is not a Telegram username. Telegram autolinks any @name
// regardless of parse mode, so rendering one as text pings whoever owns that
// name in here. A code span keeps it readable and inert.
export function inertHandle(handle) {
  return `\`@${String(handle ?? '').replace(/`/g, '')}\``;
}

export function botDeepLink(payload) {
  const name = process.env.TELEGRAM_BOT_USERNAME;
  return name ? `https://t.me/${name}?start=${payload}` : null;
}
