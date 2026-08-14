import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHomeMenu } from '../src/lib/telegram.js';

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
