import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_CALLBACK_PREFIX,
  CAMPAIGN_HOME_TEXT,
  buildCampaignsMenu,
  buildBondTheDuckMenu,
  getCampaignScreen,
} from '../src/campaign/ui.js';

test('campaign navigation exposes the Bond the Duck hub and a home return', () => {
  const buttons = buildCampaignsMenu().inline_keyboard.flat();
  assert.deepEqual(buttons.map((button) => button.callback_data), [CAMPAIGN_CALLBACK_PREFIX, 'menu:campaigns:back']);
});

test('Bond the Duck hub includes every required participant screen', () => {
  const callbacks = buildBondTheDuckMenu().inline_keyboard.flat().map((button) => button.callback_data);
  for (const screen of ['overview','enroll','status','xp','leaderboard','missions','buy','cycles','rewards','rules','treasury']) {
    assert.ok(callbacks.includes(`${CAMPAIGN_CALLBACK_PREFIX}:${screen}`), `missing ${screen}`);
    assert.ok(getCampaignScreen(screen), `missing copy for ${screen}`);
  }
  assert.ok(callbacks.includes('menu:campaigns'));
});

test('pre-launch campaign UI never represents the campaign as active', () => {
  assert.match(CAMPAIGN_HOME_TEXT, /DRAFT \/ pre-launch/);
  assert.match(CAMPAIGN_HOME_TEXT, /not accepting enrollment, XP, buys or reward claims/);
});

