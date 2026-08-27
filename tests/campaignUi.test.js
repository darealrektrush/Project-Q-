import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CAMPAIGN_CALLBACK_PREFIX,
  CAMPAIGN_HOME_TEXT,
  buildCampaignHomeText,
  buildCampaignsMenu,
  buildBondTheDuckMenu,
  resolveCampaignAppUrl,
  buildParticipantStatusText,
  buildParticipantXpText,
  buildReferralMissionText,
  buildMissionsMenu,
  buildOracleRaidsMenu,
  buildOracleRaidsText,
  buildCampaignReadinessText,
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
  assert.ok(callbacks.includes(`${CAMPAIGN_CALLBACK_PREFIX}:missions:referrals`));
  assert.ok(callbacks.includes(`${CAMPAIGN_CALLBACK_PREFIX}:missions:community`));
  assert.equal(buildOracleRaidsMenu('@crabstar_oracle_bot').inline_keyboard[0][0].url,
    'https://t.me/crabstar_oracle_bot');
});

test('verified referral screen exposes the locked referral and X invite rewards', () => {
  const text = buildReferralMissionText({
    link: 'https://t.me/project_q_bot?start=ref_abcd1234efgh',
    bonusXp: 10,
    xInviteBonusXp: 5,
    counts: { invited: 2, qualified: 1, bonusAwarded: 0 },
  });
  assert.match(text, /post-referral FAWKQ purchase of at least USD \$2/);
  assert.match(text, /Referral bonus:\* 10 XP/);
  assert.match(text, /Verified bonus: 5 XP/);
  assert.match(text, /ref_abcd1234efgh/);
  assert.match(text, /official pinned FAWKQ campaign post/);
  assert.match(text, /exactly three distinct people/);
  assert.match(text, /exact bonuses queue until a campaign settlement day has enough room/i);
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

test('Mini App publishes the locked five-step burn plan without exposing a signer', async () => {
  const app = await readFile(new URL('../public/campaign-app/app.js', import.meta.url), 'utf8');
  assert.match(app, /Locked milestone plan/);
  assert.match(app, /Five verified unlocks/);
  assert.match(app, /one creator-wallet execution signature/);
  assert.doesNotMatch(app, /CREATOR_WALLET_SECRET|privateKey|secretKey/);
});

test('pre-launch campaign UI never represents the campaign as active', () => {
  assert.match(CAMPAIGN_HOME_TEXT, /DRAFT \/ pre-launch/);
  assert.match(CAMPAIGN_HOME_TEXT, /not accepting enrollment, XP, buys or reward claims/);
});

test('authorized readiness view binds founder review to an exact report fingerprint', () => {
  const hash = 'd'.repeat(64);
  const text = buildCampaignReadinessText({
    state: 'DRAFT', ready: false, readyCount: 1, totalCount: 2, reportHash: hash,
    checks: [
      { label: 'Rules published and hashed', ready: true },
      { label: 'Funding verified', ready: false },
    ],
  });
  assert.match(text, new RegExp(hash));
  assert.match(text, /Campaign remains fail-closed/);
});

test('live campaign and participant data render without opening unavailable actions', () => {
  assert.match(buildCampaignHomeText({ state: 'ACTIVE' }), /Status:\* ACTIVE/);
  assert.match(buildCampaignHomeText({
    databaseState: 'DRAFT', displayLabel: 'PRE-LAUNCH', schedule: { label: 'Campaign opens' },
  }), /Window:\* PRE-LAUNCH[\s\S]*Next:\* Campaign opens/);
  assert.match(buildParticipantStatusText({
    enrolled: true, xLinked: true, xVerified: true, walletLinked: true,
    walletVerified: false, tokenAccountReady: false,
  }), /✅ Enrolled/);
  assert.match(buildParticipantXpText({
    totalXp: 9, xpByCycle: [{ cycleId: 1, xp: 9 }],
  }), /Cycle 1: 9 XP/);
});
