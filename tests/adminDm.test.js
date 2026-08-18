import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAuthorizedAdmin,
  isConfiguredPrivateAdmin,
} from '../src/lib/admin.js';

function withAdminIds(value, run) {
  const previous = process.env.TELEGRAM_ADMIN_USER_IDS;
  if (value === undefined) delete process.env.TELEGRAM_ADMIN_USER_IDS;
  else process.env.TELEGRAM_ADMIN_USER_IDS = value;

  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.TELEGRAM_ADMIN_USER_IDS;
    else process.env.TELEGRAM_ADMIN_USER_IDS = previous;
  }
}

test('private admin access is restricted to configured Telegram user ids', () => {
  withAdminIds('12345, 67890', () => {
    assert.equal(isConfiguredPrivateAdmin(12345), true);
    assert.equal(isConfiguredPrivateAdmin('67890'), true);
    assert.equal(isConfiguredPrivateAdmin(99999), false);
  });
});

test('private admin access is denied when no allowlist is configured', async () => {
  await withAdminIds(undefined, async () => {
    assert.equal(isConfiguredPrivateAdmin(12345), false);
    assert.equal(await isAuthorizedAdmin(1, 12345, 'private'), false);
  });
});

test('private authorization never calls the group administrator lookup', async () => {
  await withAdminIds('12345', async () => {
    assert.equal(await isAuthorizedAdmin(-1001, 12345, 'private'), true);
    assert.equal(await isAuthorizedAdmin(-1001, 67890, 'private'), false);
  });
});
