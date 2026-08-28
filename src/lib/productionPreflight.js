import { resolveCampaignAppUrl } from '../campaign/ui.js';
import { getCampaignReadiness } from '../campaign/service.js';
import { isEnabled } from './featureFlags.js';
import { resolveTelegramWebhookUrl, TELEGRAM_WEBHOOK_ALLOWED_UPDATES } from './telegramWebhook.js';

const CAMPAIGN_RUNTIME_FLAGS = Object.freeze([
  'PROJECT_Q_CAMPAIGN_APP_ENABLED',
  'PROJECT_Q_WALLET_VERIFICATION_ENABLED',
  'PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED',
  'PROJECT_Q_EARN_TO_BURN_ENABLED',
  'PROJECT_Q_BURN_VERIFICATION_ENABLED',
  'PROJECT_Q_COMMUNITY_ACTIVITY_ENABLED',
  'PROJECT_Q_DISTRIBUTIONS_ENABLED',
]);

function result(key, label, status, detail) {
  return { key, label, status, detail };
}

function normalizeUsername(value) {
  return String(value ?? '').trim().replace(/^@/, '').toLowerCase();
}

function validatedAppUrl(env) {
  const raw = resolveCampaignAppUrl(env);
  if (!raw) return null;
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('invalid campaign app URL');
  }
  return url;
}

function formatCommit(value) {
  return /^[0-9a-f]{40}$/i.test(String(value ?? '')) ? String(value).slice(0, 8) : 'unknown';
}

