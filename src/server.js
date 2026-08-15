import 'dotenv/config';
import express from 'express';
import * as telegram from './lib/telegram.js';
import * as xp from './lib/xp.js';
import * as solana from './lib/solana.js';
import * as admin from './lib/admin.js';
import * as menuContent from './lib/menuContent.js';
import { supabase } from './lib/supabase.js';
import * as bagwork from './lib/bagwork.js';
import * as signal from './lib/signal.js';
import * as events from './lib/events.js';
import * as eventsAdmin from './lib/eventsAdmin.js';
import * as campaignUi from './campaign/ui.js';
import * as campaignService from './campaign/service.js';
import * as oracleIngest from './campaign/oracleIngest.js';

const app = express();
app.use(express.json());

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BAGWORK_SECRET = process.env.BAGWORK_SECRET;
const ORACLE_CAMPAIGN_SECRET = process.env.ORACLE_CAMPAIGN_SECRET;
const FAWKQ_WEBSITE_URL = process.env.FAWKQ_WEBSITE_URL ?? 'https://fawkq.com';
const FAWKQ_BAGWORK_URL = process.env.FAWKQ_BAGWORK_URL ?? 'https://fawkq.com/bagwork';

const STUB_COMMANDS = new Set([
  '/missions',
  '/meme',
  '/feed',
  '/ask',
]);

app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));

app.get('/version', (req, res) =>
  res.status(200).json({
    commit: process.env.RENDER_GIT_COMMIT ?? 'unknown',
    branch: process.env.RENDER_GIT_BRANCH ?? 'unknown',
  })
);

