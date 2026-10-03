import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const root = new URL('../public/campaign-app/', import.meta.url);

async function loadRuntime() {
  const [source, campaign] = await Promise.all([
    readFile(new URL('app.js', root), 'utf8'),
    readFile(new URL('campaigns/bond-the-duck-2026.json', root), 'utf8').then(JSON.parse),
  ]);
  const context = {
    window: { Telegram: null, scrollTo() {}, open() {}, sessionStorage: null },
    location: { hash: '', search: '' },
    URLSearchParams,
    URL,
    TextEncoder,
    console,
    setTimeout,
    clearTimeout,
    performance: { now: () => 0 },
    fetch: async () => { throw new Error('network is not used by template tests'); },
    document: {},
    history: { replaceState() {} },
  };
  vm.createContext(context);
  const guidance = (await readFile(new URL('participant-guidance.js', root), 'utf8')).replace(/^export /gm, '');
  const instrumented = guidance + source.replace(/^import .*participant-guidance.*;\n/m, '').replace(/\nboot\(\);\s*$/, '') + `
    state.campaign = ${JSON.stringify(campaign)};
    globalThis.__rendered = Object.fromEntries(Object.entries(screens).map(([key, screen]) => [key, screen()]));
    globalThis.__profiles = {};
    for (const view of ['overview', 'wallet', 'activity', 'rewards', 'referrals', 'identity']) {
      state.profileView = view;
      globalThis.__profiles[view] = profileScreen();
    }
    globalThis.__nav = NAV;
    globalThis.__accountPanel = accountPanelMarkup;
    globalThis.__helpResults = helpResultsMarkup;
    globalThis.__updatesWith = (status, patch = {}) => { state.sessionStatus = status; state.profile = {...state.profile, ...patch}; return campaignUpdatesMarkup(); };
    globalThis.__poolDetail = id => operationPoolDetailMarkup(state.campaign, id);
    globalThis.__navigateWith = (from, destination, view = null) => {
      state.telegram = null; state.screen = from; state.operationsView = 'economics'; state.profileView = 'wallet'; state.recordView = 'rank';
      const original = render; render = () => {};
      go(destination, { view }); render = original;
      return { screen: state.screen, operation: state.operationsView, profile: state.profileView, record: state.recordView };
    };
    globalThis.__renderXpWithDailyBuckets = (buckets) => {
      state.profile.todayXpByBucket = buckets;
      return xpScreen();
    };
    globalThis.__renderMissionsWithEvidence = (evidence) => {
      state.missionEvidence = evidence;
      return missionsScreen();
    };
    globalThis.__preLaunchScheduleViews = () => {
      state.runtime = {
        databaseState: 'DRAFT', tone: 'pending', serverNow: '2026-10-01T00:00:00.000Z',
        schedule: { phase: 'PRE_LAUNCH', label: 'Campaign dates pending', targetAt: null },
      };
      state.runtimeLoadedAt = Date.now();
      return { home: home(), operations: operationsScreen(), clock: campaignClockMarkup(state.campaign) };
    };
    globalThis.__missionDetails = Object.fromEntries(state.campaign.missions.map((mission) => [mission.id, missionDetailMarkup(mission)]));
    globalThis.__missionById = (id) => state.campaign.missions.find((mission) => mission.id === id);
    globalThis.__renderMissionDetail = (mission) => missionDetailMarkup(mission);
    globalThis.__renderMissionDetailWithClearance = (mission) => {
      state.profile.telegramVerified = true;
      state.profile.xVerified = true;
      state.profile.walletVerified = true;
      state.profile.tokenAccountReady = true;
      state.profile.holderEligible = true;
      state.profile.campaignState = 'ACTIVE';
      state.runtime = {
        databaseState: 'ACTIVE',
        operational: true,
        displayLabel: 'CYCLE 1 LIVE',
        tone: 'success',
        schedule: { phase: 'ACTIVE', label: 'Cycle 1 closes', targetAt: '2026-10-01T15:00:00.000Z', currentCycle: 1 },
      };
      state.runtimeLoadedAt = Date.now();
      return missionDetailMarkup(mission);
    };
    globalThis.__renderClearanceWith = (profilePatch = {}, eligibilityPatch = null) => {
      Object.assign(state.profile, {
        telegramVerified: false,
        xVerified: false,
        walletVerified: false,
        tokenAccountReady: false,
        holderEligible: false,
      }, profilePatch);
      const previous = state.campaign.eligibility;
      if (eligibilityPatch) state.campaign.eligibility = { ...previous, ...eligibilityPatch };
      const rendered = clearanceMarkup();
      state.campaign.eligibility = previous;
      return rendered;
    };
    globalThis.__missionStateWith = (id, runtime, campaignState = 'DRAFT', clearance = true) => {
      state.runtime = runtime;
      state.runtimeLoadedAt = Date.now();
      state.profile.campaignState = campaignState;
      state.profile.telegramVerified = clearance;
      state.profile.xVerified = clearance;
      state.profile.walletVerified = clearance;
      state.profile.tokenAccountReady = clearance;
      state.profile.holderEligible = clearance;
      const mission = state.campaign.missions.find((item) => item.id === id);
      return canonicalMissionState(mission, missionTelemetry(mission));
    };
    globalThis.__renderWebsiteVoteDetail = (websiteVotes, flow = null) => {
      state.profile.telegramVerified = true;
      state.profile.xVerified = true;
      state.profile.walletVerified = true;
      state.profile.tokenAccountReady = true;
      state.profile.holderEligible = true;
      state.profile.campaignState = 'ACTIVE';
      state.runtime = {
        databaseState: 'ACTIVE',
        operational: true,
        displayLabel: 'CYCLE 1 LIVE',
        tone: 'success',
        schedule: { phase: 'ACTIVE', label: 'Cycle 1 closes', targetAt: '2026-10-01T15:00:00.000Z', currentCycle: 1 },
      };
      state.runtimeLoadedAt = Date.now();
      state.websiteVotes = websiteVotes;
      state.websiteVoteFlow = flow;
      const mission = { ...state.campaign.missions.find(({ id }) => id === 'website-voting'), enabled: true };
      return missionDetailMarkup(mission);
    };
    globalThis.__renderRewardsWith = (rewards) => {
      state.profile.rewards = rewards;
      state.profile.allocation = rewards.allocatedBaseUnits;
      state.profileView = 'rewards';
      return { screen: rewardsScreen(), profile: profileScreen() };
    };
    globalThis.__renderRecordWith = (view) => {
      state.recordView = view;
      return recordScreen();
    };
    globalThis.__detectAchievementUnlock = (profileId, records) => detectNewAchievementUnlock(profileId, records);
    globalThis.__achievementStateWith = (view = 'overview', patch = {}) => {
      state.recordView = 'achievements';
      state.achievementView = view;
      state.selectedAchievementId = patch.selectedAchievementId || null;
      Object.assign(state.profile, patch.profile || {});
      state.runtime = patch.runtime || null;
      state.leaderboardMeta = patch.leaderboards || null;
      return achievementsScreen();
    };
    globalThis.__renderOceanWith = (snapshot) => {
      state.oceanVault = snapshot;
      return oceanImpactScreen();
    };
    globalThis.__renderOceanView = (view) => {
      state.oceanView = view;
      return oceanImpactScreen();
    };
    globalThis.__renderOceanProofWith = (proof) => {
      state.oceanProof = proof;
      state.profile.walletVerified = true;
      return oceanImpactScreen();
    };
    globalThis.__renderOceanHistoryWith = (receipts) => {
      state.telegram = { initData: 'signed-fixture' };
      state.profile.walletVerified = true;
      state.oceanReceipts = receipts;
      return oceanImpactScreen();
    };
    globalThis.__renderOceanRecognitionWith = (program) => {
      state.oceanRecognition = program;
      return oceanImpactScreen();
    };
    globalThis.__renderOceanPrivateWith = (personal) => {
      state.telegram = { initData: 'signed-fixture' };
      state.oceanRecognitionState = personal;
      return oceanImpactScreen();
    };
    globalThis.__renderBurnsWith = (summary) => {
      state.burns = summary;
      return burnsScreen();
    };
    globalThis.__renderDossierWith = (profilePatch = {}, runtime = null, sessionStatus = 'verified') => {
      state.sessionStatus = sessionStatus;
      Object.assign(state.profile, profilePatch);
      state.runtime = runtime;
      state.runtimeLoadedAt = runtime ? Date.now() : null;
      state.profileView = 'overview';
      return profileScreen();
    };
    globalThis.__renderWalletWith = ({ wallet, tokenAccount, status, recorded = false }) => {
      state.wallet = wallet;
      state.walletStatus = status;
      state.profile.walletVerified = Boolean(wallet);
      state.profile.walletVerifiedAt = '2026-08-27T18:00:00.000Z';
      state.profile.tokenAccountReady = Boolean(tokenAccount);
      state.profile.tokenAccount = tokenAccount;
      state.profile.rewards.recorded = recorded;
      state.profileView = 'wallet';
      return profileScreen();
    };
    globalThis.__renderHomeWithRuntime = (runtime) => {
      state.runtime = runtime;
      state.runtimeLoadedAt = Date.now();
      return home();
    };
    globalThis.__renderHomeWithReadiness = (readiness) => {
      state.readiness = readiness;
      return home();
    };
    globalThis.__renderReadinessWith = (readiness) => {
      state.readiness = readiness;
      return readinessScreen();
    };
    globalThis.__renderOperationsWithReadiness = (readiness, view = 'intel') => {
      state.readiness = readiness;
      state.operationsView = view;
      return operationsScreen();
    };
    globalThis.__renderOperationsWithRuntime = (runtime, view = 'overview') => {
      state.runtime = runtime;
      state.runtimeLoadedAt = Date.now();
      state.operationsView = view;
      return operationsScreen();
    };
    globalThis.__renderOperationWithStart = (proposedStart, runtime) => {
      state.campaign.schedule.activeOpensAt = proposedStart;
      state.runtime = runtime;
      state.runtimeLoadedAt = Date.now();
      state.operationsView = 'overview';
      return operationsScreen();
    };
    globalThis.__renderHomeLifecycleWith = (runtime, campaignState = 'DRAFT') => {
      state.runtime = runtime;
      state.runtimeLoadedAt = Date.now();
      state.profile.campaignState = campaignState;
      state.profile.telegramVerified = true;
      state.profile.xVerified = true;
      state.profile.walletVerified = true;
      state.profile.tokenAccountReady = true;
      state.profile.holderEligible = true;
      return home();
    };
    globalThis.__renderOperationOverviewWith = (runtime, campaignState = 'DRAFT') => {
      state.runtime = runtime;
      state.runtimeLoadedAt = Date.now();
      state.profile.campaignState = campaignState;
      state.operationsView = 'overview';
      return operationsScreen();
    };
    globalThis.__operationLifecycleWith = (runtime, campaignState = 'DRAFT') => {
      state.runtime = runtime;
      state.profile.campaignState = campaignState;
      return operationLifecycleState();
    };
    globalThis.__renderLeaderboardWithLifecycle = (runtime, campaignState = 'DRAFT', meta = null) => {
      state.runtime = runtime;
      state.profile.campaignState = campaignState;
      state.leaderboardMeta = meta;
      return leaderboardScreen();
    };
    globalThis.__systemStatusWith = ({ sessionStatus = 'verified', runtime = {}, readiness = { available: true }, campaignUnavailable = false } = {}) => {
      state.sessionStatus = sessionStatus;
      state.runtime = runtime;
      state.readiness = readiness;
      if (campaignUnavailable) state.campaign = fallbackCampaign;
      return systemStatusMarkup();
    };
    globalThis.__resolveRoute = (screen) => resolveScreenRoute(screen);
    globalThis.__renderIdentityState = ({ user, telegramVerified = true, xVerified = false, walletVerified = false, oracleAvailable = true }) => {
      state.runtime = { ...(state.runtime || {}), oracleBotUrl: oracleAvailable ? 'https://t.me/Oracle_Dev_cs_bot' : null };
      state.profile.name = telegramDisplayName(user);
      state.profile.photoUrl = safeHttpsUrl(user.photoUrl);
      state.profile.telegramVerified = telegramVerified;
      state.profile.xVerified = xVerified;
      state.profile.walletVerified = walletVerified;
      return { home: home(), profile: profileScreen() };
    };
    globalThis.__identityPending = async () => {
      state.telegram = { initData: 'signed-test-data' };
      await authenticateTelegram();
      return { status: state.sessionStatus, profile: state.profile,
        banner: systemStatusMarkup(), screen: profileScreen(), home: home() };
    };

  `;
  vm.runInContext(instrumented, context);
  return context;
}

