import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { closedCampaignLeaderboards, getCampaignLeaderboards } from './campaign/leaderboards.js';
import { closedMissionEvidence, getParticipantMissionEvidence } from './campaign/missionEvidence.js';
import * as referrals from './campaign/referrals.js';
import * as communityActivity from './campaign/communityActivity.js';
import * as xInvite from './campaign/xInvite.js';
import * as oracleIngest from './campaign/oracleIngest.js';
import { validateTelegramInitData } from './campaign/telegramMiniApp.js';
import * as walletVerification from './campaign/walletVerification.js';
import * as walletStatus from './campaign/walletStatus.js';
import {
  WEBSITE_VOTE_PROFILES,
  buildWebsiteVoteChallenge,
  closedWebsiteVoteParticipantState,
  getWebsiteVoteParticipantState,
  publicWebsiteVoteAttempt,
  startWebsiteVoteAttempt,
} from './campaign/websiteVoteVerification.js';
import { uploadWebsiteVoteProof } from './campaign/websiteVoteProofUpload.js';
import {
  TELEGRAM_TRENDING_BOT_PROFILES,
  getTelegramTrendingReceiptSources,
  handleTelegramTrendingReceipt,
  isTelegramTrendingReceiptCandidate,
  publicTelegramTrendingSource,
} from './campaign/telegramTrendingReceipts.js';
import { telegramTrendingReceiptsEnabled } from './lib/featureFlags.js';
import * as earnToBurnService from './earnToBurn/service.js';

const app = express();
app.use(express.json({ limit: '100kb', strict: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/campaign-app', express.static(path.join(__dirname, '..', 'public', 'campaign-app')));

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BAGWORK_SECRET = process.env.BAGWORK_SECRET;
const ORACLE_CAMPAIGN_SECRET = process.env.ORACLE_CAMPAIGN_SECRET;
const FAWKQ_WEBSITE_URL = process.env.FAWKQ_WEBSITE_URL ?? 'https://fawkq.com';
const FAWKQ_BAGWORK_URL = process.env.FAWKQ_BAGWORK_URL ?? 'https://fawkq.com/bagwork';
const READINESS_CACHE_MS = 15_000;
let readinessCache = { value: null, expiresAt: 0, pending: null };

const STUB_COMMANDS = new Set([
  '/missions',
  '/meme',
  '/feed',
  '/ask',
]);

app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));

app.get('/campaign-app/api/runtime', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const runtime = await campaignService.getCampaignRuntime(supabase);
    return res.status(200).json({ ok: true, runtime });
  } catch (err) {
    console.error('public campaign runtime unavailable', err.message);
    return res.status(503).json({ ok: false, error: 'campaign runtime unavailable' });
  }
});

async function loadPublicReadiness() {
  if (readinessCache.value && Date.now() < readinessCache.expiresAt) return readinessCache.value;
  if (readinessCache.pending) return readinessCache.pending;
  readinessCache.pending = campaignService.getPublicCampaignReadiness(supabase)
    .then((value) => {
      readinessCache = { value, expiresAt: Date.now() + READINESS_CACHE_MS, pending: null };
      return value;
    })
    .catch((error) => {
      readinessCache.pending = null;
      throw error;
    });
  return readinessCache.pending;
}

app.get('/campaign-app/api/readiness', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    return res.status(200).json({ ok: true, readiness: await loadPublicReadiness() });
  } catch (err) {
    console.error('public campaign readiness unavailable', err.message);
    return res.status(503).json({
      ok: false,
      error: 'campaign readiness unavailable',
      readiness: campaignService.closedPublicCampaignReadiness(),
    });
  }
});

app.get('/campaign-app/api/burns/summary', async (req, res) => {
  const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? campaignService.DEFAULT_CAMPAIGN_ID;
  try {
    const summary = await earnToBurnService.getEarnToBurnSummary(supabase, campaignId);
    return res.status(200).json({ ok: true, summary });
  } catch (err) {
    console.error('public Earn to Burn summary unavailable', err.message);
    return res.status(503).json({
      ok: false,
      error: 'burn ledger unavailable',
      summary: earnToBurnService.closedEarnToBurnSummary(campaignId),
    });
  }
});