app.post('/webhook', async (req, res) => {
  const header = req.get('x-telegram-bot-api-secret-token');
  if (!TELEGRAM_WEBHOOK_SECRET || header !== TELEGRAM_WEBHOOK_SECRET) {
    return res.sendStatus(401);
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
    const result = await bagwork.handleBagworkEvent(req.body);
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('bagwork handling failed', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/oracle/campaign-raid-event', async (req, res) => {
  if (!oracleIngest.secretMatches(req.get('x-oracle-campaign-secret'), ORACLE_CAMPAIGN_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const event = oracleIngest.validateOracleRaidEvent(req.body);
    const result = await oracleIngest.ingestOracleRaidEvent(supabase, event);
    return res.status(200).json({ ok: true, event: result });
  } catch (err) {
    const invalid = String(err.message).startsWith('invalid ');
    console.error('Oracle campaign raid ingest failed', err.message);
    return res.status(invalid ? 400 : 409).json({
      ok: false,
      error: invalid ? err.message : 'campaign event rejected',
    });
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

  // First-payout feedback replies arrive as a DM or a reply in fawkq-bagwork,
  // so this must be checked before the topic guard below would otherwise
  // drop it.
  // Only a private message or an explicit reply can be feedback. Without this
  // guard every sticker, join and message in every topic costs a DB round trip.
  const maybeFeedback =
    Boolean(message.text) &&
    (message.chat.type === 'private' || Boolean(message.reply_to_message));
  const prompt = maybeFeedback ? await bagwork.getPendingFeedback(message.from.id) : null;
  if (bagwork.isFeedbackReply(message, prompt)) {
    return bagwork.handleFeedbackReply(message, prompt);
  }

  if (eventsAdmin.hasPendingAddEvent(chatId, message.from.id)) {
    return eventsAdmin.handleAddEventMessage(message);
  }

  if (!message.text) return; // non-text, non-pending messages are ignored

  // The bot lives in topics, but the bagwork feedback deep link
  // (t.me/<bot>?start=bwfeedback) deliberately opens a DM. Handle private
  // chats here so a member who taps the button never hits silence — and so
  // their numeric id gets recorded, which is what makes future DMs possible
  // at all.
  if (message.chat.type === 'private') {
    await xp.ensureUser(message.from.id, message.from.username ?? message.from.first_name);
    const privateText = message.text.trim();
    const startPayload = privateText.startsWith('/start')
      ? privateText.split(/\s+/)[1] ?? null
      : null;

    if (startPayload === 'bwfeedback') {
      return bagwork.handleFeedbackDeepLink(message);
    }
    return telegram.sendMessage(
      message.chat.id,
      '👋 I live in the FawkQ group — find me in fawkq-chat.',
      {}
    );
  }

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
  if (command === '/postsignal') {
    return handlePostSignalCommand(message);
  }
  if (command === '/addevent') {
    return eventsAdmin.handleAddEventCommand(message);
  }

  if (STUB_COMMANDS.has(command)) {
    const key = command.slice(1); // e.g. 'missions', 'meme'
    return renderMenu(chatId, threadId, key, '🚧 Coming soon.');
  }

  switch (command) {
    case '/start':
      return sendHome(chatId, threadId);
    case '/helpf':
      return sendHelp(chatId, threadId);
    case '/market':
      return sendMarket(chatId, threadId);
    case '/leaderboard':
      return sendLeaderboard(chatId, threadId);
    case '/rewards':
      return sendRewards(chatId, threadId);
    case '/bagwork':
      return sendBagworkInfo(chatId, threadId);
    case '/bagworkboard':
      return sendBagworkboard(chatId, threadId);
    case '/receipts':
      return sendReceipts(chatId, threadId);
    case '/wallets':
      return sendWallets(chatId, threadId);
    case '/door':
      return sendDoorInfo(chatId, threadId);
    case '/signal':
      return sendSignalCommand(chatId, threadId);
    case '/spaces':
      return sendSpaces(chatId, threadId);
    case '/campaign':
      return telegram.sendMessage(chatId, await buildCampaignHomeText(), {
        threadId,
        replyMarkup: campaignUi.buildBondTheDuckMenu(),
      });
    default:
      return;
  }
}

async function getLeaderboardIntro() {
  const content = await menuContent.getMenuContent('leaderboard');
  return {
    text: content?.bio_text || '🏆 *Leaderboards* — pick a board:',
    mediaFileId: content?.media_file_id ?? null,
  };
}

// Edits a menu message in place regardless of whether it's plain text or a
// photo (Telegram requires editMessageCaption for the latter — you can't
// turn a photo message into text via edit, or vice versa).
function editMenuMessage(callbackQuery, text, replyMarkup) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  if (callbackQuery.message.photo) {
    return telegram.editMessageCaption(chatId, messageId, text, { replyMarkup });
  }
  return telegram.editMessageText(chatId, messageId, text, { replyMarkup });
}

// Signal reveal/hint/ignore results are shown via the callback answer
// itself (a toast popup only the clicking user sees), so — unlike every
// other callback below — it must NOT be acked until the result text is
// known. Telegram only allows answering a given callback query once.
async function handleSignalCallback(callbackQuery) {
  const [, action, signalId] = callbackQuery.data.split(':');
  const userId = callbackQuery.from.id;

  await xp.ensureUser(userId, callbackQuery.from.username ?? callbackQuery.from.first_name);

  let resultText;
  if (action === 'reveal') {
    resultText = await signal.handleReveal(signalId, userId);
  } else if (action === 'ignore') {
    resultText = await signal.handleIgnore(signalId, userId);
  } else if (action?.startsWith('hint_')) {
    resultText = await signal.handleHint(signalId, userId, action);
  } else if (action === 'claim') {
    resultText = await signal.handleClaim(signalId, userId);
  }

  return telegram.answerCallbackQuery(callbackQuery.id, resultText);
}

async function handleCallbackQuery(callbackQuery) {
  const threadId = callbackQuery.message?.message_thread_id;
  const guard = telegram.guardTopic(threadId);

  if (!guard.allowed || !guard.interactive) {
    return telegram.answerCallbackQuery(callbackQuery.id);
  }

  if (callbackQuery.data?.startsWith('signal:')) {
    return handleSignalCallback(callbackQuery);
  }

  await telegram.answerCallbackQuery(callbackQuery.id);

  const chatId = callbackQuery.message.chat.id;

  if (callbackQuery.data?.startsWith('admin:')) {
    return admin.handleAdminCallback(callbackQuery);
  }

  if (callbackQuery.data?.startsWith('addevent:')) {
    return eventsAdmin.handleAddEventCallback(callbackQuery);
  }

  switch (callbackQuery.data) {
    case 'menu:market':
      return sendMarket(chatId, threadId);
    case 'menu:events': {
      const text = await events.buildUpcomingText('event', {
        header: '🗓 *Upcoming Events*',
        emptyText: '🗓 No events scheduled right now — check back soon.',
      });
      return renderMenu(chatId, threadId, 'events', text);
    }
    case 'menu:spaces':
      return sendSpaces(chatId, threadId);
    case 'menu:links':
      return sendOfficialLinks(chatId, threadId);
    case 'menu:about':
      return sendAbout(chatId, threadId);
    case 'menu:bagwork':
      return sendBagworkInfo(chatId, threadId);
    case 'menu:money': {
      const content = await menuContent.getMenuContent('money');
      const text = content?.bio_text ||
        '👁 *Eyes On The Money* — real-time wallet balances, reward splits, and distribution receipts. Pick a section:';
      const replyMarkup = telegram.buildMoneyMenu();
      if (content?.media_file_id) {
        return telegram.sendPhoto(chatId, content.media_file_id, text, { threadId, replyMarkup });
      }
      return telegram.sendMessage(chatId, text, { threadId, replyMarkup });
    }
    case 'menu:money:rewards':
      return sendRewards(chatId, threadId);
    case 'menu:money:receipts':
      return sendReceipts(chatId, threadId);
    case 'menu:money:wallets':
      return sendWallets(chatId, threadId);
    case 'menu:door':
      return sendDoorInfo(chatId, threadId);
    case 'menu:campaigns':
      return editMenuMessage(callbackQuery, '🦆 *Campaigns* — choose a campaign:', campaignUi.buildCampaignsMenu());
    case 'menu:campaigns:back':
      return sendHome(chatId, threadId);
    case campaignUi.CAMPAIGN_CALLBACK_PREFIX:
      return editMenuMessage(callbackQuery, await buildCampaignHomeText(), campaignUi.buildBondTheDuckMenu());
    case campaignUi.MISSIONS_CALLBACK_PREFIX:
      return editMenuMessage(callbackQuery, campaignUi.MISSIONS_HOME_TEXT, campaignUi.buildMissionsMenu());
    case `${campaignUi.MISSIONS_CALLBACK_PREFIX}:raids`:
      return editMenuMessage(
        callbackQuery,
        await buildOracleRaidsText(callbackQuery.from.id),
        campaignUi.buildOracleRaidsMenu()
      );
    case 'menu:leaderboard': {
      const { text, mediaFileId } = await getLeaderboardIntro();
      const replyMarkup = telegram.buildLeaderboardMenu();
      if (mediaFileId) {
        return telegram.sendPhoto(chatId, mediaFileId, text, { threadId, replyMarkup });
      }
      return telegram.sendMessage(chatId, text, { threadId, replyMarkup });
    }
    case 'menu:leaderboard:root': {
      const { text } = await getLeaderboardIntro();
      return editMenuMessage(callbackQuery, text, telegram.buildLeaderboardMenu());
    }
    case 'menu:leaderboard:xp':
      return editMenuMessage(callbackQuery, await buildLeaderboardText(), {
        inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'menu:leaderboard:root' }]],
      });
    case 'menu:leaderboard:bagwork':
      return editMenuMessage(callbackQuery, await buildBagworkboardText(), {
        inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'menu:leaderboard:root' }]],
      });
    default: {
      if (callbackQuery.data?.startsWith(`${campaignUi.MISSIONS_CALLBACK_PREFIX}:`)) {
        const missionScreen = callbackQuery.data.slice(campaignUi.MISSIONS_CALLBACK_PREFIX.length + 1);
        const missionText = campaignUi.getMissionScreen(missionScreen);
        if (missionText) return editMenuMessage(callbackQuery, missionText, campaignUi.buildMissionScreenMenu());
      }
      if (callbackQuery.data?.startsWith(`${campaignUi.CAMPAIGN_CALLBACK_PREFIX}:`)) {
        const screen = callbackQuery.data.slice(campaignUi.CAMPAIGN_CALLBACK_PREFIX.length + 1);
        const text = await buildCampaignScreenText(screen, callbackQuery.from.id);
        if (text) return editMenuMessage(callbackQuery, text, campaignUi.buildCampaignScreenMenu());
      }
      return;
    }
  }
}

