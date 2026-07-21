const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function request(path, { method = 'GET', body, prefer } = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: headers(prefer ? { Prefer: prefer } : {}),
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
