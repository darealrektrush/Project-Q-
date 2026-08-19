const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function buildHeaders(key, extra = {}) {
  const normalized = String(key ?? '').trim();
  if (!normalized) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  if (normalized.startsWith('sb_publishable_')) {
    throw new Error('Project Q backend requires a Supabase secret or legacy service-role key');
  }

  const result = {
    apikey: normalized,
    'Content-Type': 'application/json',
    ...extra,
  };

  // New sb_secret_ keys are API keys, not JWTs. Sending one as a Bearer token
  // makes the gateway try to parse it as a JWT and reject the request. Legacy
  // service-role keys are JWTs and keep the historical Authorization header.
  if (!normalized.startsWith('sb_secret_')) {
    result.Authorization = `Bearer ${normalized}`;
  }

  return result;
}

async function request(path, { method = 'GET', body, prefer } = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: buildHeaders(SUPABASE_SERVICE_ROLE_KEY, prefer ? { Prefer: prefer } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path} failed: ${res.status} ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const supabase = {
  select: (table, query = '') => request(`${table}${query}`),
  insert: (table, rows) =>
    request(table, { method: 'POST', body: rows, prefer: 'return=representation' }),
  update: (table, query, patch) =>
    request(`${table}${query}`, { method: 'PATCH', body: patch, prefer: 'return=representation' }),
  upsert: (table, rows, onConflict) =>
    request(`${table}${onConflict ? `?on_conflict=${onConflict}` : ''}`, {
      method: 'POST',
      body: rows,
      prefer: 'resolution=merge-duplicates,return=representation',
    }),
  rpc: (fn, args = {}) => request(`rpc/${fn}`, { method: 'POST', body: args }),
};
