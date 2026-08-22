import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_CALLBACK_PREFIX,
  CAMPAIGN_HOME_TEXT,
  buildCampaignHomeText,
  buildCampaignsMenu,
  buildBondTheDuckMenu,
  resolveCampaignAppUrl,
  buildParticipantStatusText,
  buildParticipantXpText,
  buildMissionsMenu,
  buildOracleRaidsMenu,
  buildOracleRaidsText,
  getCampaignScreen,
} from '../src/campaign/ui.js';

test('campaign navigation exposes the Bond the Duck hub and a home return', () => {
  const buttons = buildCampaignsMenu().inline_keyboard.flat();
  assert.deepEqual(buttons.map((button) => button.callback_data), [CAMPAIGN_CALLBACK_PREFIX, 'menu:campaigns:back']);
});

test('missions centre exposes Oracle raids and the other campaign lanes', () => {
  const callbacks = buildMissionsMenu().inline_keyboard.flat()
    .map((button) => button.callback_data).filter(Boolean);
  assert.ok(callbacks.includes(`${CAMPAIGN_CALLBACK_PREFIX}:missions:raids`));
  assert.ok(callbacks.includes(`${CAMPAIGN_CALLBACK_PREFIX}:missions:votes`));
  assert.ok(callbacks.includes(`${CAMPAIGN_CALLBACK_PREFIX}:missions:bots`));
  assert.ok(callbacks.includes(`${CAMPAIGN_CALLBACK_PREFIX}:missions:progress`));
  assert.ok(callbacks.includes('menu:bagwork'));
  assert.equal(buildOracleRaidsMenu('@crabstar_oracle_bot').inline_keyboard[0][0].url,
    'https://t.me/crabstar_oracle_bot');
});

test('Oracle raid screen reports credited and pending campaign actions', () => {
  const text = buildOracleRaidsText({
    verifiedActions: 1, pendingActions: 1, rejectedActions: 0,
    events: [
      { raid_id: 'r1', action: 'retweet', credited: true, reason: null },
      { raid_id: 'r1', action: 'reply', credited: false, reason: null },
    ],
  });
  assert.match(text, /Credited actions: 1/);
  assert.match(text, /Raid r1 · retweet · ✅ XP credited/);
});

test('Bond the Duck hub includes every required participant screen', () => {
  const callbacks = buildBondTheDuckMenu().inline_keyboard.flat().map((button) => button.callback_data);
  for (const screen of ['overview','enroll','status','xp','leaderboard','missions','buy','cycles','rewards','rules','treasury']) {
    assert.ok(callbacks.includes(`${CAMPAIGN_CALLBACK_PREFIX}:${screen}`), `missing ${screen}`);
    assert.ok(getCampaignScreen(screen), `missing copy for ${screen}`);
  }
  assert.ok(callbacks.includes('menu:campaigns'));
});

test('Bond the Duck hub can expose the reusable Mini App without changing callbacks', () => {
  const menu = buildBondTheDuckMenu('https://example.com/campaign-app/');
  assert.deepEqual(menu.inline_keyboard[0][0], {
    text: '📱 Open Campaign App',
    web_app: { url: 'https://example.com/campaign-app/' },
  });
  assert.equal(resolveCampaignAppUrl({
    RENDER_EXTERNAL_HOSTNAME: 'project-q-dev.onrender.com',
  }), 'https://project-q-dev.onrender.com/campaign-app/');
});

test('pre-launch campaign UI never represents the campaign as active', () => {
  assert.match(CAMPAIGN_HOME_TEXT, /DRAFT \/ pre-launch/);
  assert.match(CAMPAIGN_HOME_TEXT, /not accepting enrollment, XP, buys or reward claims/);
});

test('live campaign and participant data render without opening unavailable actions', () => {
  assert.match(buildCampaignHomeText({ state: 'ACTIVE' }), /Status:\* ACTIVE/);
  assert.match(buildParticipantStatusText({
    enrolled: true, xLinked: true, xVerified: true, walletLinked: true,
    walletVerified: false, tokenAccountReady: false,
  }), /✅ Enrolled/);
  assert.match(buildParticipantXpText({
    totalXp: 9, xpByCycle: [{ cycleId: 1, xp: 9 }],
  }), /Cycle 1: 9 XP/);
});