app.get('/campaign-app/api/burns/receipts/:receiptCode', async (req, res) => {
  try {
    const receipt = await earnToBurnService.getBurnReceipt(supabase, req.params.receiptCode);
    if (!receipt) return res.status(404).json({ ok: false, error: 'burn receipt not found' });
    return res.status(200).json({ ok: true, receipt });
  } catch (err) {
    const invalid = err.message === 'invalid burn receipt code';
    if (!invalid) console.error('public burn receipt unavailable', err.message);
    return res.status(invalid ? 400 : 503).json({
      ok: false,
      error: invalid ? 'invalid burn receipt code' : 'burn receipt unavailable',
    });
  }
});

app.post('/campaign-app/api/session', async (req, res) => {
  try {
    const session = validateTelegramInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
    const participant = await campaignService.getParticipantStatus(supabase, session.user.id);
    let referralProfile;
    let communityProfile;
    let xInviteStatus;
    let leaderboards;
    let missionEvidence;
    let websiteVotes;
    let telegramTrendingSources;
    try {
      await referrals.refreshReferralQualification(supabase, session.user.id);
      referralProfile = await referrals.getReferralProfile(supabase, session.user.id);
    } catch (referralError) {
      console.error('campaign referral profile unavailable', referralError.message);
      referralProfile = referrals.closedReferralProfile();
    }
    try {
      communityProfile = await communityActivity.getCommunityActivityProfile(supabase, session.user.id);
    } catch (communityError) {
      console.error('community activity profile unavailable', communityError.message);
      communityProfile = communityActivity.closedCommunityActivityProfile();
    }
    try {
      xInviteStatus = await xInvite.getXInviteStatus(supabase, session.user.id);
    } catch (xInviteError) {
      console.error('campaign X invite status unavailable', xInviteError.message);
      xInviteStatus = xInvite.closedXInviteStatus();
    }
    try {
      leaderboards = await getCampaignLeaderboards(supabase, session.user.id);
    } catch (leaderboardError) {
      console.error('campaign leaderboards unavailable', leaderboardError.message);
      leaderboards = closedCampaignLeaderboards(participant.campaignState, 'Verified rankings are temporarily unavailable.');
    }
    try {
      missionEvidence = await getParticipantMissionEvidence(supabase, session.user.id);
    } catch (missionError) {
      console.error('campaign mission evidence unavailable', missionError.message);
      missionEvidence = closedMissionEvidence(participant.campaignState, 'Verified mission evidence is temporarily unavailable.');
    }
    try {
      websiteVotes = await getWebsiteVoteParticipantState(supabase, session.user.id);
    } catch (websiteVoteError) {
      console.error('website vote participant state unavailable', websiteVoteError.message);
      websiteVotes = closedWebsiteVoteParticipantState();
    }
    if (telegramTrendingReceiptsEnabled(process.env)) {
      try {
        telegramTrendingSources = (await getTelegramTrendingReceiptSources(supabase))
          .map(publicTelegramTrendingSource);
      } catch (trendingError) {
        console.error('Telegram trending source state unavailable', trendingError.message);
      }
    }
    telegramTrendingSources ??= TELEGRAM_TRENDING_BOT_PROFILES.map((source) => ({
      sourceKey: source.sourceKey,
      handle: source.handle,
      cooldownSeconds: source.cooldownSeconds,
      accepting: false,
      status: 'FEATURE_DISABLED',
      verificationMode: null,
    }));
    return res.status(200).json({
      ok: true,
      user: session.user,
      participant,
      referrals: referralProfile,
      community: communityProfile,
      xInvite: xInviteStatus,
      leaderboards,
      missionEvidence,
      websiteVotes,
      telegramTrendingSources,
      capabilities: {
        walletVerification: process.env.PROJECT_Q_WALLET_VERIFICATION_ENABLED === 'true',
        websiteVoteReview: process.env.PROJECT_Q_WEBSITE_VOTE_REVIEW_ENABLED === 'true',
        telegramTrendingReceipts: telegramTrendingReceiptsEnabled(process.env),
      },
    });
  } catch (err) {
    const unavailable = err.message === 'telegram mini app authentication unavailable';
    const databaseFailure = String(err.message).startsWith('Supabase ');
    if (unavailable || databaseFailure) console.error('campaign Mini App session failed', err.message);
    return res.status(unavailable || databaseFailure ? 503 : 401).json({
      ok: false,
      error: unavailable || databaseFailure ? 'session unavailable' : 'invalid telegram session',
    });
  }
});

