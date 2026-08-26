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

export function buildStorageHeaders(key, contentType, extra = {}) {
  const headers = buildHeaders(key, extra);
  headers['Content-Type'] = contentType;
  return headers;
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

async function storageRequest(path, {
  method = 'POST', body, contentType = 'application/octet-stream', jsonBody = false,
  responseType = 'json',
} = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  }
  const response = await fetch(`${SUPABASE_URL}/storage/v1/${path}`, {
    method,
    headers: buildStorageHeaders(
      SUPABASE_SERVICE_ROLE_KEY,
      jsonBody ? 'application/json' : contentType,
      jsonBody || method !== 'POST' ? {} : { 'x-upsert': 'false' }
    ),
    body: jsonBody ? JSON.stringify(body) : body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase Storage ${method} failed: ${response.status} ${text}`);
  }
  if (response.status === 204) return null;
  if (responseType === 'buffer') {
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') || 'application/octet-stream',
    };
  }
  return response.json();
}

function storagePath(bucket, objectPath) {
  const safeBucket = encodeURIComponent(String(bucket || ''));
  const safeObject = String(objectPath || '').split('/').map(encodeURIComponent).join('/');
  if (!safeBucket || !safeObject) throw new Error('invalid Supabase Storage path');
  return `${safeBucket}/${safeObject}`;
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
  uploadObject: (bucket, objectPath, bytes, contentType) =>
    storageRequest(`object/${storagePath(bucket, objectPath)}`, {
      method: 'POST', body: bytes, contentType,
    }),
  removeObjects: (bucket, objectPaths) => storageRequest(`object/${encodeURIComponent(bucket)}`, {
    method: 'DELETE', body: { prefixes: objectPaths }, jsonBody: true,
  }),
  downloadObject: (bucket, objectPath) =>
    storageRequest(`object/${storagePath(bucket, objectPath)}`, {
      method: 'GET', responseType: 'buffer',
    }),
};
