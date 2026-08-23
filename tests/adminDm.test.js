import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdminPanelKeyboard,
  buildAdminItemKeyboard,
  isAuthorizedAdmin,
  isEditableAdminKey,
  isConfiguredPrivateAdmin,
  isPrivateAdminPanelUser,
} from '../src/lib/admin.js';

async function withAdminIds(value, run) {
  const previous = process.env.TELEGRAM_ADMIN_USER_IDS;
  if (value === undefined) delete process.env.TELEGRAM_ADMIN_USER_IDS;
  else process.env.TELEGRAM_ADMIN_USER_IDS = value;

  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env.TELEGRAM_ADMIN_USER_IDS;
    else process.env.TELEGRAM_ADMIN_USER_IDS = previous;
  }
}

test('private admin access is restricted to configured Telegram user ids', async () => {
  await withAdminIds('12345, 67890', () => {
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

test('admin control is restricted to configured users in the private DM', async () => {
  await withAdminIds('12345', () => {
    assert.equal(isPrivateAdminPanelUser(12345, 'private'), true);
    assert.equal(isPrivateAdminPanelUser(67890, 'private'), false);
    assert.equal(isPrivateAdminPanelUser(12345, 'supergroup'), false);
  });
});

test('admin panel exposes grouped Project Q content controls only', () => {
  const callbacks = buildAdminPanelKeyboard().inline_keyboard
    .flat()
    .map((button) => button.callback_data);

  assert.deepEqual(callbacks, [
    'admin:section:home',
    'admin:section:campaign',
    'admin:section:economy',
    'admin:section:community',
    'admin:section:all',
    'admin:map',
  ]);

  for (const key of ['home', 'campaign', 'missions', 'market', 'bagwork', 'wallets', 'door']) {
    assert.equal(isEditableAdminKey(key), true);
  }
  for (const legacyKey of ['meme', 'feed', 'ask']) {
    assert.equal(isEditableAdminKey(legacyKey), false);
  }
});

test('Bond the Duck content screen exposes readiness in the live admin route', () => {
  const callbacks = buildAdminItemKeyboard('campaign').inline_keyboard
    .flat()
    .map((button) => button.callback_data);

  assert.equal(callbacks[0], 'admin:readiness');
  assert.equal(callbacks[1], 'admin:timeline');
  assert.equal(callbacks[2], 'admin:funding');
  assert.equal(callbacks[3], 'admin:sources');
  assert.equal(callbacks[4], 'admin:systems');
  assert.equal(callbacks[5], 'admin:approval');
  assert.ok(callbacks.includes('admin:item:campaign') === false);
  assert.equal(buildAdminItemKeyboard('missions').inline_keyboard[0][0].callback_data, 'admin:editbio:missions');
});