test('standalone web stays explicit preview mode and never implies verified Telegram participation', async () => {
  const context = await loadRuntime();
  const preview = context.__systemStatusWith({ sessionStatus: 'outside', runtime: {}, readiness: { available: true } });
  assert.match(preview, /WEB PREVIEW/);
  assert.match(preview, /Viewing outside Telegram/);
  assert.match(preview, /official Telegram Mini App/);
  assert.doesNotMatch(preview, /VERIFIED PARTICIPANT/i);

  const sessionFailure = context.__systemStatusWith({ sessionStatus: 'error', runtime: {}, readiness: { available: true } });
  assert.match(sessionFailure, /Participant session unavailable/);
  assert.match(sessionFailure, /No identity or reward state is being inferred/);
});

test('Operations distinguishes a proposed launch date from an approved start', async () => {
  const context = await loadRuntime();
  const proposed = new Date(Date.now() + 7 * 86400_000).toISOString();
  const pending = context.__renderOperationWithStart(proposed, {
    databaseState: 'DRAFT', schedule: { phase: 'PRE_LAUNCH', targetAt: null },
  });
  assert.match(pending, /<span>TARGET<\/span><b>[A-Z]{3} \d{1,2}<\/b>/);
  assert.doesNotMatch(pending, /<span>START<\/span><b>[A-Z]{3} \d{1,2}<\/b>/);

  const scheduled = context.__renderOperationWithStart(proposed, {
    databaseState: 'SCHEDULED', schedule: { phase: 'PRE_LAUNCH', targetAt: proposed },
  });
  assert.match(scheduled, /<span>START<\/span><b>[A-Z]{3} \d{1,2}<\/b>/);
});

test('verified Telegram identity can show its portrait while Oracle campaign identity is unavailable', async () => {
  const context = await loadRuntime();
  context.fetch = async () => ({ status: 503, ok: false, json: async () => ({
    error: 'session unavailable',
    telegramUser: { firstName: 'Duck', lastName: 'Recruit', photoUrl: 'https://t.me/i/userpic/320/duck.jpg' },
  }) });
  const pending = await context.__identityPending();
  assert.equal(pending.status, 'identity-unavailable');
  assert.equal(pending.profile.name, 'Duck Recruit');
  assert.equal(pending.profile.photoUrl, 'https://t.me/i/userpic/320/duck.jpg');
  assert.equal(pending.profile.telegramVerified, false);
  assert.equal(pending.profile.xVerified, false);
  assert.equal(pending.profile.walletVerified, false);
  assert.match(pending.banner, /campaign record pending/);
  assert.match(pending.screen, /0\/5/);
  assert.match(pending.home, /Sync Oracle Identity/);
  assert.match(pending.home, /data-retry-session/);
});

test('legacy deep links normalize into the locked Operations IA', async () => {
  const context = await loadRuntime();
  assert.equal(context.__resolveRoute('missions'), 'operations');
  assert.equal(context.__resolveRoute('xp'), 'record');
  assert.equal(context.__resolveRoute('leaderboard'), 'record');
  assert.equal(context.__resolveRoute('rewards'), 'rewards');
});

test('Operations UI gives each bottom destination one job', async () => {
  const context = await loadRuntime();
  assert.deepEqual(Array.from(context.__nav, ([id]) => id), ['home', 'operations', 'record', 'rewards', 'profile']);
  assert.match(context.__rendered.operations, />Briefing<\/button>/);
  assert.match(context.__rendered.operations, />Missions<\/button>/);
  assert.match(context.__rendered.operations, />Economics<\/button>/);
  assert.doesNotMatch(context.__rendered.operations, />Progress<\/button>|>Intel<\/button>|operation-clearance-disclosure/);
  assert.match(context.__rendered.record, /YOUR RECORD/);
  assert.match(context.__rendered.record, />Achievements<\/button>/);
  assert.doesNotMatch(context.__rendered.record, /record-proof-links|record-operation-context|>Activity<\/button>/);
  assert.match(context.__rendered.rewards, /Reward Pipeline/);
  assert.match(context.__rendered.rewards, /No allocation recorded yet/);
  assert.equal((context.__rendered.rewards.match(/OPEN WALLET/g) || []).length, 1);
  assert.match(context.__profiles.overview, /CLEARANCE[\s\S]*0\/5/);
  assert.doesNotMatch(context.__profiles.overview, /passport-tabs|Campaign Records|dossier-live-record|passport-rewards-view/);
  assert.match(context.__profiles.wallet, /VERIFIED REWARD DESTINATION/);
  assert.match(context.__profiles.wallet, /Non-custodial by design/);
});

test('pre-launch UI distinguishes the October 5 target from final schedule approval', async () => {
  const context = await loadRuntime();
  const views = context.__preLaunchScheduleViews();
  for (const screen of Object.values(views)) {
    assert.match(screen, /Oct 5 target/);
    assert.match(screen, /9:00 AM PT/);
    assert.doesNotMatch(screen, /DATES PENDING|Campaign dates pending|8:00 AM PT/);
  }
  assert.match(views.home, /TARGET AWAITING APPROVAL/);
});

