import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_MAX_AGE_SECONDS = 10 * 60;
const MAX_INIT_DATA_LENGTH = 8192;

function hmac(key, value) {
  return createHmac('sha256', key).update(value).digest();
}

export function validateTelegramInitData(initData, botToken, options = {}) {
  if (!botToken) throw new Error('telegram mini app authentication unavailable');
  if (typeof initData !== 'string' || !initData || initData.length > MAX_INIT_DATA_LENGTH) {
    throw new Error('invalid telegram init data');
  }

  const params = new URLSearchParams(initData);
  if (params.getAll('hash').length !== 1) throw new Error('invalid telegram init data hash');
  for (const key of ['auth_date', 'user', 'query_id', 'start_param']) {
    if (params.getAll(key).length > 1) throw new Error(`duplicate telegram ${key}`);
  }
  const suppliedHash = params.get('hash');
  if (!/^[a-f0-9]{64}$/i.test(suppliedHash ?? '')) throw new Error('invalid telegram init data hash');

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = hmac('WebAppData', botToken);
  const expectedHash = hmac(secretKey, dataCheckString);
  const supplied = Buffer.from(suppliedHash, 'hex');
  if (supplied.length !== expectedHash.length || !timingSafeEqual(supplied, expectedHash)) {
    throw new Error('invalid telegram init data signature');
  }

  const authDate = Number(params.get('auth_date'));
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  if (!Number.isSafeInteger(authDate) || authDate > nowSeconds + 30 || nowSeconds - authDate > maxAgeSeconds) {
    throw new Error('expired telegram init data');
  }

  let user;
  try {
    user = JSON.parse(params.get('user') ?? '');
  } catch {
    throw new Error('invalid telegram user');
  }
  if (!Number.isSafeInteger(user?.id) || user.id <= 0) throw new Error('invalid telegram user');

  return {
    user: {
      id: user.id,
      firstName: typeof user.first_name === 'string' ? user.first_name : '',
      lastName: typeof user.last_name === 'string' ? user.last_name : '',
      username: typeof user.username === 'string' ? user.username : null,
      languageCode: typeof user.language_code === 'string' ? user.language_code : null,
      photoUrl: typeof user.photo_url === 'string' ? user.photo_url : null,
    },
    authDate,
    queryId: params.get('query_id'),
    startParam: params.get('start_param'),
  };
}
