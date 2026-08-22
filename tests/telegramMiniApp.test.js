import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validateTelegramInitData } from '../src/campaign/telegramMiniApp.js';

function signedInitData(botToken, values) {
  const params = new URLSearchParams(values);
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

test('valid Telegram Mini App init data returns a normalized verified identity', () => {
  const token = '123456:test-token';
  const initData = signedInitData(token, {
    auth_date: '1700000000', query_id: 'query-1', start_param: 'bond-the-duck-2026',
    user: JSON.stringify({ id: 12345, first_name: 'Duck', username: 'duck_builder' }),
  });
  assert.deepEqual(validateTelegramInitData(initData, token, { nowSeconds: 1700000060 }), {
    user: { id: 12345, firstName: 'Duck', lastName: '', username: 'duck_builder', languageCode: null, photoUrl: null },
    authDate: 1700000000, queryId: 'query-1', startParam: 'bond-the-duck-2026',
  });
});

test('Telegram Mini App validation rejects tampering, expiry and missing server secrets', () => {
  const token = '123456:test-token';
  const valid = signedInitData(token, {
    auth_date: '1700000000', user: JSON.stringify({ id: 12345, first_name: 'Duck' }),
  });
  assert.throws(() => validateTelegramInitData(valid.replace('Duck', 'Goose'), token, { nowSeconds: 1700000060 }), /signature/);
  assert.throws(() => validateTelegramInitData(valid, token, { nowSeconds: 1700001000 }), /expired/);
  assert.throws(() => validateTelegramInitData(valid, ''), /unavailable/);
  assert.throws(() => validateTelegramInitData(`${valid}&user=%7B%22id%22%3A999%7D`, token, { nowSeconds: 1700000060 }), /duplicate/);
});
