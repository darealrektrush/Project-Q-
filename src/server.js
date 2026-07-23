import 'dotenv/config';
import express from 'express';
import * as telegram from './lib/telegram.js';
import * as xp from './lib/xp.js';
import * as solana from './lib/solana.js';
import { handleBagworkCompletion } from './lib/bagwork.js';

const app = express();
app.use(express.json());

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BAGWORK_SECRET = process.env.BAGWORK_SECRET;
const FAWKQ_WEBSITE_URL = process.env.FAWKQ_WEBSITE_URL ?? 'https://fawkq.com';

const STUB_COMMANDS = new Set([
  '/missions',
  '/meme',
  '/signal',
  '/feed',
  '/ask',
  '/spaces',
  '/door',
]);

app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));

app.get('/version', (req, res) =>
  res.status(200).json({
    commit: process.env.RENDER_GIT_COMMIT ?? 'unknown',
    branch: process.env.RENDER_GIT_BRANCH ?? 'unknown',
  })
);

// Temporary diagnostic route — remove once the silent /start bug is found.
app.get('/debug/db', async (req, res) => {
  try {
    const row = await xp.ensureUser(0, 'debug-check');
    res.status(200).json({ ok: true, row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/webhook', async (req, res) => {
  if (TELEGRAM_WEBHOOK_SECRET) {
    const header = req.get('x-telegram-bot-api-secret-token');
    if (header !== TELEGRAM_WEBHOOK_SECRET) {
      return res.sendStatus(401);
    }
  }

  // Ack immediately — Telegram expects a fast response and will retry otherwise.
  res.sendStatus(200);

  try {
    await handleUpdate(req.body);
  } catch (err) {
    console.error('webhook handling failed', err);
  }
});

app.post('/bagwork', async (req, res) => {
  const header = req.get('x-bagwork-secret');
  if (!BAGWORK_SECRET || header !== BAGWORK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const result = await handleBagworkCompletion(req.body);
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('bagwork handling failed', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

async function handleUpdate(update) {
  if (update.callback_query) return handleCallbackQuery(update.callback_query);
  if (update.message?.text) return handleMessage(update.message);
}

async function handleMessage(message) {
  const threadId = message.message_thread_id;
  const guard = telegram.guardTopic(threadId);
  // Drop anything outside the two allowlisted topics, and drop interactive
  // commands posted in the post-only announcements topic.
  if (!guard.allowed || !guard.interactive) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  // Group chats often send commands as /start@BotUsername — strip the suffix.
  const command = text.split(/\s+/)[0].split('@')[0];

  await xp.ensureUser(message.from.id, message.from.username ?? message.from.first_name);

  if (STUB_COMMANDS.has(command)) {
    return telegram.sendMessage(chatId, '🚧 Coming soon.', { threadId });
  }

  switch (command) {
    case '/start':
      return sendHome(chatId, threadId);
    case '/market':
      return sendMarket(chatId, threadId);
    case '/leaderboard':
      return sendLeaderboard(chatId, threadId);
    case '/rewards':
      return sendRewards(chatId, threadId);
    case '/bagwork':
      return sendBagworkInfo(chatId, threadId);
    default:
      return;
  }
}

async function handleCallbackQuery(callbackQuery) {
  const threadId = callbackQuery.message?.message_thread_id;
  const guard = telegram.guardTopic(threadId);
  await telegram.answerCallbackQuery(callbackQuery.id);
  if (!guard.allowed || !guard.interactive) return;

  const chatId = callbackQuery.message.chat.id;

  switch (callbackQuery.data) {
    case 'menu:market':
      return sendMarket(chatId, threadId);
    case 'menu:events':
      return telegram.sendMessage(chatId, '🗓 *Events* — coming soon.', { threadId });
    case 'menu:map':
      return telegram.sendMessage(chatId, '🗺 *Community Map* — coming soon.', { threadId });
    case 'menu:links':
      return sendOfficialLinks(chatId, threadId);
    case 'menu:about':
      return sendAbout(chatId, threadId);
    default:
      return;
  }
}

function sendHome(chatId, threadId) {
  return telegram.sendMessage(chatId, '👁 *FawkQ Home* — pick a section:', {
    threadId,
    replyMarkup: telegram.buildHomeMenu(),
  });
}

async function sendMarket(chatId, threadId) {
  const mint = process.env.TOKEN_MINT;
  const [price, holderCount] = await Promise.all([
    solana.getTokenPriceUsd(mint),
    solana.getHolderCount(mint),
  ]);

  const text = [
    '📈 *FawkQ Market*',
    price != null ? `Price: $${price.toFixed(6)}` : 'Price: unavailable',
    `Holders: ${holderCount}`,
  ].join('\n');

  return telegram.sendMessage(chatId, text, { threadId });
}

async function sendLeaderboard(chatId, threadId) {
  const rows = await xp.getLeaderboard(10);
  const lines = rows.map((r, i) => `${i + 1}. ${r.username ?? r.id} — ${r.xp} XP`);

  const text = ['🏆 *Leaderboard*', ...(lines.length ? lines : ['No entries yet.'])].join('\n');
  return telegram.sendMessage(chatId, text, { threadId });
}

function sendRewards(chatId, threadId) {
  const text = [
    '💰 *Rewards Split*',
    '_Stage 1 (creator wallet):_ 75% community · 15% dev · 10% ocean conservation',
    '_Stage 2 (community wallet):_ 30% bag wallet · 15% buyback reserve · 55% holders (pro-rata, paid in SOL)',
    '',
    `Distributions run every 3 days. Complete tasks at ${FAWKQ_WEBSITE_URL} to earn XP toward the leaderboard.`,
  ].join('\n');
  return telegram.sendMessage(chatId, text, { threadId });
}

function sendBagworkInfo(chatId, threadId) {
  const text = `💼 Complete tasks at ${FAWKQ_WEBSITE_URL} to earn XP and SOL. Your rewards land automatically once a task is confirmed.`;
  return telegram.sendMessage(chatId, text, { threadId });
}

function sendOfficialLinks(chatId, threadId) {
  const text = ['🔗 *Official Links*', `Website: ${FAWKQ_WEBSITE_URL}`].join('\n');
  return telegram.sendMessage(chatId, text, { threadId });
}

function sendAbout(chatId, threadId) {
  const text = [
    'ℹ️ *About FawkQ*',
    "FAWK Q is the community's eyes on the money. Real-time price, holder counts, wallet balances, and every reward distribution posted with tx links the second it happens.",
    '75% back to the community, 15% dev, 10% straight to ocean conservation — no spin, just receipts.',
  ].join('\n');
  return telegram.sendMessage(chatId, text, { threadId });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`project-q listening on :${PORT}`));