async function buildOracleRaidsText(telegramUserId) {
  try {
    const status = await campaignService.getParticipantRaidStatus(supabase, telegramUserId);
    return campaignUi.buildOracleRaidsText(status);
  } catch (err) {
    console.error('Oracle campaign raid status unavailable', err.message);
    return campaignUi.buildOracleRaidsText(campaignService.closedRaidStatus());
  }
}

async function buildCampaignHomeText() {
  try {
    return campaignUi.buildCampaignHomeText(await campaignService.getCampaignStatus(supabase));
  } catch (err) {
    console.error('campaign status unavailable', err.message);
    return campaignUi.buildCampaignHomeText(campaignService.closedCampaignStatus());
  }
}

async function buildCampaignScreenText(screen, telegramUserId) {
  if (!['status', 'xp'].includes(screen)) return campaignUi.getCampaignScreen(screen);
  let status;
  try {
    status = await campaignService.getParticipantStatus(supabase, telegramUserId);
  } catch (err) {
    console.error('campaign participant status unavailable', err.message);
    status = campaignService.closedParticipantStatus();
  }
  return screen === 'status'
    ? campaignUi.buildParticipantStatusText(status)
    : campaignUi.buildParticipantXpText(status);
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

function sendHelp(chatId, threadId) {
  const defaultText = [
    '📖 *FawkQ Commands*',
    '',
    '/start — Home menu',
    '/market — Price and holder count',
    '/leaderboard — XP leaderboard',
    '/bagworkboard — Bag Workers leaderboard',
    '/rewards — How the rewards split works',
    '/bagwork — Current bag work tasks',
    '/receipts — Recent distribution receipts',
    '/wallets — Live wallet balances',
    '/door — Beyond the Door',
    '/signal — Current Signal (reveal, ignore, or grab hints for XP)',
    '/spaces — Upcoming Spaces',
    '/campaign — Bond the Duck campaign hub',
    '',
    '_Coming soon:_ /missions /meme /feed /ask',
    '',
    '/helpf — Show this list',
  ].join('\n');
  return renderMenu(chatId, threadId, 'help', defaultText);
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

async function buildLeaderboardText() {
  const rows = await xp.getLeaderboard(10);
  const lines = rows.map(
    (r, i) => `${i + 1}. ${telegram.escapeMarkdown(r.username ?? r.id)} — ${r.xp} XP`
  );
  return ['🏆 *Leaderboard*', ...(lines.length ? lines : ['No entries yet.'])].join('\n');
}

async function sendLeaderboard(chatId, threadId) {
  return renderMenu(chatId, threadId, 'leaderboard', await buildLeaderboardText());
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

async function sendBagworkInfo(chatId, threadId) {
  const tasks = await bagwork.getBagworkTasks();
  let defaultText;
  // New per-view pricing shape. Anything else (old shape, null on fetch
  // failure, or a rollback) falls through to the static message below.
  if (tasks && tasks.pricing === 'per_view' && tasks.rate_per_1k) {
    const xRate = tasks.rate_per_1k.x;
    const tiktokRate = tasks.rate_per_1k.tiktok;
    const lines = ['💼 *Bag Work*'];
    lines.push(`${xRate} SOL per 1,000 views on X, ${tiktokRate} on TikTok.`);
    lines.push(`Every approved piece pays at least ${tasks.min_sol} SOL, up to ${tasks.max_sol} SOL.`);
    lines.push('A piece is priced off the views it has 48 hours after posting.');
    if (Array.isArray(tasks.formats) && tasks.formats.length) {
      lines.push('');
      lines.push('*Formats:*');
      for (const format of tasks.formats) {
        lines.push(`• ${format.label}`);
      }
    }
    if (tasks.note) lines.push(tasks.note);
    lines.push(`Submit at: ${tasks.page ?? FAWKQ_BAGWORK_URL}`);
    defaultText = lines.join('\n');
  } else {
    defaultText = `💼 Complete tasks at ${FAWKQ_BAGWORK_URL} to earn XP and SOL. Your rewards land automatically once a task is confirmed.`;
  }
  return renderMenu(chatId, threadId, 'bagwork', defaultText);
}

async function buildBagworkboardText() {
  const rows = await bagwork.getBagworkLeaderboard(10);
  const lines = (rows ?? []).map(
    (r, i) => `${i + 1}. ${telegram.inertHandle(r.handle)} — ${r.total_sol} SOL (${r.pieces} pieces)`
  );
  return ['🏗 *Bag Workers Leaderboard*', ...(lines.length ? lines : ['No paid pieces yet.'])].join('\n');
}

async function sendBagworkboard(chatId, threadId) {
  return renderMenu(chatId, threadId, 'bagworkboard', await buildBagworkboardText());
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

  // Streamflow Lock contract IDs (metadata accounts, shown in the
  // Streamflow UI) each have their tokens in a separate underlying token
  // account (the contract's escrow_tokens field) rather than the contract
  // ID itself — these env vars point at those accounts, confirmed by
  // reading escrow_tokens directly out of each contract's own on-chain
  // data, so the balances below are live on-chain reads, not hardcoded
  // snapshots. darealrektrush's lock contract is
  // HEnSgGeNoHkiSpwoZaZrRh7jH5hBFhHFv1yCzz9eoQZG, asoberspartan's is
  // 5QpTJzXbSxBT2DohA1EdW8UcRog1UtVf6WDcX99JVL87 — both 30,150,000 FAWKQ,
  // unlocking Sep 3 2026.
  const streamflowLocks = [
    ['darealrektrush (Co-Founder)', process.env.THOMAS_COFOUNDER_STREAMFLOW_LOCK_ACCOUNT],
    ['asoberspartan (Co-Founder)', process.env.ANDREW_COFOUNDER_STREAMFLOW_LOCK_ACCOUNT],
  ].filter(([, address]) => address);

  const solOnlyWallets = [
    ['Community', process.env.COMMUNITY_WALLET_PUBLIC],
    ['Dev', process.env.DEV_WALLET_PUBLIC],
    ['Ocean conservation', process.env.OCEAN_WALLET_PUBLIC],
    ['Bag wallet', process.env.BAG_WALLET_PUBLIC],
    ['Buyback reserve', process.env.BUYBACK_RESERVE_WALLET_PUBLIC],
  ].filter(([, address]) => address);

  const supplyWallets = [
    ['Creator', process.env.CREATOR_WALLET_PUBLIC],
    ['Ocean conservation', process.env.OCEAN_WALLET_PUBLIC],
  ].filter(([, address]) => address);

  // Co-founders' personal wallets — their own separate section, distinct
  // from both Token Holdings above (project wallets) and the Streamflow
  // lock section below (their locked, not personally-held, supply).
  const founderPersonalWallets = [
    ['darealrektrush (Co-Founder)', process.env.THOMAS_COFOUNDER_WALLET_PUBLIC],
    ['asoberspartan (Co-Founder)', process.env.ANDREW_COFOUNDER_WALLET_PUBLIC],
  ].filter(([, address]) => address);

  const [solOnlyBalances, supplySolBalances, founderSolBalances] = await Promise.all([
    Promise.all(solOnlyWallets.map(([, address]) => solana.getWalletBalanceLamports(connection, address))),
    Promise.all(supplyWallets.map(([, address]) => solana.getWalletBalanceLamports(connection, address))),
    Promise.all(founderPersonalWallets.map(([, address]) => solana.getWalletBalanceLamports(connection, address))),
  ]);

  // Token-supply-held numbers depend on TOKEN_MINT being a real mint;
  // degrade gracefully instead of letting a missing/invalid mint (or a
  // Helius error) silently kill the whole command.
  let supplyTokens = supplyWallets.map(() => null);
  let founderTokens = founderPersonalWallets.map(() => null);
  let totalSupplyTokens = null;
  let streamflowLockedTokens = streamflowLocks.map(() => null);
  if (mint && (supplyWallets.length || founderPersonalWallets.length || streamflowLocks.length)) {
    try {
      const { supply, decimals } = await solana.getMintSupplyInfo(mint);
      totalSupplyTokens = supply / 10 ** decimals;

      if (supplyWallets.length) {
        const rawTokens = await Promise.all(
          supplyWallets.map(([, address]) => solana.getTokenBalanceForOwner(mint, address))
        );
        supplyTokens = rawTokens.map((raw) => raw / 10 ** decimals);
      }

      if (founderPersonalWallets.length) {
        const rawFounderTokens = await Promise.all(
          founderPersonalWallets.map(([, address]) => solana.getTokenBalanceForOwner(mint, address))
        );
        founderTokens = rawFounderTokens.map((raw) => raw / 10 ** decimals);
      }

      if (streamflowLocks.length) {
        const rawLocked = await Promise.all(
          streamflowLocks.map(([, address]) => solana.getTokenAccountRawBalance(connection, address))
        );
        streamflowLockedTokens = rawLocked.map((raw) => raw / 10 ** decimals);
      }
    } catch (err) {
      console.error('sendWallets: failed to fetch token supply data', err);
    }
  }

  const pctOfSupply = (tokens) =>
    tokens != null && totalSupplyTokens ? ` (${((tokens / totalSupplyTokens) * 100).toFixed(2)}% of supply)` : '';
  const formatTokens = (tokens) => (tokens != null ? Math.round(tokens).toLocaleString() : 'unavailable');

  const lines = [
    '💳 *FawkQ Wallets*',
    ...solOnlyWallets.map(([label], i) => `${label}: ${solana.lamportsToSol(solOnlyBalances[i]).toFixed(4)} SOL`),
  ];

  if (supplyWallets.length) {
    lines.push('', '📊 *Token Holdings*');
    supplyWallets.forEach(([label], i) => {
      const sol = solana.lamportsToSol(supplySolBalances[i]).toFixed(4);
      const tokens = supplyTokens[i];
      lines.push(`${label}: ${sol} SOL · ${formatTokens(tokens)} FAWKQ${pctOfSupply(tokens)}`);
    });
  }

  if (founderPersonalWallets.length) {
    lines.push('', '👥 *Founders Personal Supply*');
    founderPersonalWallets.forEach(([label], i) => {
      const sol = solana.lamportsToSol(founderSolBalances[i]).toFixed(4);
      const tokens = founderTokens[i];
      lines.push(`${label}: ${sol} SOL · ${formatTokens(tokens)} FAWKQ${pctOfSupply(tokens)}`);
    });
  }

  if (streamflowLocks.length) {
    lines.push('', '🔒 *Founders Supply Locked (Streamflow)*');
    streamflowLocks.forEach(([label], i) => {
      const tokens = streamflowLockedTokens[i];
      lines.push(`${label}: ${formatTokens(tokens)} FAWKQ${pctOfSupply(tokens)}`);
    });
  }

  return renderMenu(chatId, threadId, 'wallets', lines.join('\n'));
}

function sendOfficialLinks(chatId, threadId) {
  const defaultText = [
    '🔗 *Official Links*',
    `Website: ${FAWKQ_WEBSITE_URL}`,
    `Bagwork: ${FAWKQ_BAGWORK_URL}`,
  ].join('\n');
  return renderMenu(chatId, threadId, 'links', defaultText);
}

function sendAbout(chatId, threadId) {
  const defaultText = [
    'ℹ️ *About FawkQ*',
    "FAWK Q is the community's eyes on the money. Real-time price, holder counts, wallet balances, and every reward distribution posted with tx links the second it happens.",
    '75% back to the community, 15% dev, 10% straight to ocean conservation — no spin, just receipts.',
  ].join('\n');
  return renderMenu(chatId, threadId, 'about', defaultText);
}

function sendDoorInfo(chatId, threadId) {
  const defaultText = [
    '🚪 Beyond the Door — CrabStar',
    '',
    'FawkQ is the front door. CrabStar is the house where that trust gets put to work — a Solana ecosystem project built around a real ocean conservation mission, not just a token chart.',
    '',
    "Everyone in crypto is politely lying to you. We're honest to your face, and loud about it.",
    '',
    'No roadmap. No suit-and-tie promises. No "trust me, bro."',
    '',
    "Just a gold chain, an attitude, and a wallet you'll be able to check the day we launch.",
    '',
    '*The Mission*',
    "The noise pays for something real. Here's the turn the timeline won't expect.",
    '',
    'All this, the gold chain, the trash talk, the beautiful mayhem, exists to fund a real, serious, mission-driven project called CrabStar ($CRAB).',
    '',
    'Its mission is ocean conservation…',
    '',
    'Real money, moving on-chain, toward creating decentralized global impact with DeFi.',
    '',
    `Roadmap and the full CrabStar story: ${FAWKQ_WEBSITE_URL}`,
  ].join('\n');
  return renderMenu(chatId, threadId, 'door', defaultText);
}

async function sendSignalCommand(chatId, threadId) {
  const activeSignal = await signal.repostSignalToChat(chatId, threadId);
  if (!activeSignal) {
    return telegram.sendMessage(chatId, '📡 No active Signal right now — check back soon.', { threadId });
  }
}

async function sendSpaces(chatId, threadId) {
  const text = await events.buildUpcomingText('space', {
    header: '🎙 *Upcoming Spaces*',
    emptyText: '🎙 No Spaces scheduled right now — check back soon.',
  });
  return renderMenu(chatId, threadId, 'spaces', text);
}

async function handlePostSignalCommand(message) {
  const chatId = message.chat.id;
  const threadId = message.message_thread_id;

  if (!(await admin.isGroupAdmin(chatId, message.from.id))) {
    return telegram.sendMessage(chatId, '🚫 Only group admins can use /postsignal.', { threadId });
  }

  const newSignal = await signal.createAndPostSignal();
  const kindLabel = newSignal.kind.replace(/_/g, ' ');
  return telegram.sendMessage(chatId, `📡 Posted a new ${kindLabel} Signal to fawkq-announcements.`, { threadId });
}

telegram.validateTopicIds();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`project-q listening on :${PORT}`));