function websiteVoteHttpError(res, error, operation) {
  const message = String(error?.message || '');
  const unauthorized = message.includes('telegram init data') || message.includes('telegram user');
  const notFound = message.includes('attempt not found') || message.includes('unknown website vote attempt');
  const unavailable = message.startsWith('Supabase ');
  const invalid = message.startsWith('invalid ');
  console.error(`${operation} failed`, message);
  return res.status(unauthorized ? 401 : notFound ? 404 : unavailable ? 503 : invalid ? 400 : 409).json({
    ok: false,
    error: unauthorized ? 'invalid telegram session'
      : notFound ? 'website vote attempt not found'
        : unavailable ? 'website vote verification unavailable'
          : invalid ? message : 'website vote action rejected',
  });
}

app.post('/campaign-app/api/votes/status', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const session = validateTelegramInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
    const websiteVotes = await getWebsiteVoteParticipantState(supabase, session.user.id);
    return res.status(200).json({ ok: true, websiteVotes });
  } catch (error) {
    return websiteVoteHttpError(res, error, 'website vote status');
  }
});

app.post('/campaign-app/api/votes/attempts', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const session = validateTelegramInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
    await campaignService.assertCampaignParticipationEnabled(
      supabase,
      process.env.PROJECT_Q_CAMPAIGN_APP_ENABLED
    );
    const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? campaignService.DEFAULT_CAMPAIGN_ID;
    const source = WEBSITE_VOTE_PROFILES.find(({ sourceKey }) => sourceKey === req.body?.sourceKey);
    if (!source) throw new Error('unknown website vote source');
    const { challenge, challengeHash } = buildWebsiteVoteChallenge();
    const rows = await startWebsiteVoteAttempt(supabase, {
      campaignId,
      sourceKey: source.sourceKey,
      telegramUserId: session.user.id,
      challengeHash,
    });
    const attempt = publicWebsiteVoteAttempt(Array.isArray(rows) ? rows[0] : rows);
    return res.status(201).json({
      ok: true,
      attempt,
      challenge,
      source: { sourceKey: source.sourceKey, name: source.name, url: source.url },
    });
  } catch (error) {
    return websiteVoteHttpError(res, error, 'website vote attempt');
  }
});

app.post(
  '/campaign-app/api/votes/proof',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '2mb' }),
  async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const session = validateTelegramInitData(
        req.get('x-project-q-init-data'),
        process.env.TELEGRAM_BOT_TOKEN
      );
      const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? campaignService.DEFAULT_CAMPAIGN_ID;
      const attempt = await uploadWebsiteVoteProof(supabase, {
        campaignId,
        telegramUserId: session.user.id,
        attemptId: req.get('x-project-q-vote-attempt'),
        challenge: req.get('x-project-q-vote-challenge'),
        bytes: req.body,
        contentType: req.get('content-type'),
      });
      return res.status(202).json({ ok: true, attempt });
    } catch (error) {
      return websiteVoteHttpError(res, error, 'website vote proof upload');
    }
  }
);

app.post('/campaign-app/api/wallet/challenge', async (req, res) => {
  try {
    const session = validateTelegramInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
    await campaignService.assertWalletVerificationEnabled(supabase, session.user.id, {
      verificationFlag: process.env.PROJECT_Q_WALLET_VERIFICATION_ENABLED,
      participationFlag: process.env.PROJECT_Q_CAMPAIGN_APP_ENABLED,
    });
    const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? campaignService.DEFAULT_CAMPAIGN_ID;
    const challenge = await walletVerification.createWalletChallenge(supabase, campaignId, session.user.id);
    return res.status(200).json({ ok: true, ...challenge });
  } catch (err) {
    console.error('wallet challenge failed', err.message);
    return res.status(400).json({ ok: false, error: 'wallet challenge unavailable' });
  }
});

app.post('/campaign-app/api/wallet/verify', async (req, res) => {
  try {
    const session = validateTelegramInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
    await campaignService.assertWalletVerificationEnabled(supabase, session.user.id, {
      verificationFlag: process.env.PROJECT_Q_WALLET_VERIFICATION_ENABLED,
      participationFlag: process.env.PROJECT_Q_CAMPAIGN_APP_ENABLED,
    });
    const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? campaignService.DEFAULT_CAMPAIGN_ID;
    const result = await walletVerification.consumeWalletChallenge(supabase, {
      campaignId,
      telegramUserId: session.user.id,
      nonce: req.body?.nonce,
      wallet: req.body?.wallet,
      signature: req.body?.signature,
    });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('wallet verification failed', err.message);
    return res.status(400).json({ ok: false, error: 'wallet verification failed' });
  }
});

