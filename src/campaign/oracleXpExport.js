const MAX_ATTEMPTS = 8;
const DEFAULT_LIMIT = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function exportConfig(env) {
  if (env.PROJECT_Q_ORACLE_XP_EXPORT_ENABLED !== 'true') return null;
  let url;
  try {
    url = new URL(env.ORACLE_PROJECT_Q_XP_URL ?? '');
  } catch {
    throw new Error('Oracle XP export is enabled but not configured');
  }
  const secret = env.ORACLE_PROJECT_Q_XP_SECRET ?? '';
  if (url.protocol !== 'https:' || url.username || url.password || secret.length < 32) {
    throw new Error('Oracle XP export is enabled but not configured');
  }
  return { url: url.toString(), secret };
}

function payload(row) {
  return {
    profile_id: row.profile_id,
    telegram_user_id: Number(row.telegram_user_id),
    campaign_id: row.campaign_id,
    cycle_id: Number(row.cycle_id),
    mission_code: row.mission_code,
    source: row.source,
    campaign_score: Number(row.campaign_score),
    base_xp: Number(row.base_xp),
    verification_state: row.verification_state,
    occurred_at: row.occurred_at,
    finalized_at: row.finalized_at,
    idempotency_key: row.idempotency_key,
  };
}

function retryAt(attempt, now) {
  const seconds = Math.min(3600, 60 * (2 ** Math.max(0, attempt - 1)));
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

function errorCode(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout';
  if (Number.isInteger(error?.status)) return error.status >= 500 ? 'http_5xx' : 'http_4xx';
  if (error?.message === 'invalid Oracle XP response') return 'invalid_response';
  return 'network';
}

export async function deliverCampaignXpAwards(client, env = process.env, {
  fetchImpl = fetch,
  now = new Date(),
  limit = DEFAULT_LIMIT,
} = {}) {
  const config = exportConfig(env);
  if (!config) return { delivered: 0, retried: 0, deadLettered: 0, disabled: true };

  const rows = await client.select(
    'campaign_xp_exports',
    '?status=eq.pending' +
      `&next_attempt_at=lte.${encodeURIComponent(now.toISOString())}` +
      '&select=export_id,profile_id,telegram_user_id,campaign_id,cycle_id,source,mission_code,' +
        'campaign_score,base_xp,verification_state,occurred_at,finalized_at,idempotency_key,attempt_count' +
      `&order=export_id.asc&limit=${Math.max(1, Math.min(500, Number(limit) || DEFAULT_LIMIT))}`
  );

  const result = { delivered: 0, retried: 0, deadLettered: 0, disabled: false };
  for (const row of rows) {
    const attempt = Number(row.attempt_count) + 1;
    try {
      const response = await fetchImpl(config.url, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
        headers: {
          authorization: `Bearer ${config.secret}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload(row)),
      });
      if (!response.ok) {
        const failure = new Error('Oracle XP request failed');
        failure.status = response.status;
        throw failure;
      }
      const raw = await response.text();
      if (raw.length > 65536) throw new Error('invalid Oracle XP response');
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new Error('invalid Oracle XP response');
      }
      if (body?.ok !== true || !['accepted', 'duplicate'].includes(body.status) ||
          !UUID_PATTERN.test(body.receipt_id ?? '')) {
        throw new Error('invalid Oracle XP response');
      }
      await client.update('campaign_xp_exports', `?export_id=eq.${row.export_id}&status=eq.pending`, {
        status: 'delivered',
        attempt_count: attempt,
        last_error_code: null,
        oracle_receipt_id: body.receipt_id,
        delivered_at: now.toISOString(),
      });
      result.delivered += 1;
    } catch (error) {
      const deadLetter = attempt >= MAX_ATTEMPTS;
      await client.update('campaign_xp_exports', `?export_id=eq.${row.export_id}&status=eq.pending`, {
        status: deadLetter ? 'dead_letter' : 'pending',
        attempt_count: attempt,
        last_error_code: errorCode(error),
        next_attempt_at: retryAt(attempt, now),
      });
      if (deadLetter) result.deadLettered += 1;
      else result.retried += 1;
    }
  }
  return result;
}
