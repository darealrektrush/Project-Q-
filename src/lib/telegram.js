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

export function editMessageText(chatId, messageId, text, { replyMarkup, parseMode = 'Markdown' } = {}) {
  return call('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: replyMarkup,
    parse_mode: parseMode,
  });
}

export function answerCallbackQuery(callbackQueryId, text) {
  return call('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

export function buildHomeMenu() {
  return {
    inline_keyboard: [
      [
        { text: '📈 Market', callback_data: 'menu:market' },
        { text: '🗓 Events', callback_data: 'menu:events' },
      ],
      [
        { text: '🗺 Community Map', callback_data: 'menu:map' },
        { text: '🔗 Official Links', callback_data: 'menu:links' },
      ],
      [{ text: 'ℹ️ About FawkQ', callback_data: 'menu:about' }],
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

const REQUIRED_TOPICS = ['fawkq-chat', 'fawkq-announcements'];

// Logs loudly at startup if TELEGRAM_TOPIC_IDS is missing/malformed, so a
// misconfigured env var shows up in Render's logs immediately instead of
// silently dropping every message.
export function validateTopicIds() {
  const topics = parseTopicIds();
  const missing = REQUIRED_TOPICS.filter((name) => !Number.isFinite(topics[name]));
  if (missing.length) {
    console.error(
      `[telegram] TELEGRAM_TOPIC_IDS is misconfigured — missing or invalid: ${missing.join(', ')}. ` +
        `Expected "fawkq-chat:<id>,fawkq-announcements:<id>", got: ${JSON.stringify(process.env.TELEGRAM_TOPIC_IDS ?? '')}`
    );
    return false;
  }
  return true;
}

// Only two forum topics are recognized: fawkq-chat (interactive) and
// fawkq-announcements (post-only). Anything else — including threadless
// updates and DMs — is dropped by the caller.
export function guardTopic(threadId) {
  const topics = parseTopicIds();
  const entry = Object.entries(topics).find(([, id]) => id === threadId);
  if (!entry) return { allowed: false, topic: null, interactive: false };
  const [topic] = entry;
  return { allowed: true, topic, interactive: topic === 'fawkq-chat' };
}