app.post('/campaign-app/api/wallet/status', async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  try {
    const session = validateTelegramInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
    const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? campaignService.DEFAULT_CAMPAIGN_ID;
    const identityRows = await supabase.select(
      'identity_links',
      `?campaign_id=eq.${encodeURIComponent(campaignId)}` +
        `&telegram_user_id=eq.${encodeURIComponent(String(session.user.id))}` +
        '&select=reward_wallet,wallet_verified_at&limit=1'
    );
    const identity = identityRows[0];
    if (!identity?.reward_wallet || !identity.wallet_verified_at) {
      return res.status(409).json({ ok: false, error: 'verified reward wallet required' });
    }
    const status = await walletStatus.getFawkqWalletStatus(solana.getConnection(), identity.reward_wallet);
    return res.status(200).json({ ok: true, status });
  } catch (err) {
    console.error('campaign wallet status unavailable', err.message);
    return res.status(503).json({
      ok: false,
      error: 'wallet status unavailable',
      status: walletStatus.closedFawkqWalletStatus(),
    });
  }
});

app.get('/version', (req, res) =>
  res.status(200).json({
    commit: process.env.RENDER_GIT_COMMIT ?? 'unknown',
    branch: process.env.RENDER_GIT_BRANCH ?? 'unknown',
  })
);

