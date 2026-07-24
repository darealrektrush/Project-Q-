import 'dotenv/config';
import express from 'express';
import * as telegram from './lib/telegram.js';
import * as xp from './lib/xp.js';
import * as solana from './lib/solana.js';
import * as admin from './lib/admin.js';
import * as menuContent from './lib/menuContent.js';
import { supabase } from './lib/supabase.js';
import { handleBagworkCompletion } from './lib/bagwork.js';

const app = express();
app.use(express.json());

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BAGWORK_SECRET = process.env.BAGWORK_SECRET;
const FAWKQ_WEBSITE_URL = process.env.FAWKQ_WEBSITE_URL ?? 'https://fawkq.com';
const FAWKQ_BAGWORK_URL = process.env.FAWKQ_BAGWORK_URL ?? 'https://fawkq.com/bagwork';

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
  if (update.message) return handleMessage(update.message);
}

async function handleMessage(message) {
  const threadId = message.message_thread_id;
  const chatId = message.chat.id;

  // Pending admin edits (bio text / media photo) take priority so an admin
  // can finish an edit regardless of normal topic/command gating.
  if (admin.hasPendingEdit(chatId, message.from.id)) {
    return admin.handlePendingEditMessage(message);
  }

  if (!message.text) return; // non-text, non-pending-edit messages are ignored

  const guard = telegram.guardTopic(threadId);
  if (!guard.allowed || !guard.interactive) return;

  const text = message.text.trim();
  // Group chats often send commands as /start@BotUsername — strip the suffix.
  const command = text.split(/\s+/)[0].split('@')[0];

  await xp.ensureUser(message.from.id, message.from.username ?? message.from.first_name);

  if (command === '/adminf') {
    return admin.handleAdminCommand(message);
  }
  if (command === '/admincancel') {
    return admin.cancelPendingEdit(chatId, message.from.id);
  }

  if (STUB_COMMANDS.has(command)) {
    const key = command.slice(1); // e.g. 'missions', 'meme'
    return renderMenu(chatId, threadId, key, '🚧 Coming soon.');
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
    case '/receipts':
      return sendReceipts(chatId, threadId);
    case '/wallets':
      return sendWallets(chatId, threadId);
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

  if (callbackQuery.data?.startsWith('admin:')) {
    return admin.handleAdminCallback(callbackQuery);
  }

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

// Checks Supabase for an admin-set override (bio text / image) for `key`
// before falling back to the hardcoded default text.
async function renderMenu(chatId, threadId, key, defaultText, { replyMarkup } = {}) {
  const content = await menuContent.getMenuContent(key);
  const text = content?.bio_text || defaultText;

  if (content?.media_file_id) {
    return telegram.sendPhoto(chatId, content.media_file_id, text, { threadId, replyMarkup });
  }
  return telegram.sendMessage(chatId, text, { threadId, replyMarkup });
}

function sendHome(chatId, threadId) {
  return renderMenu(chatId, threadId, 'home', '👁 *FawkQ Home* — pick a section:', {
    replyMarkup: telegram.buildHomeMenu(),
  });
}

async function sendMarket(chatId, threadId) {
  const mint = process.env.TOKEN_MINT;
  let price = null;
  let holderCount = null;

  // Degrade gracefully rather than letting a missing/invalid TOKEN_MINT
  // (or a Helius error) silently kill the whole reply.
  if (mint) {
    try {
      [price, holderCount] = await Promise.all([solana.getTokenPriceUsd(mint), solana.getHolderCount(mint)]);
    } catch (err) {
      console.error('sendMarket: failed to fetch token data', err);
    }
  }

  const defaultText = [
    '📈 *FawkQ Market*',
    price != null ? `Price: $${price.toFixed(6)}` : 'Price: unavailable',
    holderCount != null ? `Holders: ${holderCount}` : 'Holders: unavailable',
  ].join('\n');

  return renderMenu(chatId, threadId, 'market', defaultText);
}

async function sendLeaderboard(chatId, threadId) {
  const rows = await xp.getLeaderboard(10);
  const lines = rows.map((r, i) => `${i + 1}. ${r.username ?? r.id} — ${r.xp} XP`);

  const defaultText = ['🏆 *Leaderboard*', ...(lines.length ? lines : ['No entries yet.'])].join('\n');
  return renderMenu(chatId, threadId, 'leaderboard', defaultText);
}

function sendRewards(chatId, threadId) {
  const defaultText = [
    '💰 *Rewards Split*',
    '_Stage 1 (creator wallet):_ 75% community · 15% dev · 10% ocean conservation',
    '_Stage 2 (community wallet):_ 30% bag wallet · 15% buyback reserve · 55% holders (pro-rata, paid in SOL)',
    '',
    `Distributions run every 3 days. Complete tasks at ${FAWKQ_BAGWORK_URL} to earn XP toward the leaderboard.`,
  ].join('\n');
  return renderMenu(chatId, threadId, 'rewards', defaultText);
}

function sendBagworkInfo(chatId, threadId) {
  const defaultText = `💼 Complete tasks at ${FAWKQ_BAGWORK_URL} to earn XP and SOL. Your rewards land automatically once a task is confirmed.`;
  return renderMenu(chatId, threadId, 'bagwork', defaultText);
}

async function sendReceipts(chatId, threadId) {
  const runs = await supabase.select(
    'distribution_runs',
    '?status=eq.completed&order=completed_at.desc&limit=3&select=*'
  );

  if (!runs?.length) {
    return renderMenu(chatId, threadId, 'receipts', '🧾 No completed distribution runs yet.');
  }

  const lines = ['🧾 *Recent Distribution Receipts*'];
  for (const run of runs) {
    const txs = await supabase.select('distribution_transactions', `?run_id=eq.${run.id}&select=tx_signature`);
    const signatures = [...new Set((txs ?? []).map((t) => t.tx_signature))];
    const when = new Date(run.completed_at).toLocaleDateString();
    lines.push(
      '',
      `*${when}* — ${solana.lamportsToSol(run.total_lamports).toFixed(4)} SOL`,
      ...signatures.map((sig) => `https://solscan.io/tx/${sig}`)
    );
  }

  return renderMenu(chatId, threadId, 'receipts', lines.join('\n'));
}

async function sendWallets(chatId, threadId) {
  const connection = solana.getConnection();
  const mint = process.env.TOKEN_MINT;

  const solOnlyWallets = [
    ['Creator', process.env.CREATOR_WALLET_PUBLIC],
    ['Community', process.env.COMMUNITY_WALLET_PUBLIC],
    ['Dev', process.env.DEV_WALLET_PUBLIC],
    ['Ocean conservation', process.env.OCEAN_WALLET_PUBLIC],
    ['Bag wallet', process.env.BAG_WALLET_PUBLIC],
    ['Buyback reserve', process.env.BUYBACK_RESERVE_WALLET_PUBLIC],
  ].filter(([, address]) => address);

  const supplyWallets = [
    ['Andrew (Co-Founder)', process.env.ANDREW_COFOUNDER_WALLET_PUBLIC],
    ['Thomas (Co-Founder)', process.env.THOMAS_COFOUNDER_WALLET_PUBLIC],
  ].filter(([, address]) => address);

  const [solOnlyBalances, supplySolBalances] = await Promise.all([
    Promise.all(solOnlyWallets.map(([, address]) => solana.getWalletBalanceLamports(connection, address))),
    Promise.all(supplyWallets.map(([, address]) => solana.getWalletBalanceLamports(connection, address))),
  ]);

  // Token-supply-held numbers depend on TOKEN_MINT being a real mint;
  // degrade gracefully instead of letting a missing/invalid mint (or a
  // Helius error) silently kill the whole command.
  let supplyTokens = supplyWallets.map(() => null);
  if (mint && supplyWallets.length) {
    try {
      const decimals = await solana.getMintDecimals(mint);
      const rawTokens = await Promise.all(
        supplyWallets.map(([, address]) => solana.getTokenBalanceForOwner(mint, address))
      );
      supplyTokens = rawTokens.map((raw) => raw / 10 ** decimals);
    } catch (err) {
      console.error('sendWallets: failed to fetch token supply data', err);
    }
  }

  const lines = [
    '💳 *FawkQ Wallets*',
    ...solOnlyWallets.map(([label], i) => `${label}: ${solana.lamportsToSol(solOnlyBalances[i]).toFixed(4)} SOL`),
  ];

  if (supplyWallets.length) {
    lines.push('', '🤝 *Community & Bagwork Supply Wallets*');
    supplyWallets.forEach(([label], i) => {
      const sol = solana.lamportsToSol(supplySolBalances[i]).toFixed(4);
      const tokens = supplyTokens[i] != null ? supplyTokens[i].toLocaleString() : 'unavailable';
      lines.push(`${label}: ${sol} SOL · ${tokens} supply held`);
    });
  }

  return renderMenu(chatId, threadId, 'wallets', lines.join('\n'));
}

function sendOfficialLinks(chatId, threadId) {
  const text = [
    '🔗 *Official Links*',
    `Website: ${FAWKQ_WEBSITE_URL}`,
    `Bagwork: ${FAWKQ_BAGWORK_URL}`,
  ].join('\n');
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

telegram.validateTopicIds();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`project-q listening on :${PORT}`));