test('Profile owns identity while Record owns XP, standing and badges', async () => {
  const context = await loadRuntime();
  const profile = context.__renderDossierWith({
    name: 'RektRush', username: 'darealrektrush', xp: 680, rank: '#14', completedMissions: 6,
    crabArmy: {
      lifetimeXp: 115600, level: 18, rankName: 'Master Sergeant', division: 'Sergeant Command',
      progressPct: 0, xpToNext: 14000, nextRankName: 'First Sergeant', nextRankXp: 129600,
      badgeAssetKey: 'crab_army_rank_18', ladderVersion: 2,
    },
  }, { databaseState: 'ACTIVE', schedule: { phase: 'ACTIVE', currentCycle: 2 } });
  assert.match(profile, /ORACLE UNIVERSAL PROFILE/);
  assert.match(profile, /@darealrektrush/);
  assert.match(profile, /LVL 18 · Master Sergeant/);
  assert.match(profile, /115,600/);
  assert.match(profile, /14,000 XP to First Sergeant/);
  assert.match(profile, /680/);
  assert.match(profile, /#14/);
  assert.match(profile, /CAMPAIGN PASSPORT/);
  assert.doesNotMatch(profile, /passport-tabs/);
  const badges = context.__renderRecordWith('achievements');
  assert.match(badges, /PROJECT Q \/\/ ACHIEVEMENTS/);
  assert.match(badges, /0 \/ 8 earned/);
  assert.match(badges, /NEXT ACHIEVEMENT/);
  assert.match(badges, /VIEW ALL →/);
  assert.match(badges, /CLASSIFIED/);
  assert.doesNotMatch(badges, /YOUR LATEST UNLOCK WILL APPEAR HERE/);
  assert.match(badges, /achievement-collection-deck/);
  assert.match(badges, /id="achievement-tab-overview" data-achievement-view="overview" aria-controls="achievement-panel" aria-selected="true" tabindex="0"/);
  assert.match(badges, /role="tabpanel" aria-labelledby="achievement-tab-overview"/);
  assert.equal((badges.match(/class="achievement-tile(?: [^"]*)?" data-achievement-id/g) || []).length, 8);
  const xp = context.__renderRecordWith('xp');
  assert.match(xp, /680/);
  assert.match(xp, /XP history/);
  assert.match(xp, /Today’s XP/);
  assert.doesNotMatch(xp, /COMMUNITY PULSE|data-record-view="activity"|Rank Up|Level Up/);
});

test('achievement center shows provisional standings progress but never labels it earned', async () => {
  const context = await loadRuntime();
  const overview = context.__achievementStateWith('overview', {
    profile: { campaignState: 'ACTIVE' },
    runtime: { schedule: { phase: 'ACTIVE' } },
    leaderboards: { overall: { available: true, participantRank: 14, participantCount: 100 } },
  });
  assert.match(overview, /NEXT ACHIEVEMENT[\s\S]*Top 10%[\s\S]*Currently around the top 14%/);
  assert.match(overview, /IN PROGRESS/);
  assert.doesNotMatch(overview, /data-achievement-id="top-10-percent"[^>]*VERIFIED · EARNED/);
  const collections = context.__achievementStateWith('collections');
  assert.match(collections, /data-achievement-collection="xp"/);
  assert.match(collections, /data-achievement-collection="standings"/);
  assert.match(collections, /achievement-tile-grid/);
  assert.match(collections, /Missions[\s\S]*Impact[\s\S]*Economic/);
  assert.doesNotMatch(collections, /achievement-collection-empty/);
  const rarity = context.__achievementStateWith('rarity');
  assert.match(rarity, /Your verified trophy cabinet/);
  assert.match(rarity, /rarity-tier-shelf/);
  assert.match(rarity, /No rarity awards recorded yet/);
  assert.match(rarity, /Holder statistics are shown only after finalization/);
  assert.doesNotMatch(rarity, /No finalized awards in this tier yet/);
  const history = context.__achievementStateWith('history');
  assert.match(history, /Your campaign record/);
  assert.match(history, /Open Project Q in Telegram/);
});

test('achievement detail explains standings and XP progress with the matching verification note', async () => {
  const context = await loadRuntime();
  const xpDetail = context.__achievementStateWith('overview', { selectedAchievementId: 'xp-earned' });
  assert.match(xpDetail, /Progress reflects settled, verified activity/);
  assert.match(xpDetail, /achievement-detail-view is-locked/);
  assert.doesNotMatch(xpDetail, /350\s*\/\s*1,000|REWARD/);
  assert.doesNotMatch(xpDetail, /YOUR PROGRESS[\s\S]*?0%/);
  assert.doesNotMatch(xpDetail, /Live standings are provisional/);
  const standingsDetail = context.__achievementStateWith('overview', {
    selectedAchievementId: 'top-10-percent',
    profile: { campaignState: 'ACTIVE' },
    runtime: { schedule: { phase: 'ACTIVE' } },
    leaderboards: { overall: { available: true, participantRank: 14, participantCount: 100 } },
  });
  assert.match(standingsDetail, /Live standings are provisional/);
  assert.match(standingsDetail, /YOUR PROGRESS[\s\S]*Top 14%[\s\S]*4 pp/);
  assert.match(context.__achievementStateWith('overview', { selectedAchievementId: 'xp-master' }), /The requirement is classified/);
});

test('achievement record detail and history reflect only verified receipt and Oracle sync state', async () => {
  const context = await loadRuntime();
  const receipt = {
    recordId: 'receipt-1', achievementId: 'xp-earned', collection: 'xp', rarityTier: 'advanced',
    operationKey: 'operation-01', verificationState: 'VERIFIED', awardedAt: '2026-10-01T10:00:00Z',
    result: '25 XP settled', universalProfileSync: 'DELIVERED',
  };
  const detail = context.__achievementStateWith('overview', {
    selectedAchievementId: 'xp-earned',
    profile: { achievementRecords: [receipt], achievementRecordsAvailable: true },
  });
  assert.match(detail, /PROJECT Q \/\/ ACHIEVEMENT/);
  assert.match(detail, /VERIFIED by Project Q|Verified by Project Q/);
  assert.match(detail, /UNIVERSAL PROFILE/);
  assert.match(detail, /Synced/);
  assert.match(detail, /25 XP settled/);
  assert.match(context.__achievementStateWith('history', {
    profile: { achievementRecords: [receipt], achievementRecordsAvailable: true },
  }), /UNIVERSAL PROFILE SYNCED/);
});

test('achievement unlock event fires only for new verified receipts and can summarize a final award batch', async () => {
  const context = await loadRuntime();
  const storage = new Map();
  context.localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, value); },
  };
  const first = {
    recordId: 'receipt-1', achievementId: 'xp-earned', verificationState: 'VERIFIED',
    awardedAt: '2026-10-01T09:00:00Z',
  };
  assert.equal(context.__detectAchievementUnlock('profile-1', [first]), null);
  const second = {
    recordId: 'receipt-2', achievementId: 'top-10-percent', verificationState: 'VERIFIED',
    awardedAt: '2026-10-01T10:00:00Z',
  };
  const third = {
    recordId: 'receipt-3', achievementId: 'champion', verificationState: 'VERIFIED',
    awardedAt: '2026-10-01T10:01:00Z',
  };
  const unlock = context.__detectAchievementUnlock('profile-1', [first, second, third]);
  assert.equal(unlock.record.recordId, 'receipt-3');
  assert.equal(unlock.additionalCount, 1);
  assert.equal(context.__detectAchievementUnlock('profile-1', [first, second, third]), null);
  assert.equal(context.__detectAchievementUnlock('profile-2', [first]), null);
});

test('Rewards pending state shows one wallet action and no invented receipts', async () => {
  const context = await loadRuntime();
  const { screen, profile } = context.__renderRewardsWith({ recorded: false, releaseCount: 0, releases: [] });
  assert.match(screen, /Complete Telegram identity/);
  assert.match(screen, /Reward Wallet Pending/);
  assert.match(screen, /No allocation recorded yet/);
  assert.equal((screen.match(/OPEN WALLET/g) || []).length, 1);
  assert.doesNotMatch(screen, /reward-summary-grid|allocation-receipt|Verified Reward Wallet/);
  assert.doesNotMatch(profile, /No allocation recorded yet|ECONOMIC RECORD/);
});

