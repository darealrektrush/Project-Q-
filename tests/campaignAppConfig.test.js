import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const campaignRoot = new URL('../public/campaign-app/campaigns/', import.meta.url);

async function readJson(file) {
  return JSON.parse(await readFile(new URL(file, campaignRoot), 'utf8'));
}

test('campaign registry points to a valid reusable default campaign', async () => {
  const registry = await readJson('index.json');
  const record = registry.campaigns.find(({ id }) => id === registry.defaultCampaign);
  assert.ok(record, 'default campaign must exist in registry');
  assert.equal(typeof record.visible, 'boolean');
  assert.equal(typeof record.enabled, 'boolean');
  assert.equal(typeof record.archived, 'boolean');

  const campaign = await readJson(record.file);
  assert.equal(campaign.id, record.id);
  assert.ok(campaign.name);
  assert.match(campaign.banner, /^\/campaign-app\/assets\//);
  assert.match(campaign.leaderboardIcon, /^\/campaign-app\/assets\/missions\//);
  assert.match(campaign.creatorAwardsArtwork, /^\/campaign-app\/assets\//);
  assert.deepEqual(Object.keys(campaign.stateArtwork).sort(),
    ['ARCHIVED','COMPLETED','DISABLED','LOCKED']);
  assert.deepEqual(Object.keys(campaign.identityBadges).sort(),
    ['collective','full','fullHero','rewards','telegram','wallet','x']);
  assert.equal(campaign.xpBadges.length, 4);
  assert.equal(campaign.leaderboardBadges.length, 6);
  assert.ok(Array.isArray(campaign.missions));
  assert.equal(campaign.earnToBurn.status, 'DRAFT');
  assert.equal(campaign.earnToBurn.openingBurnBaseUnits, '15000000000000');
  assert.equal(campaign.earnToBurn.openingBurnSource, 'FAWKQ_CREATOR_WALLET');
  assert.equal(campaign.earnToBurn.additionalToCampaignAllocation, true);
  assert.equal(campaign.earnToBurn.progressUnit, 'VERIFIED_CAMPAIGN_XP');
  assert.equal(campaign.earnToBurn.approvalModel, 'TWO_FOUNDER_PROJECT_Q_APPROVALS');
  assert.equal(campaign.earnToBurn.executionModel, 'CREATOR_WALLET_FOUNDER_SIGNATURE');
  assert.deepEqual(
    campaign.earnToBurn.milestones.map(({ progressTargetUnits }) => progressTargetUnits),
    ['2000', '5000', '9000', '14000', '20000']
  );
  assert.ok(campaign.earnToBurn.milestones.every(({ burnAmountBaseUnits }) =>
    burnAmountBaseUnits === '3000000000000'
  ));
  assert.equal(
    campaign.earnToBurn.milestones.reduce((total, { burnAmountBaseUnits }) =>
      total + BigInt(burnAmountBaseUnits), 0n),
    15_000_000_000_000n
  );
  assert.equal(campaign.campaignCommitments.campaignRewards.amountBaseUnits, '15000000000000');
  assert.equal(campaign.campaignCommitments.campaignRewards.founderContributionBaseUnits, '7500000000000');
  assert.equal(campaign.campaignCommitments.campaignRewards.streamflowDependent, false);
  assert.equal(campaign.campaignCommitments.campaignRewards.requiresFullFundingBeforeLaunch, true);
  assert.equal(campaign.campaignCommitments.diamondDuckBonus.amountBaseUnits, '2500000000000');
  assert.equal(campaign.campaignCommitments.diamondDuckBonus.founderContributionBaseUnits, '1250000000000');
  assert.equal(campaign.campaignCommitments.diamondDuckBonus.founderContributionPercent, 0.125);
  assert.equal(campaign.campaignCommitments.diamondDuckBonus.fundingWindowHoursAfterUnlock, 48);
  assert.equal(campaign.campaignCommitments.diamondDuckBonus.requiresFullFundingBeforeBonusCalculation, true);
  assert.equal(campaign.campaignCommitments.topContributorPrize.amountLamports, '1000000000');
  assert.equal(campaign.campaignCommitments.earnToBurn.amountBaseUnits, '15000000000000');
  assert.equal(campaign.campaignCommitments.totalTokenCommitmentBaseUnits, '32500000000000');
  assert.equal(campaign.referrals.minimumPurchaseUsd, 2);
  assert.equal(campaign.referrals.bonusXp, null);
  assert.equal(campaign.referrals.requiresVerifiedPostReferralPurchase, true);
  assert.equal(campaign.referrals.xInviteBonus.requiredDistinctMentions, 3);
  assert.equal(campaign.referrals.xInviteBonus.bonusXp, null);
  assert.equal(campaign.communityPulse.minimumMessages, 5);
  assert.equal(campaign.communityPulse.minimumWindows, 3);
  assert.equal(campaign.communityPulse.minimumReplies, 2);
  assert.equal(campaign.communityPulse.maximumDailyXp, 8);
});

test('campaign reward schedule and mission identifiers are internally consistent', async () => {
  const campaign = await readJson('bond-the-duck-2026.json');
  assert.equal(campaign.releases.reduce((total, release) => total + release.percent, 0), 100);
  assert.equal(campaign.activeDays, 14);
  assert.deepEqual(campaign.reviewWindowHours, { minimum: 48, maximum: 72 });
  assert.equal(campaign.lifecycleDays, 18);
  assert.equal(campaign.schedule.timeZone, 'America/Vancouver');
  assert.equal(campaign.schedule.activeLabel, 'September 1–15, 2026');
  assert.equal(campaign.schedule.reviewLabel, 'September 16–19, 2026');
  assert.equal(campaign.schedule.cycles.length, 7);
  assert.equal(campaign.schedule.postReviewRelease.condition, 'FINAL_REVIEW_CLEARED');
  assert.equal('readinessPercent' in campaign, false);
  assert.deepEqual(campaign.schedule.phasedRelease.offsetDaysAfterPostReviewRelease, [6, 12, 18, 24, 30]);
  assert.equal(campaign.releases.find(({ percent }) => percent === 50)?.label, 'Post-review');
  assert.ok(Object.values(campaign.xpCaps).every((cap) => Number.isFinite(cap) && cap >= 0));
  const missionIds = campaign.missions.map(({ id }) => id);
  assert.equal(new Set(missionIds).size, missionIds.length);
  assert.equal(campaign.missions.length, 9);
  assert.deepEqual(missionIds, [
    'oracle-raids',
    'website-voting',
    'trending-bots',
    'bagwork',
    'buy-to-earn',
    'participation-xp',
    'community-pulse',
    'verified-referrals',
    'earn-to-burn',
  ]);
  assert.ok(campaign.missions.every(({ image }) => image));
  assert.ok(campaign.missions.every(({ image }) => image.startsWith('/campaign-app/assets/missions/v3-')));
  assert.ok(campaign.missions.every(({ verification }) => typeof verification === 'string' && verification.length > 40));
  assert.ok(campaign.missions.every(({ requirements }) => Array.isArray(requirements) && requirements.length === 3));
  assert.ok(campaign.missions.every(({ actionLabel, frequency }) => actionLabel && frequency));
  assert.equal(campaign.missions.filter(({ kind }) => kind === 'INDIVIDUAL').length, 8);
  assert.equal(campaign.missions.find(({ id }) => id === 'website-voting').reward, 'Up to 11 XP');
  const trendingBots = campaign.missions.find(({ id }) => id === 'trending-bots');
  assert.equal(campaign.xpCaps.trendingBotsDaily, 20);
  assert.equal(campaign.verificationSources.telegramBotFirstDailyXp, 2);
  assert.equal(campaign.verificationSources.telegramBotRepeatXp, 1);
  assert.equal(campaign.verificationSources.telegramBotDailyMaximumXp, 20);
  assert.equal(campaign.verificationSources.telegramPushPointPerAcceptedVote, 1);
  assert.deepEqual(campaign.verificationSources.telegramBotCooldownSeconds, {
    '@majorbuybot': 7200,
    '@wtftrending': 3600,
    '@trenchobot': 86400,
    '@BBtrendingbot': 3600,
    '@drokiatrendsbot': 3600,
  });
  assert.match(trendingBots.verification, /uncapped Trending Push/);
  const earnToBurn = campaign.missions.find(({ id }) => id === 'earn-to-burn');
  assert.equal(earnToBurn.kind, 'COLLECTIVE');
  assert.equal(earnToBurn.reward, '5 × 3M FAWKQ burns');
  assert.equal(earnToBurn.enabled, false);
  assert.equal(earnToBurn.reward, '5 × 3M FAWKQ burns');
  assert.equal(campaign.missions.some(({ id }) => id === 'content'), false);
});

test('Bond the Duck V3 uses the cinematic campaign hero without duplicate visible heading copy', async () => {
  const campaign = await readJson('bond-the-duck-2026.json');
  const app = await readFile(new URL('../app.js', campaignRoot), 'utf8');
  const styles = await readFile(new URL('../styles.css', campaignRoot), 'utf8');
  assert.equal(campaign.banner, '/campaign-app/assets/bond-the-duck-campaign-hero-v4.jpg');
  assert.match(app, /<h2 class="sr-only">Bond the Duck<\/h2>/);
  assert.match(styles, /\.command-hero::before[\s\S]*background-image: var\(--campaign-art\)/);
});

test('Mini App escapes Telegram display names and keeps wallet controls locked while disabled', async () => {
  const app = await readFile(new URL('../app.js', campaignRoot), 'utf8');
  assert.match(app, /escapeHtml\(p\.name\)/);
  assert.match(app, /campaignRecord\?\.enabled/);
});

test('Mini App exposes a guided verified onboarding path without activating participation', async () => {
  const app = await readFile(new URL('../app.js', campaignRoot), 'utf8');
  assert.match(app, /Complete Project Q ID/);
  assert.match(app, /Refresh verification status/);
  assert.match(app, />Telegram</);
  assert.match(app, /Oracle X/);
  assert.match(app, /Reward wallet/);
  assert.match(app, /Campaign identity complete/);
  assert.match(app, /participationReady && \(state\.walletVerificationEnabled \|\| state\.campaignRecord\?\.enabled\)/);
  assert.match(app, /walletVerificationEnabled/);
  assert.match(app, /onEvent\?\.\('activated'/);
});

test('website vote evidence stays behind Telegram authentication and server-only storage', async () => {
  const app = await readFile(new URL('../app.js', campaignRoot), 'utf8');
  const server = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(server, /\/campaign-app\/api\/votes\/attempts/);
  assert.match(server, /\/campaign-app\/api\/votes\/proof/);
  assert.match(server, /express\.raw\(\{ type: \['image\/jpeg', 'image\/png', 'image\/webp'\], limit: '2mb' \}\)/);
  assert.match(server, /validateTelegramInitData[\s\S]*x-project-q-init-data/);
  assert.match(app, /Start vote|data-vote-source-key/);
  assert.match(app, /Submit private proof/);
  assert.match(app, /x-project-q-vote-challenge/);
  assert.doesNotMatch(app, /SUPABASE_SERVICE_ROLE_KEY|sb_secret_|proof_storage_key/);
});

test('Mini App V3 uses the five-screen command center and canonical Oracle branding', async () => {
  const app = await readFile(new URL('../app.js', campaignRoot), 'utf8');
  const index = await readFile(new URL('../index.html', campaignRoot), 'utf8');
  const styles = await readFile(new URL('../styles.css', campaignRoot), 'utf8');
  const server = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(app, /Your next actions/);
  assert.match(app, /View all \$\{c\.missions\.length\}/);
  assert.match(app, /Eight individual lanes/);
  assert.match(app, /kind !== 'COLLECTIVE'/);
  assert.match(app, /XP ledger/);
  assert.match(app, /Other verified activity/);
  assert.match(app, /Community Pulse/);
  assert.match(app, /One-time X invite bonus/);
  assert.match(app, /Earn-to-Burn/);
  assert.match(app, /No placeholder scores or identities are shown/);
  assert.match(app, /oracle-logo\.jpg/);
  assert.match(app, /const NAV_ICONS =/);
  assert.match(app, /<span class="nav-icon">\$\{NAV_ICONS\[id\]\}<\/span>/);
  assert.match(index, /class="splash"[\s\S]*project-q-splash\.webp/);
  assert.match(index, /project-q-horizontal-banner-v3\.jpg/);
  assert.match(index, /class="brand-banner"/);
  assert.match(index, /Open participant profile/);
  assert.match(index, /id="mission-dialog"/);
  assert.match(index, /<b>Profile<\/b><small id="account-name">0\/3 ID<\/small>/);
  assert.match(app, /Top Duck prize/);
  assert.match(app, /\/campaign-app\/api\/runtime/);
  assert.match(app, /\/campaign-app\/api\/readiness/);
  assert.match(server, /app\.get\('\/campaign-app\/api\/readiness'/);
  assert.match(server, /public campaign readiness unavailable[\s\S]*closedPublicCampaignReadiness/);
  assert.match(server, /Cache-Control', 'no-store'/);
  assert.match(app, /LAUNCH BLOCKED|operations remain closed until every activation gate passes/);
  assert.match(index, /id="rail-campaign-state"/);
  assert.match(index, /id="campaign-network-state"/);
  assert.match(app, /topContributorPrize\.amountSol/);
  assert.match(styles, /grid-template-columns: repeat\(5, 1fr\)/);
  assert.match(styles, /\.mobile-nav \.nav-label \{ display: block/);
  assert.match(styles, /\.mission-dialog/);
  assert.match(styles, /\.campaign-clock[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(238px, \.7fr\)/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.campaign-clock \{ grid-template-columns: 1fr/);
  assert.match(styles, /\.readiness-gates[\s\S]*grid-template-columns: repeat\(2/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.readiness-gates \{ grid-template-columns: 1fr/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.mission-dialog/);
});

test('Mini App exposes a read-only Earn to Burn ledger without signer controls', async () => {
  const app = await readFile(new URL('../app.js', campaignRoot), 'utf8');
  assert.match(app, /Collective mission/);
  assert.match(app, /No Earn to Burn transaction has been executed or confirmed/);
  assert.match(app, /Project Q never stores its private key/);
  assert.match(app, /loadBurnSummary/);
  assert.doesNotMatch(app, /executeBurn|signBurn|burnTokens/);
});
