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

test('General Chat is the canonical interactive community topic', () => {
  const previous = process.env.TELEGRAM_TOPIC_IDS;
  process.env.TELEGRAM_TOPIC_IDS = 'general-chat:39151,fawkq-announcements:22994,fawkq-bagwork:28244';
  try {
    assert.deepEqual(guardInteraction('supergroup', 39151), {
      allowed: true,
      topic: 'general-chat',
      interactive: true,
    });
  } finally {
    if (previous === undefined) delete process.env.TELEGRAM_TOPIC_IDS;
    else process.env.TELEGRAM_TOPIC_IDS = previous;
  }
});


test('private home can surface Project Q as the primary Mini App action', () => {
  const appUrl = 'https://project-q-dev.onrender.com/campaign-app/';
  const rows = buildHomeMenu({ campaignAppUrl: appUrl }).inline_keyboard;
  assert.equal(rows[0].length, 1);
  assert.equal(rows[0][0].text, '🚀 OPEN PROJECT Q // CAMPAIGN APP');
  assert.equal(rows[0][0].web_app.url, appUrl);
  assert.equal(rows[1][0].callback_data, 'menu:market');
});
