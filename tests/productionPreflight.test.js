import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProductionPreflightText, runProductionPreflight } from '../src/lib/productionPreflight.js';

const WEBHOOK_URL = 'https://project-q-8k3a.onrender.com/webhook';
const ENV = {
  NODE_ENV: 'production',
  RENDER_SERVICE_NAME: 'project-q',
  RENDER_GIT_BRANCH: 'main',
  RENDER_GIT_COMMIT: '4bfcb2122a3da2eca2055615fd028b7400530233',
  TELEGRAM_BOT_USERNAME: 'project_q_bot',
  TELEGRAM_WEBHOOK_URL: WEBHOOK_URL,
  PROJECT_Q_CAMPAIGN_APP_URL: 'https://project-q-8k3a.onrender.com/campaign-app/',
};

const telegramClient = {
  getMe: async () => ({ id: 8712992989, is_bot: true, username: 'project_q_bot' }),
  getWebhookInfo: async () => ({
    url: WEBHOOK_URL,
    pending_update_count: 0,
    allowed_updates: ['message', 'callback_query'],
  }),
};

const readinessLoader = async () => ({
  state: 'DRAFT',
  readyCount: 2,
  totalCount: 11,
  reportHash: 'a'.repeat(64),
});

test('healthy production plumbing is safe for a read-only rehearsal', async () => {
  const result = await runProductionPreflight({
    env: ENV,
    telegramClient,
    campaignClient: {},
    readinessLoader,
  });
  assert.equal(result.safeForRehearsal, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.blockers, 0);
  assert.equal(result.warnings, 0);
  assert.equal(result.checks.every(({ status }) => status === 'pass'), true);
});

test('older Render services may omit optional identity metadata', async () => {
  const env = { ...ENV };
  delete env.NODE_ENV;
  delete env.RENDER_SERVICE_NAME;
  const result = await runProductionPreflight({
    env,
    telegramClient,
    campaignClient: {},
    readinessLoader,
  });
  assert.equal(result.safeForRehearsal, true);
  assert.equal(result.checks.find(({ key }) => key === 'render').status, 'pass');
});

test('explicitly wrong Render metadata, branch or commit still blocks', async () => {
  for (const patch of [
    { NODE_ENV: 'development' },
    { RENDER_SERVICE_NAME: 'project-q-dev' },
    { RENDER_GIT_BRANCH: 'develop' },
    { RENDER_GIT_COMMIT: 'unknown' },
  ]) {
    const result = await runProductionPreflight({
      env: { ...ENV, ...patch },
      telegramClient,
      campaignClient: {},
      readinessLoader,
    });
    assert.equal(result.checks.find(({ key }) => key === 'render').status, 'block');
  }
});

test('wrong bot, webhook and enabled runtime flag fail closed', async () => {
  const result = await runProductionPreflight({
    env: { ...ENV, PROJECT_Q_CAMPAIGN_APP_ENABLED: 'true' },
    telegramClient: {
      getMe: async () => ({ is_bot: true, username: 'wrong_bot' }),
      getWebhookInfo: async () => ({
        url: 'https://project-q-dev.onrender.com/webhook',
        pending_update_count: 4,
        allowed_updates: ['message'],
      }),
    },
    campaignClient: {},
    readinessLoader,
  });
  assert.equal(result.safeForRehearsal, false);
  assert.equal(result.warnings, 1);
  assert.equal(result.checks.find(({ key }) => key === 'telegram-identity').status, 'block');
  assert.equal(result.checks.find(({ key }) => key === 'telegram-webhook').status, 'block');
  assert.equal(result.checks.find(({ key }) => key === 'runtime-flags').status, 'block');
});

test('Supabase failure and non-DRAFT state block without exposing an error', async () => {
  const unavailable = await runProductionPreflight({
    env: ENV,
    telegramClient,
    campaignClient: {},
    readinessLoader: async () => { throw new Error('secret database response'); },
  });
  assert.equal(unavailable.safeForRehearsal, false);
  assert.equal(buildProductionPreflightText(unavailable).includes('secret database response'), false);

  const active = await runProductionPreflight({
    env: ENV,
    telegramClient,
    campaignClient: {},
    readinessLoader: async () => ({ ...(await readinessLoader()), state: 'ACTIVE' }),
  });
  assert.equal(active.checks.find(({ key }) => key === 'campaign-state').status, 'block');
});

test('preflight text contains no configured credentials or wallet addresses', async () => {
  const env = {
    ...ENV,
    TELEGRAM_BOT_TOKEN: '8712992989:super_secret_token',
    TELEGRAM_WEBHOOK_SECRET: 'webhook-secret',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_hidden',
    CREATOR_WALLET_PUBLIC: '7kGJBag2VcjR4JB7qLStgizLa2eDQuGtiysZKzEetRMT',
  };
  const result = await runProductionPreflight({ env, telegramClient, campaignClient: {}, readinessLoader });
  const text = buildProductionPreflightText(result);
  for (const secret of [
    env.TELEGRAM_BOT_TOKEN,
    env.TELEGRAM_WEBHOOK_SECRET,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.CREATOR_WALLET_PUBLIC,
  ]) {
    assert.equal(text.includes(secret), false);
  }
  assert.match(text, /cannot activate Bond, move FAWKQ, sign, burn or publish/);
});
