const SECRET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;
const BOT_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/;

export const TELEGRAM_WEBHOOK_ALLOWED_UPDATES = Object.freeze(['message', 'callback_query']);

function requiredEnv(env, name) {
  const value = String(env[name] ?? '').trim();
  if (!value) throw new Error(`${name} is required for Telegram webhook reconciliation`);
  return value;
}

export function resolveTelegramWebhookUrl(env = process.env) {
  const raw = String(env.TELEGRAM_WEBHOOK_URL ?? '').trim();
  if (!raw) return null;

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('TELEGRAM_WEBHOOK_URL must be a valid URL');
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/webhook'
  ) {
    throw new Error('TELEGRAM_WEBHOOK_URL must be an exact credential-free HTTPS /webhook URL');
  }

  return url.toString();
}

async function callTelegram(method, payload, { token, fetchImpl }) {
  let response;
  try {
    response = await fetchImpl(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(`Telegram ${method} request failed`);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Telegram ${method} returned an invalid response`);
  }

  if (!response.ok || !body?.ok) {
    throw new Error(`Telegram ${method} rejected the request with status ${response.status}`);
  }
  return body.result;
}

export async function reconcileTelegramWebhook({ env = process.env, fetchImpl = fetch } = {}) {
  const webhookUrl = resolveTelegramWebhookUrl(env);
  if (!webhookUrl) return { configured: false, reason: 'TELEGRAM_WEBHOOK_URL is not configured' };

  const token = requiredEnv(env, 'TELEGRAM_BOT_TOKEN');
  const secretToken = requiredEnv(env, 'TELEGRAM_WEBHOOK_SECRET');
  if (!BOT_TOKEN_PATTERN.test(token)) throw new Error('TELEGRAM_BOT_TOKEN has an invalid format');
  if (!SECRET_TOKEN_PATTERN.test(secretToken)) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET has an invalid format');
  }

  await callTelegram('setWebhook', {
    url: webhookUrl,
    secret_token: secretToken,
    allowed_updates: TELEGRAM_WEBHOOK_ALLOWED_UPDATES,
    drop_pending_updates: false,
  }, { token, fetchImpl });

  const info = await callTelegram('getWebhookInfo', {}, { token, fetchImpl });
  const registeredUpdates = new Set(Array.isArray(info?.allowed_updates) ? info.allowed_updates : []);
  if (info?.url !== webhookUrl) throw new Error('Telegram webhook verification returned the wrong URL');
  if (!TELEGRAM_WEBHOOK_ALLOWED_UPDATES.every((update) => registeredUpdates.has(update))) {
    throw new Error('Telegram webhook verification is missing required update types');
  }

  const parsedUrl = new URL(webhookUrl);
  return {
    configured: true,
    host: parsedUrl.host,
    path: parsedUrl.pathname,
    pendingUpdateCount: Number.isSafeInteger(info.pending_update_count)
      ? info.pending_update_count
      : null,
  };
}
