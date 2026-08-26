import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHeaders, buildStorageHeaders } from '../src/lib/supabase.js';

test('new Supabase secret keys are sent only as apikey', () => {
  const headers = buildHeaders('sb_secret_example');
  assert.equal(headers.apikey, 'sb_secret_example');
  assert.equal(headers.Authorization, undefined);
});

test('legacy service-role JWT keeps the Bearer header', () => {
  const headers = buildHeaders('legacy.jwt.value');
  assert.equal(headers.apikey, 'legacy.jwt.value');
  assert.equal(headers.Authorization, 'Bearer legacy.jwt.value');
});

test('publishable keys are rejected for backend services', () => {
  assert.throws(
    () => buildHeaders('sb_publishable_example'),
    /requires a Supabase secret or legacy service-role key/
  );
});

test('header construction never includes a missing key', () => {
  assert.throws(() => buildHeaders(''), /SUPABASE_SERVICE_ROLE_KEY is not set/);
});

test('private evidence uploads preserve secret-key handling and exact image content type', () => {
  const headers = buildStorageHeaders('sb_secret_example', 'image/webp', { 'x-upsert': 'false' });
  assert.equal(headers.apikey, 'sb_secret_example');
  assert.equal(headers.Authorization, undefined);
  assert.equal(headers['Content-Type'], 'image/webp');
  assert.equal(headers['x-upsert'], 'false');
});