test('Ocean Impact card opens a permanent mission page without an unverified contribution destination', async () => {
  const context = await loadRuntime();
  assert.match(context.__rendered.home, /data-screen="ocean"/);
  assert.match(context.__rendered.home, /crabstar-ocean-impact-card-20260929\.jpg/);
  const ocean = context.__rendered.ocean;
  assert.match(ocean, /CrabStar leads the ocean conservation mission/);
  assert.match(ocean, /CONTRIBUTED/);
  assert.match(ocean, /COMMITTED/);
  assert.match(ocean, /DOCUMENTED/);
  assert.match(ocean, /In-app transfers are not open yet/);
  assert.match(ocean, /aria-label="Ocean Impact sections"/);
  assert.match(ocean, /data-ocean-view="mission" aria-current="page"/);
  assert.match(ocean, /id="ocean-contribute" hidden/);
  const contributeView = context.__renderOceanView('contribute');
  assert.match(contributeView, /data-ocean-view="contribute" aria-current="page"/);
  assert.match(contributeView, /id="ocean-contribute"[^>]*>/);
  assert.doesNotMatch(contributeView, /id="ocean-contribute" hidden/);
  assert.match(contributeView, /id="ocean-vault" hidden/);
  assert.match(contributeView, /data-profile-view="identity"/);
  const impactView = context.__renderOceanView('impact');
  assert.match(impactView, /id="ocean-work"[^>]*>/);
  assert.doesNotMatch(impactView, /id="ocean-work" hidden/);
  assert.match(impactView, /Named initiative and allocation record pending/);
  context.__renderOceanView('mission');
  assert.match(ocean, /CHECK AN EXISTING TRANSFER/);
  assert.match(ocean, /CHECK TRANSFER →<\/button>/);
  assert.match(ocean, /Community recognition pending/);
  assert.match(ocean, /J9J6MsSxicqmwTuzJGHitVUuUhRwP4iaDdTRgMAUDj4p/);
  assert.match(ocean, /solscan\.io\/account\/J9J6MsSxicqmwTuzJGHitVUuUhRwP4iaDdTRgMAUDj4p/);
  assert.match(ocean, /2-of-3 Squads V4 multisig/);
  assert.doesNotMatch(ocean, /3z6YpKpgDrUdRuqp1KkJfVhw5X3BRGQzUZhGN8VMNfci|data-send-transfer|<button[^>]*>SEND/);
  assert.match(ocean, /Live vault observation is unavailable/);
  const observed = context.__renderOceanWith({
    available: true, vault: 'J9J6MsSxicqmwTuzJGHitVUuUhRwP4iaDdTRgMAUDj4p',
    network: 'mainnet-beta', slot: 450523697, observedAt: '2026-09-29T09:00:00Z',
    sol: { balanceLamports: '248947592' },
    assets: {
      FAWKQ: { available: true, balanceBaseUnits: '35000000000000', tokenAccount: 'WgGuvkt875q1WH5oPgn2a71KyNj5RRrJCGHc9JY6tcf' },
      USDC: { available: false, balanceBaseUnits: null, tokenAccount: null },
    },
  });
  assert.match(observed, /0\.248947592/);
  assert.match(observed, /35,000,000/);
  assert.match(observed, /WgGuvkt875q1WH5oPgn2a71KyNj5RRrJCGHc9JY6tcf/);
  assert.doesNotMatch(observed, /Hjb5k2ihS22D6HZJJUivZ1XQTfrgdT4HY14BF5ZYujNQ/);
  assert.match(observed, /USDC IN VAULT[\s\S]*NOT READY/);
  assert.match(observed, /balances are not contribution totals/);
  const matched = context.__renderOceanProofWith({ status: 'MATCHED', signature: 'txsignature', slot: 451602609,
    transfers: [{ asset: 'SOL', amountBaseUnits: '1200000000', decimals: 9 }] });
  assert.match(matched, /FINALIZED TRANSFER MATCHED/);
  assert.match(matched, /1\.2 SOL/);
  assert.match(matched, /Save its receipt to add it to your private record/);
  const history = context.__renderOceanHistoryWith([{ asset: 'FAWKQ', amountBaseUnits: '2300000', decimals: 6,
    blockTime: '2026-09-29T11:00:00Z', signature: 'test-signature', founderDeposit: false }]);
  assert.match(history, /YOUR SAVED RECEIPTS/);
  assert.match(history, /2\.3 FAWKQ/);
  assert.match(history, /solscan\.io\/tx\/test-signature/);
  const saved = context.__renderOceanProofWith({ status: 'RECORDED', signature: 'test-signature', slot: 451602609,
    transfers: [{ asset: 'SOL', amountBaseUnits: '1200000000', decimals: 9 }] });
  assert.match(saved, /saved in Project Q, linked to your CrabStar ID/);
  assert.match(context.__renderOceanProofWith({ status: 'NO_MATCH' }), /NO MATCH FOUND/);
  const proposed = context.__renderOceanRecognitionWith({ status: 'PROPOSED',
    tiers: [{ title: 'Ocean Supporter', days: 1 }, { title: 'Ocean Steward', days: 25 }],
    badges: [{ title: 'First Contributor' }, { title: 'Repeat Contributor' }],
    campaignXp: { base: 4, repeat: 5, consistent: 6, campaignCap: 12 } });
  assert.match(proposed, /Ocean Steward/);
  assert.match(proposed, /12 XP campaign cap/);
  assert.match(proposed, /Public profile/);
  assert.match(proposed, /SHOUT-OUTS \/\/ OPT-IN/);
  assert.match(proposed, /RULES PROPOSED/);
  const personal = context.__renderOceanPrivateWith({
    preference: { displayMode: 'ALIAS', alias: 'Ocean Crab', consentAt: '2026-09-29T00:00:00Z' },
    progress: { contributions: 2, days: 2, founderReceipts: 1, status: 'PREVIEW' },
  });
  assert.match(personal, /2 verified days/);
  assert.match(personal, /Ocean Steward proposed threshold: 25 days/);
  assert.match(personal, /value="Ocean Crab"/);
  assert.match(personal, /No tier or badge has been awarded/);
  assert.match(personal, /Shout-outs are off/);
  assert.doesNotMatch(proposed, /XP AWARDED|BADGE EARNED|data-send-transfer/);
});

test('Mission Files are accessible below a compact campaign heading and readiness keeps its real label', async () => {
  const context = await loadRuntime();
  const missions = context.__renderOperationsWithReadiness({ available: true, percent: 55 }, 'missions');
  assert.match(missions, /operation-compact-context/);
  assert.match(missions, /data-tour-target="mission-files"/);
  assert.doesNotMatch(missions, /operation-cover bond-cover/);
  const progress = context.__renderOperationsWithReadiness({ available: true, percent: 55 }, 'progress');
  assert.match(progress, /LAUNCH READINESS/);
  assert.doesNotMatch(progress, />Campaign Progress</);
});

test('Briefing repeats the shared next step and links to the sole clearance checklist', async () => {
  const context = await loadRuntime();
  const upcoming = context.__renderOperationOverviewWith({ databaseState: 'DRAFT', operational: false, schedule: { phase: 'PRE_LAUNCH' } });
  assert.match(upcoming, /NEXT STEP[\s\S]*Complete Telegram identity/);
  assert.match(upcoming, /CLEARANCE 0\/5/);
  assert.match(upcoming, /data-profile-view="overview"/);
  assert.match(upcoming, /PUBLIC LAUNCH READINESS/);
  assert.match(upcoming, /data-operation-view="economics"/);
  assert.doesNotMatch(upcoming, /clearance-list|operation-clearance-disclosure|class="operation-economics operation-pool-list"/);
});

test('Legacy Progress entry folds into Briefing with live operation state', async () => {
  const context = await loadRuntime();
  const active = context.__renderOperationsWithRuntime({ databaseState: 'ACTIVE', operational: true, schedule: { phase: 'ACTIVE', currentCycle: 2, label: 'Cycle 2 closes' } }, 'progress');
  assert.match(active, /CYCLE 2 \/ 5/);
  assert.match(active, />Briefing<\/button>/);
  assert.doesNotMatch(active, /operation-live-progress|>Progress<\/button>/);
  const review = context.__renderOperationsWithRuntime({ databaseState: 'VERIFYING', operational: false, schedule: { phase: 'REVIEW' } }, 'progress');
  assert.match(review, /REVIEWING/);
  assert.doesNotMatch(review, /operation-live-progress/);
});

test('Economics discloses verification state without asserting unfunded awards', async () => {
  const context = await loadRuntime();
  const pending = context.__renderOperationsWithReadiness({ available: false }, 'economics');
  assert.match(pending, /Planned · funding pending/);
  assert.match(pending, /data-pool-id="campaignRewards"/);
  assert.match(pending, /Treasury & receipts/);
  assert.doesNotMatch(pending, /Funding gate verified/);
  const verified = context.__renderOperationsWithReadiness({ available: true, checks: ['funding', 'registry', 'burn-rules', 'burn-progress', 'burn-verification'].map(key => ({ key, ready: true })) }, 'economics');
  assert.match(verified, /Funding gate verified/);
  assert.match(verified, /Burn gates verified/);
  assert.match(verified, /Prize registry verified/);
});

