import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHomeMenu, guardInteraction } from '../src/lib/telegram.js';

test('home menu uses compact labels without changing its actions', () => {
  const rows = buildHomeMenu().inline_keyboard;
  const buttons = rows.flat();

  assert.deepEqual(
    buttons.map(({ callback_data }) => callback_data),
    [
      'menu:market',
      'menu:leaderboard',
      'menu:events',
      'menu:spaces',
      'menu:links',
      'menu:bagwork',
      'menu:money',
      'menu:door',
      'menu:campaigns',
      'menu:about',
    ]
  );

  assert.equal(Math.max(...buttons.map(({ text }) => [...text].length)), 13);
});

test('group home menu recommends the private bot without changing menu actions', () => {
  const buttons = buildHomeMenu({ privateUrl: 'https://t.me/project_q_bot?start=home' })
    .inline_keyboard.flat();
  const privateButton = buttons.at(-1);

  assert.equal(privateButton.text, '🔒 Open Project Q privately');
  assert.equal(privateButton.url, 'https://t.me/project_q_bot?start=home');
});

test('private chats are interactive while unrelated group topics remain blocked', () => {
  assert.deepEqual(guardInteraction('private'), {
    allowed: true,
    topic: 'private',
    interactive: true,
  });
  assert.deepEqual(guardInteraction('supergroup', 999999), {
    allowed: false,
    topic: null,
    interactive: false,
  });
});
