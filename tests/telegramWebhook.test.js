import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  TELEGRAM_WEBHOOK_ALLOWED_UPDATES,
  reconcileTelegramWebhook,
  resolveTelegramWebhookUrl,
} from '../src/lib/telegramWebhook.js';

const WEBHOOK_URL = 'https://project-q-8k3a.onrender.com/webhook';
const ENV = {
  TELEGRAM_WEBHOOK_URL: WEBHOOK_URL,
  TELEGRAM_BOT_TOKEN: '8712992989:test_token_value',
  TELEGRAM_WEBHOOK_SECRET: 'test-secret_value',
};

function response(result, { ok = true, status = 200 } = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ ok, result }) };
}

test('webhook reconciliation is inert unless an exact URL is configured', async () => {
  let called = false;
  const result = await reconcileTelegramWebhook({
    env: {},
    fetchImpl: async () => { called = true; },
  });
  assert.deepEqual(result, {
    configured: false,
    reason: 'TELEGRAM_WEBHOOK_URL is not configured',
  });
  assert.equal(called, false);
});

test('webhook URL accepts only the exact credential-free HTTPS ingress path', () => {
  assert.equal(resolveTelegramWebhookUrl(ENV), WEBHOOK_URL);
  for (const url of [
    'http://project-q.example/webhook',
    'https://user:pass@project-q.example/webhook',
    'https://project-q.example/webhook?secret=nope',
    'https://project-q.example/webhook#fragment',
    'https://project-q.example/other',
  ]) {
    assert.throws(
      () => resolveTelegramWebhookUrl({ TELEGRAM_WEBHOOK_URL: url }),
      /exact credential-free HTTPS \/webhook URL/
    );
  }
});

test('startup reconciliation preserves pending updates and verifies messages plus callbacks', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    if (url.endsWith('/setWebhook')) return response(true);
    return response({
      url: WEBHOOK_URL,
      pending_update_count: 3,
      allowed_updates: ['message', 'callback_query'],
    });
  };

  const result = await reconcileTelegramWebhook({ env: ENV, fetchImpl });
  assert.deepEqual(result, {
    configured: true,
    host: 'project-q-8k3a.onrender.com',
    path: '/webhook',
    pendingUpdateCount: 3,
  });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/setWebhook$/);
  assert.deepEqual(calls[0].body, {
    url: WEBHOOK_URL,
    secret_token: ENV.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: TELEGRAM_WEBHOOK_ALLOWED_UPDATES,
    drop_pending_updates: false,
  });
  assert.match(calls[1].url, /\/getWebhookInfo$/);
  assert.deepEqual(calls[1].body, {});
});

test('webhook reconciliation fails closed on invalid secrets and mismatched verification', async () => {
  await assert.rejects(
    reconcileTelegramWebhook({
      env: { ...ENV, TELEGRAM_WEBHOOK_SECRET: 'not valid!' },
      fetchImpl: async () => response(true),
    }),
    /TELEGRAM_WEBHOOK_SECRET has an invalid format/
  );

  await assert.rejects(
    reconcileTelegramWebhook({
      env: ENV,
      fetchImpl: async (url) => url.endsWith('/setWebhook')
        ? response(true)
        : response({ url: 'https://wrong.example/webhook', allowed_updates: ['message'] }),
    }),
    /verification returned the wrong URL/
  );
});

test('production config pins the canonical webhook without exposing a bot secret', async () => {
  const [blueprint, example, server] = await Promise.all([
    readFile(new URL('../render.yaml', import.meta.url), 'utf8'),
    readFile(new URL('../.env.example', import.meta.url), 'utf8'),
    readFile(new URL('../src/server.js', import.meta.url), 'utf8'),
  ]);
  assert.match(blueprint, /TELEGRAM_WEBHOOK_URL\n\s+value: https:\/\/project-q-8k3a\.onrender\.com\/webhook/);
  assert.match(example, /TELEGRAM_WEBHOOK_URL=https:\/\/project-q-8k3a\.onrender\.com\/webhook/);
  assert.match(server, /await reconcileTelegramWebhook\(\)/);
  assert.doesNotMatch(blueprint, /TELEGRAM_BOT_TOKEN\n\s+value:/);
  assert.doesNotMatch(blueprint, /TELEGRAM_WEBHOOK_SECRET\n\s+value:/);
});