export async function runProductionPreflight({
  env = process.env,
  telegramClient,
  campaignClient,
  readinessLoader = getCampaignReadiness,
} = {}) {
  const checks = [];
  const serviceName = String(env.RENDER_SERVICE_NAME ?? '').trim();
  const branch = String(env.RENDER_GIT_BRANCH ?? '').trim();
  const commit = formatCommit(env.RENDER_GIT_COMMIT);
  const renderReady = env.NODE_ENV === 'production'
    && serviceName === 'project-q'
    && branch === 'main'
    && commit !== 'unknown';
  checks.push(result(
    'render',
    'Render production identity',
    renderReady ? 'pass' : 'block',
    renderReady ? `${serviceName} · ${branch} · ${commit}` : 'Expected project-q on main with a deployed commit'
  ));

  const [botResult, webhookResult, readinessResult] = await Promise.allSettled([
    telegramClient.getMe(),
    telegramClient.getWebhookInfo(),
    readinessLoader(campaignClient, env),
  ]);

  if (botResult.status === 'fulfilled') {
    const bot = botResult.value;
    const configuredUsername = normalizeUsername(env.TELEGRAM_BOT_USERNAME);
    const actualUsername = normalizeUsername(bot?.username);
    const identityReady = bot?.is_bot === true
      && Boolean(actualUsername)
      && (!configuredUsername || configuredUsername === actualUsername);
    checks.push(result(
      'telegram-identity',
      'Telegram bot identity',
      identityReady ? 'pass' : 'block',
      identityReady ? `\`@${actualUsername}\`` : 'Authenticated bot does not match the configured identity'
    ));
  } else {
    checks.push(result('telegram-identity', 'Telegram bot identity', 'block', 'Telegram authentication unavailable'));
  }

  let expectedWebhook = null;
  try {
    expectedWebhook = resolveTelegramWebhookUrl(env);
  } catch {
    // The check below reports the invalid configuration without exposing it.
  }
  if (webhookResult.status === 'fulfilled' && expectedWebhook) {
    const info = webhookResult.value ?? {};
    const registered = new Set(Array.isArray(info.allowed_updates) ? info.allowed_updates : []);
    const exactUrl = info.url === expectedWebhook;
    const updateTypesReady = TELEGRAM_WEBHOOK_ALLOWED_UPDATES.every((type) => registered.has(type));
    checks.push(result(
      'telegram-webhook',
      'Telegram production webhook',
      exactUrl && updateTypesReady ? 'pass' : 'block',
      exactUrl && updateTypesReady ? 'Exact URL · messages + callbacks' : 'URL or allowed update types do not match production'
    ));
    const pending = Number.isSafeInteger(info.pending_update_count) ? info.pending_update_count : null;
    checks.push(result(
      'telegram-backlog',
      'Telegram delivery backlog',
      pending === 0 ? 'pass' : 'warn',
      pending === null ? 'Count unavailable' : `${pending} pending update${pending === 1 ? '' : 's'}`
    ));
  } else {
    checks.push(result('telegram-webhook', 'Telegram production webhook', 'block', 'Webhook verification unavailable'));
    checks.push(result('telegram-backlog', 'Telegram delivery backlog', 'warn', 'Count unavailable'));
  }

  if (readinessResult.status === 'fulfilled') {
    const readiness = readinessResult.value;
    const reportValid = /^[0-9a-f]{64}$/.test(String(readiness?.reportHash ?? ''));
    checks.push(result(
      'supabase',
      'Supabase campaign read',
      reportValid ? 'pass' : 'block',
      reportValid ? `${readiness.readyCount}/${readiness.totalCount} launch gates · report ${readiness.reportHash.slice(0, 8)}` : 'Readiness report is unavailable or invalid'
    ));
    checks.push(result(
      'campaign-state',
      'Campaign rehearsal lock',
      readiness?.state === 'DRAFT' ? 'pass' : 'block',
      readiness?.state === 'DRAFT' ? 'DRAFT · activation closed' : 'Campaign is not safely in DRAFT'
    ));
  } else {
    checks.push(result('supabase', 'Supabase campaign read', 'block', 'Database readiness unavailable'));
    checks.push(result('campaign-state', 'Campaign rehearsal lock', 'block', 'Campaign state unavailable'));
  }

  try {
    const appUrl = validatedAppUrl(env);
    const webhookUrl = expectedWebhook ? new URL(expectedWebhook) : null;
    const sameOrigin = appUrl && webhookUrl && appUrl.origin === webhookUrl.origin;
    const correctPath = appUrl?.pathname === '/campaign-app/' || appUrl?.pathname === '/campaign-app';
    checks.push(result(
      'mini-app',
      'Campaign Mini App route',
      sameOrigin && correctPath ? 'pass' : 'block',
      sameOrigin && correctPath ? `${appUrl.host}/campaign-app/` : 'Expected the production /campaign-app/ route on the webhook origin'
    ));
  } catch {
    checks.push(result('mini-app', 'Campaign Mini App route', 'block', 'Mini App URL is missing or invalid'));
  }

  const enabledRuntimeFlags = CAMPAIGN_RUNTIME_FLAGS.filter((name) => isEnabled(env[name]));
  checks.push(result(
    'runtime-flags',
    'Campaign runtime safety flags',
    enabledRuntimeFlags.length ? 'block' : 'pass',
    enabledRuntimeFlags.length ? `${enabledRuntimeFlags.length} activation flag${enabledRuntimeFlags.length === 1 ? '' : 's'} enabled` : 'Participation, settlement, burn and distributions closed'
  ));

  const blockers = checks.filter(({ status }) => status === 'block').length;
  const warnings = checks.filter(({ status }) => status === 'warn').length;
  return {
    safeForRehearsal: blockers === 0,
    readOnly: true,
    blockers,
    warnings,
    checks,
  };
}

export function buildProductionPreflightText(preflight) {
  const icon = { pass: '✅', warn: '⚠️', block: '🛑' };
  const lines = preflight.checks.map(({ label, status, detail }) =>
    `${icon[status] ?? '•'} *${label}*\n${detail}`
  );
  return [
    '🧪 *Project Q // Production Preflight*',
    '',
    `*Result:* ${preflight.safeForRehearsal ? 'SAFE FOR REHEARSAL' : 'BLOCKED'}`,
    `*Findings:* ${preflight.blockers} blocker${preflight.blockers === 1 ? '' : 's'} · ${preflight.warnings} warning${preflight.warnings === 1 ? '' : 's'}`,
    '',
    ...lines,
    '',
    '_Read-only founder check. It cannot activate Bond, move FAWKQ, sign, burn or publish._',
  ].join('\n');
}