app.post('/webhook', async (req, res) => {
  const header = req.get('x-telegram-bot-api-secret-token');
  if (!oracleIngest.secretMatches(header, TELEGRAM_WEBHOOK_SECRET)) {
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
  if (!oracleIngest.secretMatches(header, BAGWORK_SECRET)) {
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

app.post('/oracle/campaign-identity', async (req, res) => {
  if (!oracleIngest.secretMatches(req.get('x-oracle-campaign-secret'), ORACLE_CAMPAIGN_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const identity = oracleIngest.validateOracleIdentityEvent(req.body);
    const result = await oracleIngest.linkOracleIdentity(supabase, identity);
    return res.status(200).json({ ok: true, identity: result });
  } catch (err) {
    const invalid = String(err.message).startsWith('invalid ');
    console.error('Oracle campaign identity ingest failed', err.message);
    return res.status(invalid ? 400 : 409).json({
      ok: false,
      error: invalid ? err.message : 'campaign identity rejected',
    });
  }
});

app.post('/oracle/campaign-x-invite', async (req, res) => {
  if (!oracleIngest.secretMatches(req.get('x-oracle-campaign-secret'), ORACLE_CAMPAIGN_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const event = xInvite.validateXInviteEvent(req.body, process.env);
    const result = await xInvite.ingestXInviteEvent(supabase, event);
    return res.status(200).json({ ok: true, event: result });
  } catch (err) {
    const invalid = String(err.message).startsWith('invalid ');
    console.error('campaign X invite ingest failed', err.message);
    return res.status(invalid ? 400 : 409).json({
      ok: false,
      error: invalid ? err.message : 'campaign X invite rejected',
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
  const isPrivate = message.chat.type === 'private';

  // Pending admin edits (bio text / media photo) take priority so an admin
  // can finish an edit regardless of normal topic/command gating.
  if (admin.hasPendingEdit(chatId, message.from.id)) {
    return admin.handlePendingEditMessage(message);
  }

  // Participants prove trending-bot votes by forwarding the original bot
  // completion message to Project Q in DM. Numeric origin IDs, fresh source
  // certifications, receipt markers, cooldowns and replay protection are all
  // enforced before an event is recorded. Never log the forwarded body.
  if (telegramTrendingReceiptsEnabled(process.env)
    && isTelegramTrendingReceiptCandidate(message)) {
    try {
      const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID
        ?? campaignService.DEFAULT_CAMPAIGN_ID;
      const result = await handleTelegramTrendingReceipt(supabase, message, {
        campaignId,
        env: process.env,
      });
      if (result.contextStored) {
        return telegram.sendMessage(
          chatId,
          `${telegram.escapeMarkdown(result.sourceHandle)} context saved. ` +
            'Forward the matching completion receipt within the certified window.'
        );
      }
      return telegram.sendMessage(
        chatId,
        `Receipt accepted for ${telegram.escapeMarkdown(result.sourceHandle)}. ` +
          'One Trending Push was recorded; XP remains subject to settlement and daily caps.'
      );
    } catch (err) {
      console.error('Telegram trending receipt rejected', String(err?.message || 'unknown error'));
      return telegram.sendMessage(
        chatId,
        'Receipt not accepted. Forward a fresh completion message from a certified ' +
          'campaign bot directly to Project Q. Screenshots and copied text are not accepted.'
      );
    }
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

  if (message.text) {
    try {
      const communityEvent = communityActivity.buildCommunityMessageEvent(message, process.env);
      if (communityEvent) await communityActivity.ingestCommunityMessage(supabase, communityEvent);
    } catch (err) {
      console.error('community activity ingest failed', err.message);
    }
  }

  if (!message.text) return; // non-text, non-pending messages are ignored

  // Preserve the dedicated bagwork feedback deep link, then let every other
  // private command continue through the normal Project Q command router.
  let startPayload = null;
  if (isPrivate) {
    await xp.ensureUser(message.from.id, message.from.username ?? message.from.first_name);
    const privateText = message.text.trim();
    startPayload = privateText.startsWith('/start')
      ? privateText.split(/\s+/)[1] ?? null
      : null;

    if (startPayload === 'bwfeedback') {
      return bagwork.handleFeedbackDeepLink(message);
    }
  }

  const guard = telegram.guardInteraction(message.chat.type, threadId);
  if (!guard.allowed || !guard.interactive) return;

  const text = message.text.trim();
  // Group chats often send commands as /start@BotUsername — strip the suffix.
  const command = text.split(/\s+/)[0].split('@')[0];

  await xp.ensureUser(message.from.id, message.from.username ?? message.from.first_name);

  // Private access is still allowlisted inside handleAdminCommand; group
  // access still requires Telegram administrator status. Do not gate this
  // here or configured founders cannot open the private command centre.
  if (command === '/adminf') {
    return admin.handleAdminCommand(message);
  }
  if (command === '/admincancel') {
    return admin.cancelPendingEdit(chatId, message.from.id);
  }
  if (!isPrivate && command === '/postsignal') {
    return handlePostSignalCommand(message);
  }
  if (!isPrivate && command === '/addevent') {
    return eventsAdmin.handleAddEventCommand(message);
  }

  if (STUB_COMMANDS.has(command)) {
    const key = command.slice(1); // e.g. 'missions', 'meme'
    return renderMenu(chatId, threadId, key, '🚧 Coming soon.');
  }

  switch (command) {
    case '/start':
      if (isPrivate && referrals.parseReferralPayload(startPayload)) {
        try {
          await referrals.captureReferral(supabase, startPayload, message.from.id);
          return sendHome(chatId, threadId, { isPrivate, referralCaptured: true });
        } catch (err) {
          console.error('campaign referral capture rejected', err.message);
          return sendHome(chatId, threadId, { isPrivate, referralCaptured: false });
        }
      }
      return sendHome(chatId, threadId, { isPrivate });
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
  const chatType = callbackQuery.message?.chat?.type;
  const guard = telegram.guardInteraction(chatType, threadId);

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
      return sendHome(chatId, threadId, { isPrivate: chatType === 'private' });
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
    case `${campaignUi.MISSIONS_CALLBACK_PREFIX}:referrals`: {
      let referralProfile;
      try {
        referralProfile = await referrals.getReferralProfile(supabase, callbackQuery.from.id);
      } catch (err) {
        console.error('campaign referral mission unavailable', err.message);
        referralProfile = referrals.closedReferralProfile();
      }
      return editMenuMessage(
        callbackQuery,
        campaignUi.buildReferralMissionText(referralProfile),
        campaignUi.buildMissionScreenMenu()
      );
    }
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
    return campaignUi.buildCampaignHomeText(await campaignService.getCampaignRuntime(supabase));
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

function sendHome(chatId, threadId, { isPrivate = false, referralCaptured = null } = {}) {
  const privateUrl = isPrivate ? null : telegram.botDeepLink('home');
  let defaultText = isPrivate
    ? '🔒 *Project Q Private Command Centre*\nUse every menu, campaign screen and community tool directly here.'
    : '👁 *FawkQ Home* — pick a section:\n\n_Recommended: open Project Q privately to keep campaign menus out of the community chat._';
  if (referralCaptured === true) {
    defaultText += '\n\n✅ *Referral recorded*\nComplete campaign identity, verify a post-referral FAWKQ purchase of at least USD $2, and earn your first verified XP to qualify.';
  } else if (referralCaptured === false) {
    defaultText += '\n\n_Referral attribution was not accepted. Existing participants, self-referrals and reused links do not create a new referral._';
  }
  return renderMenu(chatId, threadId, 'home', defaultText, {
    replyMarkup: telegram.buildHomeMenu({ privateUrl }),
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
