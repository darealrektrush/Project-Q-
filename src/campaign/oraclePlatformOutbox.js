import { randomUUID } from 'node:crypto';

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_RETRY_SECONDS = 60;

function configured(env = process.env) {
  if (env.ORACLE_PLATFORM_EVENTS_ENABLED !== 'true') return false;
  const url = String(env.ORACLE_PLATFORM_EVENT_URL ?? '').trim();
  const secret = String(env.ORACLE_PROJECT_Q_EVENT_SECRET ?? '');
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:'
    && !parsed.username
    && !parsed.password
    && !parsed.search
    && !parsed.hash
    && parsed.pathname.endsWith('/platform/integrations/project-q/events')
    && secret.length >= 32
    && secret.trim() === secret;
}

function retryDelay(attemptCount) {
  const exponent = Math.max(0, Math.min(5, Number(attemptCount || 1) - 1));
  return Math.min(1800, DEFAULT_RETRY_SECONDS * (2 ** exponent));
}

function outboundEvent(row) {
  return {
    event_id: String(row.event_key),
    event_name: String(row.event_name),
    campaign_id: String(row.campaign_id),
    telegram_user_id: Number(row.telegram_user_id),
    occurred_at: String(row.occurred_at),
  };
}

async function sendOne(row, {
  fetchImpl = fetch,
  env = process.env,
} = {}) {
  const response = await fetchImpl(env.ORACLE_PLATFORM_EVENT_URL, {
    method: 'POST',
    redirect: 'error',
    headers: {
      authorization: `Bearer ${env.ORACLE_PROJECT_Q_EVENT_SECRET}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(outboundEvent(row)),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`oracle_platform_http_${response.status}`);
  }
}

export async function drainOraclePlatformOutbox(client, {
  env = process.env,
  fetchImpl = fetch,
  limit = DEFAULT_BATCH_SIZE,
  leaseId = randomUUID(),
} = {}) {
  if (!configured(env)) {
    return { configured: false, claimed: 0, delivered: 0, failed: 0 };
  }

  const rows = await client.rpc('claim_oracle_platform_outbox', {
    p_lease_id: leaseId,
    p_limit: Math.max(1, Math.min(100, Number(limit) || DEFAULT_BATCH_SIZE)),
  }) ?? [];

  let delivered = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await sendOne(row, { fetchImpl, env });
      const completed = await client.rpc('complete_oracle_platform_outbox', {
        p_id: row.id,
        p_lease_id: leaseId,
      });
      if (completed !== true && completed?.[0] !== true) {
        throw new Error('oracle_platform_complete_not_confirmed');
      }
      delivered += 1;
    } catch (error) {
      failed += 1;
      const errorType = String(error?.message || error?.name || 'delivery_failed').slice(0, 120);
      try {
        await client.rpc('fail_oracle_platform_outbox', {
          p_id: row.id,
          p_lease_id: leaseId,
          p_error: errorType,
          p_retry_after_seconds: retryDelay(row.attempt_count),
        });
      } catch (stateError) {
        console.error('Oracle Platform outbox state update failed', stateError?.message || 'unknown');
      }
    }
  }

  return { configured: true, claimed: rows.length, delivered, failed };
}

export function scheduleOraclePlatformOutbox(client, {
  env = process.env,
  intervalMs = 60_000,
  firstDelayMs = 15_000,
} = {}) {
  if (!configured(env)) {
    return { scheduled: false, stop() {} };
  }
  let running = false;
  let stopped = false;
  let timer = null;

  const run = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const result = await drainOraclePlatformOutbox(client, { env });
      if (result.claimed > 0) {
        console.log(
          `Oracle Platform outbox: ${result.delivered} delivered, ${result.failed} failed.`
        );
      }
    } catch (error) {
      console.error('Oracle Platform outbox drain failed', error?.message || 'unknown');
    } finally {
      running = false;
    }
  };

  const first = setTimeout(() => {
    run();
    timer = setInterval(run, intervalMs);
    timer.unref?.();
  }, firstDelayMs);
  first.unref?.();

  return {
    scheduled: true,
    stop() {
      stopped = true;
      clearTimeout(first);
      if (timer) clearInterval(timer);
    },
  };
}

export const _test = { configured, retryDelay, outboundEvent };
