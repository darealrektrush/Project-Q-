import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  isAuthorizedAdmin,
  isConfiguredPrivateAdmin,
  buildAdminRootKeyboard,
  buildCampaignAdminKeyboard,
  buildBondAdminKeyboard,
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

test('campaign administration follows the expected nested Bond the Duck route', () => {
  assert.equal(buildAdminRootKeyboard().inline_keyboard[0][0].callback_data, 'admin:campaign');
  assert.equal(buildCampaignAdminKeyboard().inline_keyboard[0][0].callback_data, 'admin:campaign:bond');
  assert.equal(buildBondAdminKeyboard().inline_keyboard[0][0].callback_data, 'admin:readiness');
  assert.equal(buildBondAdminKeyboard().inline_keyboard[1][0].callback_data, 'admin:sourcecerts');
  assert.equal(buildBondAdminKeyboard().inline_keyboard[2][0].callback_data, 'admin:votequeue:0');
  assert.equal(buildBondAdminKeyboard().inline_keyboard[3][0].callback_data, 'admin:launchapprovals');
  assert.equal(buildBondAdminKeyboard().inline_keyboard[4][0].callback_data, 'admin:rulesflow');
  assert.equal(buildBondAdminKeyboard().inline_keyboard[5][0].callback_data, 'admin:burn');
  assert.equal(buildBondAdminKeyboard().inline_keyboard[6][0].callback_data, 'admin:burnflow');
  assert.equal(buildBondAdminKeyboard().inline_keyboard[7][0].callback_data, 'admin:campaign');
});

test('source certification admin route is read-only', async () => {
  const source = await readFile(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
  assert.match(source, /action === 'sourcecerts'/);
  assert.match(source, /getVerificationSourceCertificationState/);
  assert.match(source, /buildSourceCertificationAdminText/);
  assert.doesNotMatch(source, /action === 'sourcecertify'/);
});

test('final-rules controls remain private, founder-bound and non-activating', async () => {
  const source = await readFile(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
  assert.match(source, /\['rulesdecide', 'rulesfinalize'\]\.includes\(action\)/);
  assert.match(source, /!campaignRulesGovernanceEnabled\(\)/);
  assert.match(source, /proposal\.semanticRulesValid/);
  assert.match(source, /recordFinalRulesDecision/);
  assert.match(source, /finalizeApprovedRules/);
  assert.doesNotMatch(source, /action === 'rulesactivate'/);
});

test('founder launch decisions remain private, flag-gated and exact-report bound', async () => {
  const source = await readFile(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
  assert.match(source, /action === 'launchdecision'/);
  assert.match(source, /callbackQuery\.message\.chat\.type !== 'private'/);
  assert.match(source, /!campaignReadinessApprovalsEnabled\(\)/);
  assert.match(source, /status\.acceptingDecisions/);
  assert.match(source, /reportVersion: readiness\.reportVersion/);
  assert.match(source, /reportHash: readiness\.reportHash/);
  assert.match(source, /recordCampaignReadinessDecision/);
  assert.doesNotMatch(source, /transitionCampaignState/);
});

test('founder burn callbacks remain private, flag-gated and non-signing', async () => {
  const source = await readFile(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
  assert.match(source, /callbackQuery\.message\.chat\.type !== 'private'/);
  assert.match(source, /!earnToBurnEnabled\(\)/);
  assert.match(source, /workflow\.founders\.some/);
  assert.match(source, /recordFounderDecision/);
  assert.match(source, /approvePublicationDraft/);
  assert.doesNotMatch(source, /attachExternalBurnSignature/);
});

test('website vote evidence review remains private, founder-bound and flag-gated', async () => {
  const source = await readFile(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
  assert.match(source, /action === 'votequeue'/);
  assert.match(source, /action === 'votereview'/);
  assert.match(source, /action === 'votedecide'/);
  assert.match(source, /callbackQuery\.message\.chat\.type !== 'private'/);
  assert.match(source, /!websiteVoteReviewEnabled\(\)/);
  assert.match(source, /getWebsiteVoteReviewEvidence/);
  assert.match(source, /decideWebsiteVoteReview/);
  assert.doesNotMatch(source, /createSignedUrl|proofStorageKey\}\}/);
});