test('Earn to Burn shows planned milestones without inventing ledger progress when unavailable', async () => {
  const context = await loadRuntime();
  const unavailable = context.__renderBurnsWith(null);
  assert.match(unavailable, /CONFIGURED BURN RESERVE[\s\S]*15M/);
  assert.match(unavailable, /Burn progress temporarily unavailable/);
  assert.match(unavailable, /The milestones below are the configured plan only/);
  assert.equal((unavailable.match(/class="burn-plan-row /g) || []).length, 5);
  assert.match(unavailable, /3M[\s\S]*3,000,000 FAWKQ/);
  assert.doesNotMatch(unavailable, /ON-CHAIN RECEIPTS|CONFIRMED BURNED/);
  assert.match(unavailable, /data-operation-view="economics"/);
});

test('Earn to Burn separates verified totals, the next unlock and on-chain receipts', async () => {
  const context = await loadRuntime();
  const live = context.__renderBurnsWith({
    unavailable: false, state: 'ENABLED', decimals: 6, originalSupplyBaseUnits: '1000000000000000',
    currentSupplyBaseUnits: '997000000000000', totalBurnedBaseUnits: '3000000000000',
    supplyRemovedBps: 30, burnCount: 1, progressUnits: '2500',
    milestones: [{ sequence: 1, label: 'Burn Milestone 1', state: 'CONFIRMED', progressTargetUnits: '2000', burnAmountBaseUnits: '3000000000000' }, { sequence: 2, label: 'Burn Milestone 2', state: 'LOCKED', progressTargetUnits: '5000', burnAmountBaseUnits: '3000000000000' }],
    nextMilestone: { label: 'Burn Milestone 2', state: 'LOCKED', progressTargetUnits: '5000', burnAmountBaseUnits: '3000000000000', progressBps: 5000 },
    receipts: [{ receiptCode: 'BURN-01', amountBaseUnits: '3000000000000', burnType: 'MILESTONE', blockTime: '2026-09-29T15:00:00Z', signature: 'validSignature' }],
  });
  assert.match(live, /AUTHORITATIVE BURN LEDGER/);
  assert.match(live, /CONFIRMED BURNED[\s\S]*3M/);
  assert.match(live, /2,500 of 5,000 verified campaign XP/);
  assert.match(live, /aria-label="Next burn milestone"[\s\S]*aria-valuenow="50"/);
  assert.match(live, /CONFIRMED \/\/ BURN-01/);
  assert.match(live, /https:\/\/solscan\.io\/tx\/validSignature/);
  assert.doesNotMatch(live, /Burn progress temporarily unavailable/);
});

test('unavailable voting sources are described by certification state rather than stale availability observations', async () => {
  const context = await loadRuntime();
  const voting = context.__missionDetails['website-voting'];
  assert.match(voting, /Other websites/);
  assert.match(voting, /CoinBuzzer[\s\S]*Individual XP unavailable/);
  assert.match(voting, /href="https:\/\/coinbuzzer\.me\/coin\/860"[^>]*data-external-vote-link/);
  assert.doesNotMatch(voting, /data-vote-source-key="web:coinbuzzer"/);
  assert.doesNotMatch(voting, /CoinBuzzer[\s\S]*offline/);
  assert.equal((voting.match(/data-external-vote-link/g) || []).length, 9);
  assert.doesNotMatch(voting, /data-vote-source-key=/);
  assert.equal((voting.match(/assets\/voting-sources\//g) || []).length, 7);
  assert.match(voting, /<span aria-hidden="true">GT<\/span>/);
  assert.match(voting, /<span aria-hidden="true">CS<\/span>/);
});

test('Launch Readiness screen groups all public gates and exposes only the report fingerprint', async () => {
  const context = await loadRuntime();
  const keys = ['rules', 'funding', 'registry', 'sources', 'dates', 'app', 'wallet', 'settlement', 'burn-rules', 'burn-progress', 'burn-verification'];
  const rendered = context.__renderReadinessWith({
    available: true, ready: false, readyCount: 5, totalCount: 11, percent: 45,
    reportVersion: 'bond-readiness-v1', reportHash: 'e'.repeat(64),
    checks: keys.map((key, index) => ({ key, label: `Gate ${key}`, ready: index < 5 })),
  });
  assert.match(rendered, /LAUNCH BLOCKED/);
  assert.match(rendered, /Campaign foundation/);
  assert.match(rendered, /Participation rails/);
  assert.match(rendered, /Earn to Burn/);
  assert.match(rendered, /SEE OPERATION ECONOMICS/);
  assert.doesNotMatch(rendered, /launch-commitments/);
  assert.match(rendered, new RegExp('e'.repeat(64)));
  assert.match(rendered, /cannot activate the campaign/);
  assert.doesNotMatch(rendered, /evidence_url|founder_user_id|source_key|service_role/i);
});

test('Operations UI never fabricates participant results', async () => {
  const { __rendered: rendered } = await loadRuntime();
  const all = Object.values(rendered).join('\n');
  assert.doesNotMatch(all, /184,250|1,240 XP|@AlphaDuck|@TideBuilder/);
  assert.match(rendered.rewards, /No allocation recorded yet/);
  assert.match(rendered.leaderboard, /Rankings open with verified activity/);
  assert.doesNotMatch(rendered.home, /42%/);
});
test('Public readiness owns the gate list while Briefing links to it', async () => {
  const context = await loadRuntime();
  const readiness = { available: true, ready: false, readyCount: 6, totalCount: 11, percent: 55, checks: Array.from({ length: 11 }, (_, index) => ({ key: `gate-${index+1}`, label: `Launch gate ${index+1}`, ready: index < 6 })) };
  const report = context.__renderReadinessWith(readiness);
  assert.match(report, /55%/);
  assert.match(report, /6 of 11 public gates are verified/);
  const briefing = context.__renderOperationsWithReadiness(readiness, 'overview');
  assert.equal((briefing.match(/data-screen="readiness"/g) || []).length, 1);
  assert.doesNotMatch(briefing, /Launch gate 1/);
});

test('Terminal and Operations render authoritative campaign phase without unlocking gated missions', async () => {
  const context = await loadRuntime();
  const blocked = context.__renderHomeWithRuntime({
    serverNow: '2026-09-02T15:00:00.000Z', databaseState: 'DRAFT', operational: false,
    displayLabel: 'LAUNCH BLOCKED', tone: 'blocked',
    schedule: { phase: 'ACTIVE', label: 'Cycle 1 closes', targetAt: '2026-09-03T15:00:00.000Z', currentCycle: 1 },
  });
  assert.match(blocked, /LAUNCH BLOCKED/);
  const operations = context.__renderOperationsWithRuntime({
    serverNow: '2026-09-02T15:00:00.000Z', databaseState: 'DRAFT', operational: false,
    displayLabel: 'LAUNCH BLOCKED', tone: 'blocked',
    schedule: { phase: 'ACTIVE', label: 'Cycle 1 closes', targetAt: '2026-09-03T15:00:00.000Z', currentCycle: 1 },
  }, 'missions');
  assert.match(operations, /MISSION FILES/);
  assert.match(operations, /LOCKED/);
});
test('Terminal distinguishes a proposed target from authoritative campaign timing', async () => {
  const context = await loadRuntime();
  const pending = context.__renderHomeWithRuntime({
    serverNow: '2026-09-25T09:00:00.000Z', databaseState: 'DRAFT', operational: false,
    displayLabel: 'PRE-LAUNCH', tone: 'pending',
    schedule: { phase: 'PRE_LAUNCH', label: 'Campaign dates pending', targetAt: null, currentCycle: null },
  });
  assert.match(pending, /TARGET AWAITING APPROVAL/);
  assert.match(pending, /Oct 5 target[\s\S]*9:00 AM PT/);
  assert.doesNotMatch(pending, /Campaign dates pending|8:00 AM PT/);
  assert.doesNotMatch(pending, /00<\/strong><span>DAYS/);
  const live = context.__renderHomeWithRuntime({
    serverNow: '2026-09-29T15:00:00.000Z', databaseState: 'ACTIVE', operational: true,
    displayLabel: 'CYCLE 1 LIVE', tone: 'success',
    schedule: { phase: 'ACTIVE', label: 'Cycle 1 closes', targetAt: '2026-10-01T15:00:00.000Z', currentCycle: 1 },
  });
  assert.match(live, /state-pill success[^>]*><i><\/i>ACTIVE/);
  assert.match(live, /DAYS/);
  assert.match(live, /HOURS/);
});

test('Telegram identity paints the participant passport and advances the Oracle X step', async () => {
  const context = await loadRuntime();
  const user = { firstName: 'Duck', lastName: 'Recruit', photoUrl: 'https://t.me/i/userpic/320/duck.jpg' };
  const xStep = context.__renderIdentityState({ user });
  assert.match(xStep.profile, /<h2>Duck Recruit<\/h2>/);
  assert.match(xStep.profile, /src="https:\/\/t\.me\/i\/userpic\/320\/duck\.jpg"/);
  assert.match(xStep.home, /Complete X linked through Oracle/);
  assert.match(xStep.home, /class="terminal-next-step oracle-next"/);
  assert.match(xStep.home, /assets\/oracle-logo\.jpg/);
  const walletStep = context.__renderIdentityState({ user, xVerified: true });
  assert.match(walletStep.home, /Complete Reward wallet/);
  const pending = context.__renderIdentityState({ user, oracleAvailable: false });
  assert.match(pending.home, /Oracle connection pending/);
  assert.doesNotMatch(pending.home, /<b>Connect Oracle X<\/b>/);
  const pendingWallet = context.__renderIdentityState({ user, xVerified: true, oracleAvailable: false });
  assert.match(pendingWallet.home, /Oracle connection is not available/);
  const privatePhoto = context.__renderIdentityState({ user: { firstName: 'Duck', photoUrl: null } });
  assert.match(privatePhoto.profile, /assets\/system\/q-id\.webp/);
});
test('operation lifecycle follows authoritative campaign state instead of participant reward state', async () => {
  const context = await loadRuntime();
  assert.equal(context.__operationLifecycleWith({
    databaseState: 'READINESS_BLOCKED', operational: false,
    schedule: { phase: 'ACTIVE' },
  }, 'READINESS_BLOCKED').label, 'LAUNCH BLOCKED');
  assert.equal(context.__operationLifecycleWith({
    databaseState: 'ACTIVE', operational: true,
    schedule: { phase: 'ACTIVE' },
  }, 'ACTIVE').label, 'ACTIVE');
  assert.equal(context.__operationLifecycleWith({
    databaseState: 'VERIFYING', operational: false,
    schedule: { phase: 'REVIEW' },
  }, 'VERIFYING').label, 'REVIEWING');
  assert.equal(context.__operationLifecycleWith({
    databaseState: 'DISTRIBUTING', operational: false,
    schedule: { phase: 'POST_REVIEW' },
  }, 'DISTRIBUTING').label, 'DISTRIBUTING');
  assert.equal(context.__operationLifecycleWith({
    databaseState: 'COMPLETED', operational: false,
    schedule: { phase: 'POST_REVIEW' },
  }, 'COMPLETED').label, 'COMPLETED');
});
test('Terminal and Operation primary actions follow authoritative lifecycle', async () => {
  const context = await loadRuntime();

  const upcomingRuntime = { databaseState: 'SCHEDULED', operational: false, schedule: { phase: 'PRE_LAUNCH' } };
  assert.match(context.__renderHomeLifecycleWith(upcomingRuntime, 'SCHEDULED'), /Prepare for the operation/);
  assert.match(context.__renderOperationOverviewWith(upcomingRuntime, 'SCHEDULED'), /PREVIEW MISSIONS/);

  const activeRuntime = { databaseState: 'ACTIVE', operational: true, schedule: { phase: 'ACTIVE' } };
  assert.match(context.__renderHomeLifecycleWith(activeRuntime, 'ACTIVE'), /Choose a Mission File/);
  assert.match(context.__renderOperationOverviewWith(activeRuntime, 'ACTIVE'), /CHOOSE A MISSION/);

  const reviewRuntime = { databaseState: 'VERIFYING', operational: false, schedule: { phase: 'REVIEW' } };
  assert.match(context.__renderHomeLifecycleWith(reviewRuntime, 'VERIFYING'), /Follow final review/);
  assert.match(context.__renderOperationOverviewWith(reviewRuntime, 'VERIFYING'), /Follow final review/);

  const distributionRuntime = { databaseState: 'DISTRIBUTING', operational: false, schedule: { phase: 'POST_REVIEW' } };
  assert.match(context.__renderHomeLifecycleWith(distributionRuntime, 'DISTRIBUTING'), /Track reward delivery/);
  assert.match(context.__renderOperationOverviewWith(distributionRuntime, 'DISTRIBUTING'), /Track reward delivery/);

  const completedRuntime = { databaseState: 'COMPLETED', operational: false, schedule: { phase: 'POST_REVIEW' } };
  assert.match(context.__renderHomeLifecycleWith(completedRuntime, 'COMPLETED'), /Review your operation history/);
  assert.match(context.__renderOperationOverviewWith(completedRuntime, 'COMPLETED'), /Review your operation history/);
});
test('campaign clearance explains the exact missing requirement instead of generic ineligibility', async () => {
  const context = await loadRuntime();

  const telegramMissing = context.__renderClearanceWith({});
  assert.match(telegramMissing, /Telegram identity/);
  assert.match(telegramMissing, /data-clearance-action="telegram"/);
  assert.doesNotMatch(telegramMissing, /\bIneligible\b/i);

  const tokenMissing = context.__renderClearanceWith({
    telegramVerified: true,
    xVerified: true,
    walletVerified: true,
  });
  assert.match(tokenMissing, /FAWKQ token account/);
  assert.match(tokenMissing, /3\/5/);

  const holderMissing = context.__renderClearanceWith({
    telegramVerified: true,
    xVerified: true,
    walletVerified: true,
    tokenAccountReady: true,
  });
  assert.match(holderMissing, /Minimum \$2 FAWKQ/);
  assert.match(holderMissing, /Hold at least \$2 of FAWKQ/);
});

test('campaign clearance only renders requirements configured by the operation', async () => {
  const context = await loadRuntime();
  const rendered = context.__renderClearanceWith({
    telegramVerified: true,
    xVerified: true,
  }, {
    telegramRequired: true,
    oracleXRequired: true,
    walletRequiredForRewards: false,
    minimumFawkqUsd: 0,
  });

  assert.match(rendered, /Telegram identity/);
  assert.match(rendered, /X linked through Oracle/);
  assert.doesNotMatch(rendered, /Reward wallet/);
  assert.doesNotMatch(rendered, /FAWKQ token account/);
  assert.doesNotMatch(rendered, /Minimum \$/);
});

test('failed reward release remains visible as recovery review and is never shown as distributed', async () => {
  const context = await loadRuntime();
  const rendered = context.__renderRewardsWith({
    recorded: true,
    allocatedBaseUnits: '100000000',
    scheduledBaseUnits: '100000000',
    distributedBaseUnits: '0',
    failedBaseUnits: '25000000',
    releaseCount: 1,
    receiptCount: 0,
    releases: [{
      category: 'activity',
      cycleId: 1,
      percent: 25,
      amountBaseUnits: '25000000',
      scheduledAt: '2026-10-02T15:00:00.000Z',
      status: 'failed',
      transactionSignature: null,
    }],
  });
  assert.match(rendered.screen, /Recovery Review Required/);
  assert.match(rendered.screen, /25 FAWKQ is recorded in failed release state/);
  assert.match(rendered.screen, /RECOVERY REVIEW/);
  assert.match(rendered.screen, /Distributed<\/span><strong>0/);
  assert.doesNotMatch(rendered.screen, /On-chain receipt confirmed/);
});

test('configured mission availability still requires authoritative ACTIVE operation state', async () => {
  const context = await loadRuntime();
  assert.equal(context.__missionStateWith('bagwork', {
    databaseState: 'SCHEDULED', operational: false, schedule: { phase: 'PRE_LAUNCH' },
  }, 'SCHEDULED', true).label, 'LOCKED');

  assert.equal(context.__missionStateWith('bagwork', {
    databaseState: 'READINESS_BLOCKED', operational: false, schedule: { phase: 'ACTIVE' },
  }, 'READINESS_BLOCKED', true).label, 'LOCKED');

  assert.equal(context.__missionStateWith('bagwork', {
    databaseState: 'ACTIVE', operational: true, schedule: { phase: 'ACTIVE' },
  }, 'ACTIVE', true).label, 'AVAILABLE');

  assert.equal(context.__missionStateWith('bagwork', {
    databaseState: 'ACTIVE', operational: true, schedule: { phase: 'ACTIVE' },
  }, 'ACTIVE', false).label, 'LOCKED');

  assert.equal(context.__missionStateWith('bagwork', {
    databaseState: 'VERIFYING', operational: false, schedule: { phase: 'REVIEW' },
  }, 'VERIFYING', true).label, 'LOCKED');
});
test('campaign standings communicate live review and finalized lifecycle states', async () => {
  const context = await loadRuntime();
  const meta = { available: true, overall: { available: true, participantCount: 12, rows: [], unit: 'XP' } };
  const live = context.__renderLeaderboardWithLifecycle({
    databaseState: 'ACTIVE', operational: true, schedule: { phase: 'ACTIVE' },
  }, 'ACTIVE', meta);
  assert.match(live, /LIVE CAMPAIGN STANDING/);
  assert.match(live, /LIVE VERIFIED/);

  const review = context.__renderLeaderboardWithLifecycle({
    databaseState: 'VERIFYING', operational: false, schedule: { phase: 'REVIEW' },
  }, 'VERIFYING', meta);
  assert.match(review, /FINAL REVIEW/);
  assert.match(review, /UNDER REVIEW/);

  const final = context.__renderLeaderboardWithLifecycle({
    databaseState: 'COMPLETED', operational: false, schedule: { phase: 'POST_REVIEW' },
  }, 'COMPLETED', meta);
  assert.match(final, /FINAL CAMPAIGN STANDING/);
  assert.match(final, /FINALIZED/);
});
test('XP progress bars render authoritative daily bucket usage', async () => {
  const context = await loadRuntime();
  const rendered = context.__renderXpWithDailyBuckets({ participation: 3, trending: 9, mission: 8, other: 4 });
  assert.match(rendered, /Participation[\s\S]*3 \/ 15/);
  assert.match(rendered, /Trending activity[\s\S]*9 \/ 20/);
  assert.match(rendered, /Project Q missions[\s\S]*8 \/ 20/);
  assert.match(rendered, /Other verified activity[\s\S]*4 \/ 20/);
});

test('mission cards render verified, pending and rejected participant evidence', async () => {
  const context = await loadRuntime();
  const rendered = context.__renderMissionsWithEvidence({
    available: true,
    oracleRaids: { verified: 2, pending: 1, rejected: 1, target: 5 },
    websiteVoting: { verified: 4, pending: 0, rejected: 0, target: 9 },
    trendingBots: { verified: 1, pending: 1, rejected: 0, target: 5, pushPoints: 4 },
  });
  assert.match(rendered, /Oracle X Raids[\s\S]*2 \/ 5 VERIFIED/);
  assert.match(rendered, /Website Voting[\s\S]*4 \/ 9 VERIFIED/);
  assert.match(rendered, /Trending Bots[\s\S]*1 \/ 5 VERIFIED/);
  assert.doesNotMatch(rendered, /telegram_user_id|source_key|evidence_ref/);
});

test('every mission has a native detail sheet with safe readiness actions', async () => {
  const context = await loadRuntime();
  assert.equal(Object.keys(context.__missionDetails).length, 9);
  for (const detail of Object.values(context.__missionDetails)) {
    assert.match(detail, /CURRENT ORDER/);
    assert.match(detail, /<summary>Objective /);
    assert.match(detail, /<summary>Verification /);
    assert.match(detail, /<summary>Reward /);
    assert.match(detail, /Opening a destination alone does not create verified credit/);
    assert.match(detail, /VIEW CLEARANCE/);
    assert.doesNotMatch(detail, /View all requirements/);
  }
  assert.match(context.__missionDetails['website-voting'], /1 XP per accepted source/);
  assert.match(context.__missionDetails['website-voting'], /available-source completion/);
  assert.match(context.__missionDetails['website-voting'], /Verified vote sources/);
  assert.match(context.__missionDetails['website-voting'], /GeckoTerminal/);
  assert.match(context.__missionDetails['website-voting'], /CoinScope/);
  assert.match(context.__missionDetails['website-voting'], /Open in Telegram to check verification status/);
  assert.match(context.__missionDetails['trending-bots'], /drokiatrendsbot/);
  assert.match(context.__missionDetails['website-voting'], /LOCKED|Operation has not opened this mission yet/);
  const bagworkReady = context.__renderMissionDetailWithClearance(context.__missionById('bagwork'));
  assert.match(bagworkReady, /Open Bagwork/);
  assert.doesNotMatch(bagworkReady, /Open Bagwork[^]*disabled/);
  assert.match(context.__missionDetails['earn-to-burn'], /View public ledger/);
});

test('website voting renders source-specific readiness and the private proof workflow', async () => {
  const context = await loadRuntime();
  const sources = context.__renderWebsiteVoteDetail({
    available: true, enabled: true,
    sources: [
      { sourceKey: 'web:coinmooner', status: 'AVAILABLE', nextAvailableAt: null },
      { sourceKey: 'web:gemfinder', status: 'PENDING_REVIEW', nextAvailableAt: null },
      { sourceKey: 'web:coinmun', status: 'ON_COOLDOWN', nextAvailableAt: '2026-09-03T12:00:00Z' },
      { sourceKey: 'web:geckoterminal', status: 'COMMUNITY_ONLY', nextAvailableAt: null },
    ],
  });
  assert.match(sources, /data-vote-source-key="web:coinmooner"[^>]*>Start verified vote/);
  assert.match(sources, /GemFinder[^]*Your proof is under review/);
  assert.match(sources, /CoinMun[^]*Next vote/);
  assert.match(sources, /GeckoTerminal[^]*Community signal · no individual XP/);
  assert.match(sources, /href="https:\/\/coinmooner\.com\/coins\/fawk-q-fawkq"[^>]*data-external-vote-link/);
  assert.doesNotMatch(sources, /data-vote-source-key="web:geckoterminal"/);

  const active = context.__renderWebsiteVoteDetail({ available: true, enabled: true, sources: [] }, {
    challenge: 'a'.repeat(64),
    source: { sourceKey: 'web:coinmooner', name: 'CoinMooner', url: 'https://coinmooner.com' },
    attempt: { id: 44, status: 'OPEN', expiresAt: '2026-09-02T12:15:00Z' },
  });
  assert.match(active, /Active proof attempt/);
  assert.match(active, /AAAAAAAAAAAA/);
  assert.match(active, /website-vote-proof-file/);
  assert.match(active, /Submit private proof/);
  assert.doesNotMatch(active, /proof_sha256|proof_storage_key|reviewer_user_id/);
});

test('mission detail copy is escaped before it reaches the sheet', async () => {
  const context = await loadRuntime();
  const rendered = context.__renderMissionDetail({
    id: 'test', kind: 'INDIVIDUAL', image: '/safe.webp', title: '<img src=x>',
    description: '<script>alert(1)</script>', status: 'Draft', reward: '0 XP',
    verification: '<b>unsafe</b>', requirements: ['<svg onload=alert(1)>'],
    actionLabel: 'Closed', frequency: 'Once', enabled: false,
  });
  assert.doesNotMatch(rendered, /<script>|<img src=x>|<svg onload/);
  assert.match(rendered, /&lt;script&gt;|&lt;img src=x&gt;|&lt;svg onload/);
});

test('Rewards renders exact participant allocation and release records without claim controls', async () => {
  const context = await loadRuntime();
  const rendered = context.__renderRewardsWith({
    recorded: true,
    allocatedBaseUnits: '184250000000',
    scheduledBaseUnits: '42000000000',
    distributedBaseUnits: '18000000000',
    failedBaseUnits: '0',
    releaseCount: 2,
    releases: [
      { category: 'activity', cycleId: 1, percent: 25, scheduledAt: '2026-08-26T12:00:00Z', amountBaseUnits: '18000000000', status: 'paid', transactionSignature: '5'.repeat(88) },
      { category: 'activity', cycleId: 1, percent: 50, scheduledAt: '2026-08-28T12:00:00Z', amountBaseUnits: '42000000000', status: 'scheduled' },
    ],
  });
  assert.match(rendered.screen, /184,250/);
  assert.match(rendered.screen, /42,000/);
  assert.match(rendered.screen, /18,000/);
  assert.match(rendered.screen, /Activity rewards · CYCLE 1/);
  assert.match(rendered.screen, /Release Schedule/);
  assert.match(rendered.screen, /SCHEDULED<\/span>/);
  assert.match(rendered.screen, /<summary[^>]*><span>Reward Pipeline/);
  assert.match(rendered.screen, /Participation/);
  assert.match(rendered.screen, /PAID/);
  assert.match(rendered.screen, /No claim transaction required/);
  assert.match(rendered.screen, new RegExp(`solscan\\.io/tx/${'5'.repeat(88)}`));
  assert.doesNotMatch(rendered.profile, /passport-rewards-view|Scheduled[\s\S]*42,000/);
  assert.doesNotMatch(`${rendered.screen}\n${rendered.profile}`, /Claimable|claim tokens|sign transaction/i);
});

test('Wallet cockpit renders verified on-chain state without custody or transfer controls', async () => {
  const context = await loadRuntime();
  const wallet = '7kGJBag2VcjR4JB7qLStgizLa2eDQuGtiysZKzEetRMT';
  const tokenAccount = '3BZHPnTFuzxxaMFHo2Gv54uNP7Uw53cyoEMptnjZoxfa';
  const rendered = context.__renderWalletWith({
    wallet,
    tokenAccount,
    recorded: true,
    status: {
      available: true, network: 'mainnet-beta',
      mint: 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump',
      tokenProgramId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
      decimals: 6, balanceBaseUnits: '23110000000000', tokenAccountCount: 1,
      observedAt: '2026-08-27T18:00:00.000Z',
    },
  });
  assert.match(rendered, /23,110,000/);
  assert.match(rendered, new RegExp(wallet));
  assert.match(rendered, new RegExp(tokenAccount));
  assert.match(rendered, /Locked after allocation/);
  assert.match(rendered, /Non-custodial by design/);
  assert.doesNotMatch(rendered, /Send FAWKQ|Transfer FAWKQ|seed phrase input/i);
});

test('general destination entry is canonical while explicit actions can open named details', async () => {
  const context = await loadRuntime();
  assert.equal(context.__navigateWith('operations', 'operations').operation, 'overview');
  assert.equal(context.__navigateWith('rewards', 'operations').operation, 'overview');
  assert.equal(context.__navigateWith('rewards', 'operations', 'economics').operation, 'economics');
  assert.equal(context.__navigateWith('rewards', 'profile', 'wallet').profile, 'wallet');
  assert.equal(context.__navigateWith('profile', 'profile').profile, 'overview');
});

test('nine-file catalogue separates action missions from progress and preserves original IDs', async () => {
  const context = await loadRuntime();
  const missions = context.__renderOperationsWithRuntime({ databaseState: 'DRAFT', schedule: { phase: 'PRE_LAUNCH' } }, 'missions');
  assert.match(missions, /data-mission-id="participation-xp"/);
  assert.match(missions, /data-mission-id="earn-to-burn"/);
  assert.match(missions, /9<\/b> OPERATION FILES/);
  assert.match(missions, /7 action missions · 2 progress files/);
  assert.match(missions, /MF-06[\s\S]*Participation XP/);
  assert.match(missions, /MF-09[\s\S]*Earn to Burn/);
  assert.match(missions, /MF-07[\s\S]*Community Pulse/);
  assert.match(missions, /MF-08[\s\S]*Verified Referrals/);
});

test('pool taps open pool rules rather than personal allocation status', async () => {
  const context = await loadRuntime();
  const pool = context.__poolDetail('campaignRewards');
  assert.match(pool, /POOL DETAILS/);
  assert.match(pool, /15,000,000 FAWKQ/);
  assert.match(pool, /7.5M FAWKQ/);
  assert.match(pool, /Funding gate|FUNDING GATE/);
  assert.doesNotMatch(pool, /rewards-command/);
});


test('passport keeps pending identity distinct from a recorded zero and prioritizes incomplete clearance', async () => {
  const context = await loadRuntime();
  const unknown = context.__renderDossierWith({xp: 680,rank: '#14'}, null, 'identity-unavailable');
  assert.doesNotMatch(unknown, /680|#14|OBJECTIVE RECORDED/);
  assert.match(unknown, /personal record loads after Telegram identity/);
  assert.ok(unknown.indexOf('profile-clearance') < unknown.indexOf('campaign-passport'));
  const complete = context.__renderDossierWith({telegramVerified:true,xVerified:true,walletVerified:true,tokenAccountReady:true,holderEligible:true,xp:20},null,'verified');
  assert.match(complete, /passport-clearance-complete/);
  assert.equal((complete.match(/class="clearance-list"/g)||[]).length,1);
});

test('delivery confirmation date never substitutes the scheduled date', async () => {
  const context = await loadRuntime();
  const rewards = {recorded:true,allocatedBaseUnits:'1000000',releaseCount:1,releases:[{category:'activity',percent:25,amountBaseUnits:'250000',status:'paid',scheduledAt:'2026-09-01T12:00:00Z',transactionSignature:'5'.repeat(88),confirmedBlockTime:'2026-09-03T12:00:00Z'}]};
  const recorded = context.__renderRewardsWith(rewards).screen;
  assert.match(recorded, /<span>Scheduled<\/span><b>Sep 1, 2026/);
  assert.match(recorded, /<span>Confirmed<\/span><b>Sep 3, 2026/);
  rewards.releases[0].confirmedBlockTime=null;
  assert.match(context.__renderRewardsWith(rewards).screen, /<span>Confirmed<\/span><b>Evidence pending/);
});


test('personal update summaries require verified identity and distinguish objective from badge award', async () => {
  const runtime = await loadRuntime();
  const preview = runtime.__updatesWith('unavailable', { xp: 680, rewards: { recorded: true } });
  assert.doesNotMatch(preview, /680 operation XP settled|Reward allocation recorded/);
  assert.match(preview, /Open Project Q in Telegram/);
  const verified = runtime.__updatesWith('verified', { xp: 680, rewards: { recorded: true } });
  assert.match(verified, /680 operation XP settled/);
  assert.match(verified, /Reward allocation recorded/);
  assert.match(verified, /Badge issuance remains pending/);
  assert.match(verified, /Saved on this device/);
  assert.match(verified, /do not subscribe you to Telegram messages/);
});


test('account tools keep core navigation separate and help search is safe', async () => {
  const runtime = await loadRuntime();
  const menu = runtime.__accountPanel();
  assert.match(menu, /Campaign Profile/);
  assert.match(menu, /Help Centre & support/);
  assert.doesNotMatch(menu, /data-account-action="operations"/);
  assert.match(runtime.__accountPanel('settings'), /saved on this device/);
  assert.match(runtime.__helpResults('allocated'), /Does allocated mean paid/);
  assert.match(runtime.__helpResults('<script>'), /No matching answer/);
  assert.match(runtime.__accountPanel('help'), /Response times vary/);
});


test('launch readiness names unresolved public gates instead of only showing a percentage', async () => {
  const context = await loadRuntime();
  const html = context.__renderReadinessWith({
    available: true,
    ready: false,
    readyCount: 2,
    totalCount: 12,
    percent: 17,
    checks: [
      { key: 'rules', label: 'Final rules complete and hash-matched', ready: true },
      { key: 'funding', label: '17,500,000 FAWKQ Squads vault commitment verified', ready: false },
      { key: 'sources', label: 'Verification sources certified', ready: false },
    ],
  });
  assert.match(html, /LAUNCH BLOCKERS/);
  assert.match(html, /2 public gates remaining/);
  assert.match(html, /VERIFY FUNDING/);
  assert.match(html, /CERTIFY SOURCES/);
});

test('reward rows distinguish scheduled timing from confirmed on-chain timing', async () => {
  const context = await loadRuntime();
  const scheduled = context.__renderRewardsWith({
    recorded: true,
    allocatedBaseUnits: '1000000',
    scheduledBaseUnits: '1000000',
    distributedBaseUnits: '0',
    failedBaseUnits: '0',
    releaseCount: 1,
    allocations: [],
    releases: [{
      id: 'release-scheduled',
      category: 'activity',
      cycleId: 1,
      amountBaseUnits: '1000000',
      percent: 25,
      status: 'scheduled',
      scheduledAt: '2026-10-20T16:00:00.000Z',
      transactionSignature: null,
      confirmedBlockTime: null,
    }],
  }).screen;
  assert.match(scheduled, /Scheduled/);
  assert.doesNotMatch(scheduled, /Confirmed [A-Z][a-z]{2}/);

  const confirmed = context.__renderRewardsWith({
    recorded: true,
    allocatedBaseUnits: '1000000',
    scheduledBaseUnits: '1000000',
    distributedBaseUnits: '1000000',
    failedBaseUnits: '0',
    releaseCount: 1,
    allocations: [],
    releases: [{
      id: 'release-paid',
      category: 'activity',
      cycleId: 1,
      amountBaseUnits: '1000000',
      percent: 25,
      status: 'paid',
      scheduledAt: '2026-10-20T16:00:00.000Z',
      transactionSignature: '3333333333333333333333333333333333333333333333333333333333333333',
      confirmedBlockTime: '2026-10-20T16:05:00.000Z',
    }],
  }).screen;
  assert.match(confirmed, /Confirmed/);
  assert.match(confirmed, /On-chain receipt confirmed/);
});


test('beta profile shows a human-readable Oracle Universal Profile and updates use a Back action', async () => {
  const context = await loadRuntime();
  assert.match(context.__profiles.overview, /ORACLE UNIVERSAL PROFILE/);
  assert.match(context.__profiles.overview, /PROFILE DETAILS/);
  assert.match(context.__profiles.overview, /data-explainer="universal"/);
  assert.doesNotMatch(context.__profiles.overview, /UNIVERSAL ID|[0-9a-f]{8}-[0-9a-f]{4}-/i);

  const updates = context.__updatesWith('verified', { telegramVerified: true });
  assert.match(updates, /aria-label="Back from updates"/);
  assert.match(updates, /← BACK/);
  assert.doesNotMatch(updates, /aria-label="Close updates"/);
});

test('clearance presents one connected Oracle and wallet journey', async () => {
  const context = await loadRuntime();
  const clearance = context.__renderClearanceWith({ telegramVerified: true });
  assert.match(clearance, /CONNECT X/);
  assert.match(clearance, /VERIFY WALLET/);
  assert.match(clearance, /PROJECT Q \/\/ VERIFICATION CENTER/);
  assert.match(clearance, /Two actions\. Everything else is automatic\./);
  assert.match(clearance, /minimum holding automatically/);
  const wallet = context.__profiles.wallet;
  assert.match(wallet, /data-clearance-action="wallet-verify"[^>]*>VERIFY WALLET/);
  assert.match(wallet, /signed ownership message/);
});


test('Universal Profile hero keeps lifetime Crab Army progression separate from campaign XP', async () => {
  const context = await loadRuntime();
  const html = context.__renderDossierWith({
    name: 'Tester', username: 'tester',
    xp: 725,
    crabArmy: {
      lifetimeXp: 78400, level: 15, rankName: 'Colour Sergeant', division: 'Sergeant Command',
      progressPct: 0, xpToNext: 11600, nextRankName: 'Sergeant First Class', nextRankXp: 90000,
      badgeAssetKey: 'crab_army_rank_15', ladderVersion: 2,
    },
    achievementRecords: [{
      recordId: 'u-1', achievementId: 'xp-earned', verificationState: 'VERIFIED',
      universalProfileSync: 'DELIVERED', awardedAt: '2026-10-02T10:00:00Z',
    }],
    achievementRecordsAvailable: true,
  }, null, 'verified');

  assert.match(html, /LIFETIME XP[\s\S]*78,400/);
  assert.match(html, /OPERATION XP[\s\S]*725/);
  assert.match(html, /Colour Sergeant/);
  assert.match(html, /XP Earned/);
  assert.match(html, /BADGES[\s\S]*1/);
  assert.doesNotMatch(html, /78,400 operation XP|725 lifetime XP/i);
});


test('Verification Center presents only X and wallet as participant actions', async () => {
  const context = await loadRuntime();
  const html = context.__renderDossierWith({
    telegramVerified: true,
    xVerified: false,
    walletVerified: false,
    tokenAccountReady: false,
    holderEligible: false,
  }, null, 'verified');

  assert.match(html, /PROJECT Q \/\/ VERIFICATION CENTER/);
  assert.match(html, /Two actions\. Everything else is automatic\./);
  assert.match(html, /data-clearance-action="x"/);
  assert.match(html, /CONNECT X/);
  assert.match(html, /data-clearance-action="wallet-verify"/);
  assert.match(html, /VERIFY WALLET/);
  assert.match(html, /AUTOMATIC CHECKS/);
  assert.match(html, /Telegram/);
  assert.match(html, /FAWKQ account/);
  assert.match(html, /\$2 FAWKQ minimum/);
  assert.doesNotMatch(html, /class="clearance-row/);
  assert.doesNotMatch(html, />REFRESH →<\/button>/);
});

test('Universal Profile uses compact card hierarchy', async () => {
  const context = await loadRuntime();
  const html = context.__renderDossierWith({
    name: 'RektRush',
    username: 'darealrektrush',
    xp: 680,
    crabArmy: {
      lifetimeXp: 115600, level: 18, rankName: 'Master Sergeant', division: 'Sergeant Command',
      progressPct: 0, xpToNext: 14000, nextRankName: 'First Sergeant', nextRankXp: 129600,
      badgeAssetKey: 'crab_army_rank_18', ladderVersion: 2,
    },
  }, null, 'verified');

  assert.match(html, /universal-profile-hero compact/);
  assert.match(html, /universal-profile-compact-top/);
  assert.match(html, /universal-profile-compact-stats/);
  assert.match(html, /PROFILE DETAILS/);
  assert.match(html, /ARMY RANK/);
});
