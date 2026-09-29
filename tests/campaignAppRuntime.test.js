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
  };
  vm.createContext(context);
  const instrumented = source.replace(/\nboot\(\);\s*$/, '') + `
    state.campaign = ${JSON.stringify(campaign)};
    globalThis.__rendered = Object.fromEntries(Object.entries(screens).map(([key, screen]) => [key, screen()]));
    globalThis.__profiles = {};
    for (const view of ['overview', 'wallet', 'activity', 'rewards', 'referrals', 'identity']) {
      state.profileView = view;
      globalThis.__profiles[view] = profileScreen();
    }
    globalThis.__nav = NAV;
    globalThis.__renderXpWithDailyBuckets = (buckets) => {
      state.profile.todayXpByBucket = buckets;
      return xpScreen();
    };
    globalThis.__renderMissionsWithEvidence = (evidence) => {
      state.missionEvidence = evidence;
      return missionsScreen();
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
    globalThis.__renderOceanWith = (snapshot) => {
      state.oceanVault = snapshot;
      return oceanImpactScreen();
    };
    globalThis.__renderOceanProofWith = (proof) => {
      state.oceanProof = proof;
      state.profile.walletVerified = true;
      return oceanImpactScreen();
    };
    globalThis.__renderBurnsWith = (summary) => {
      state.burns = summary;
      return burnsScreen();
    };
    globalThis.__renderDossierWith = (profilePatch = {}, runtime = null) => {
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
  assert.match(pending.screen, /0\/3/);
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

test('Operations UI renders from the real Bond campaign config', async () => {
  const context = await loadRuntime();
  assert.deepEqual(Array.from(context.__nav, ([id]) => id), ['home', 'operations', 'record', 'rewards', 'profile']);
  for (const screen of ['home', 'operations', 'record', 'rewards', 'profile', 'burns', 'readiness']) {
    assert.equal(typeof context.__rendered[screen], 'string');
    assert.ok(context.__rendered[screen].length > 300, `${screen} should render substantial native UI`);
  }
  assert.match(context.__rendered.home, /Bond[\s\S]*the Duck/);
  assert.match(context.__rendered.operations, /OPERATION 01/);
  assert.match(context.__rendered.operations, /Four campaign pools/);
  assert.match(context.__renderOperationsWithReadiness({ available: false }, 'rewards'), /Reward Pool/);
  assert.match(context.__rendered.record, /PROJECT Q RECORD/);
  assert.match(context.__rendered.record, /CAMPAIGN XP/);
  assert.match(context.__rendered.record, /STANDING UNRANKED/);
  assert.match(context.__rendered.record, />Standing<\/button>/);
  assert.match(context.__rendered.rewards, /Reward Pipeline/);
  assert.match(context.__rendered.rewards, /No allocation recorded yet/);
  assert.doesNotMatch(context.__rendered.rewards, /Verified Reward Wallet/);
  assert.match(context.__profiles.identity, /oracle-logo\.jpg/);
  assert.match(context.__profiles.overview, /Campaign Records/);
  assert.match(context.__profiles.wallet, /VERIFIED REWARD DESTINATION/);
  assert.match(context.__profiles.wallet, /Non-custodial by design/);
  assert.match(context.__profiles.activity, /PROJECT Q XP RECORDS/);
  assert.match(context.__profiles.rewards, /ECONOMIC RECORD/);
  assert.match(context.__profiles.referrals, /\$2 buy pending/);
});

test('Campaign Dossier keeps campaign standing and planned badges separate from universal rank', async () => {
  const context = await loadRuntime();
  const profile = context.__renderDossierWith({
    name: 'RektRush', username: 'darealrektrush', xp: 680, rank: '#14',
    completedMissions: 6, xpByBucket: { participation: 80, mission: 65, trending: 50, other: 0 },
  }, { databaseState: 'ACTIVE', schedule: { phase: 'ACTIVE', currentCycle: 2 } });
  assert.match(profile, /PROJECT Q \/\/ CAMPAIGN DOSSIER/);
  assert.match(profile, /@darealrektrush/);
  assert.match(profile, /Campaign XP/);
  assert.match(profile, /#14/);
  assert.match(profile, /2 \/ 5/);
  assert.match(profile, /CAMPAIGN CLEARANCE/);
  assert.match(profile, /RANK SYNC PENDING/);
  assert.doesNotMatch(profile, /Sergeant Major|4-day streak|27 verified actions/);
  assert.match(context.__renderRecordWith('achievements'), />Planned<\/span>/);
  const xpRecord = context.__renderRecordWith('xp');
  assert.doesNotMatch(xpRecord, /Planned badges|progression-hero|xp-ledger-section/);
  assert.equal((xpRecord.match(/CAMPAIGN XP<\/span>/g) || []).length, 1);
  assert.match(xpRecord, /data-record-view="activity"/);
  assert.match(xpRecord, /data-record-view="achievements"/);
  assert.match(profile, /<details class="dossier-deep-record"/);
  assert.match(profile, /No allocation recorded yet/);
  assert.doesNotMatch(context.__rendered.record, /Rank Up|Level Up/);
});

test('Rewards pending state directs identity setup without suggesting a verified wallet or receipt', async () => {
  const context = await loadRuntime();
  const { screen, profile } = context.__renderRewardsWith({ recorded: false, releaseCount: 0, releases: [] });
  assert.match(screen, /Recognize your identity/);
  assert.match(screen, /data-profile-view="identity"/);
  assert.match(screen, /Reward Wallet Pending/);
  assert.match(screen, /No allocation recorded yet/);
  assert.doesNotMatch(screen, /reward-summary-grid|allocation-receipt|Verified Reward Wallet/);
  assert.match(profile, /No allocation recorded yet/);
  assert.doesNotMatch(profile, /RECORDED<\/span>/);
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
  assert.match(ocean, /In-app contributions are not open yet/);
  assert.match(ocean, /CHECK AN EXISTING TRANSFER/);
  assert.match(ocean, /CHECK TRANSFER →<\/button>/);
  assert.match(ocean, /Community record pending/);
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
  assert.match(matched, /a contribution receipt and campaign credit have not been issued/);
  assert.match(context.__renderOceanProofWith({ status: 'NO_MATCH' }), /NO MATCH FOUND/);
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

test('Operations makes the next setup step actionable without claiming the campaign has opened', async () => {
  const context = await loadRuntime();
  const upcoming = context.__renderOperationOverviewWith({ databaseState: 'DRAFT', operational: false, schedule: { phase: 'PRE_LAUNCH' } });
  assert.match(upcoming, /CURRENT ORDER \/\/ UPCOMING/);
  assert.match(upcoming, /CONTINUE SETUP →/);
  assert.match(upcoming, /PUBLIC LAUNCH READINESS/);
  assert.match(upcoming, /<details class="operation-clearance-disclosure"><summary>[\s\S]*0 \/ 5 COMPLETE[\s\S]*<\/summary>/);
  assert.match(upcoming, /Four campaign pools/);
  assert.match(upcoming, /data-operation-view="rewards"/);
  assert.doesNotMatch(upcoming, /class="operation-economics operation-pool-list"/);
  assert.doesNotMatch(upcoming, /VIEW VERIFIED PROGRESS/);
});

test('Operations progress follows active and review states and keeps launch readiness separate', async () => {
  const context = await loadRuntime();
  const activeRuntime = { databaseState: 'ACTIVE', operational: true, schedule: { phase: 'ACTIVE', currentCycle: 2, label: 'Cycle 2 closes' } };
  const active = context.__renderOperationsWithRuntime(activeRuntime, 'progress');
  assert.match(active, /CAMPAIGN PROGRESS/);
  assert.match(active, /CYCLE 2 \/ 5/);
  assert.match(active, /OPEN YOUR RECORD/);
  assert.doesNotMatch(active, /Operational gates before launch/);
  const reviewRuntime = { databaseState: 'VERIFYING', operational: false, schedule: { phase: 'REVIEW' } };
  const review = context.__renderOperationsWithRuntime(reviewRuntime, 'overview');
  assert.match(review, /OPERATION STATUS/);
  assert.doesNotMatch(review, /PUBLIC LAUNCH READINESS/);
  const reviewProgress = context.__renderOperationsWithRuntime(reviewRuntime, 'progress');
  assert.match(reviewProgress, /Verified activity under review/);
  assert.doesNotMatch(reviewProgress, /Operational gates before launch/);
});

test('Operations pool and Intel disclose verification state without asserting unfunded awards', async () => {
  const context = await loadRuntime();
  const pending = context.__renderOperationsWithReadiness({ available: true, readyCount: 0, totalCount: 12, checks: [] }, 'rewards');
  assert.match(pending, /Planned · funding pending/);
  assert.match(pending, /Planned · burn checks pending/);
  assert.match(pending, /Planned · prize evidence pending/);
  assert.match(pending, /Your personal allocation is tracked separately/);
  assert.match(pending, /<strong>15M<\/strong>[\s\S]*15,000,000 FAWKQ/);
  assert.match(pending, /<strong>2\.5M<\/strong>[\s\S]*2,500,000 FAWKQ/);
  assert.match(pending, /data-screen="burns" aria-label="View Earn to Burn details/);
  assert.equal((pending.match(/class="operation-pool-row"/g) || []).length, 4);
  const verified = context.__renderOperationsWithReadiness({ available: true, checks: ['funding', 'registry', 'burn-rules', 'burn-progress', 'burn-verification'].map((key) => ({ key, ready: true })) }, 'rewards');
  assert.match(verified, /Funding gate verified/);
  assert.match(verified, /Burn gates verified/);
  assert.match(verified, /Prize registry verified/);
  const intel = context.__renderOperationsWithReadiness({ available: false }, 'intel');
  assert.match(intel, /Signed Telegram access is needed/);
  assert.doesNotMatch(intel, /LIVE SOURCES/);
});

test('Earn to Burn shows planned milestones without inventing ledger progress when unavailable', async () => {
  const context = await loadRuntime();
  const unavailable = context.__renderBurnsWith(null);
  assert.match(unavailable, /CONFIGURED BURN RESERVE[\s\S]*15M/);
  assert.match(unavailable, /Burn record temporarily unavailable/);
  assert.match(unavailable, /The milestones below are the configured plan only/);
  assert.equal((unavailable.match(/class="burn-plan-row /g) || []).length, 5);
  assert.match(unavailable, /3M[\s\S]*3,000,000 FAWKQ/);
  assert.doesNotMatch(unavailable, /ON-CHAIN RECEIPTS|CONFIRMED BURNED/);
  assert.match(unavailable, /data-operation-view="rewards"/);
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
  assert.doesNotMatch(live, /Burn record temporarily unavailable/);
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
  assert.match(rendered, /15,000,000 FAWKQ/);
  assert.match(rendered, /2,500,000 FAWKQ/);
  assert.match(rendered, /1 SOL/);
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
test('Operations renders exact public readiness totals and launch-gate status', async () => {
  const context = await loadRuntime();
  const checks = Array.from({ length: 11 }, (_, index) => ({
    key: `gate-${index + 1}`, label: `Launch gate ${index + 1}`, ready: index < 6,
  }));
  const readiness = { available: true, ready: false, readyCount: 6, totalCount: 11, percent: 55, checks };
  const intel = context.__renderOperationsWithReadiness(readiness, 'intel');
  const progress = context.__renderOperationsWithReadiness(readiness, 'progress');
  assert.match(progress, /55%/);
  assert.match(intel, /6 \/ 11 verified/);
  assert.match(intel, /Launch gate 1[\s\S]*Verified/);
  assert.match(intel, /Launch gate 11[\s\S]*Pending/);
  assert.match(intel, /Read-only readiness · no activation or treasury controls/);
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
  assert.match(operations, /Mission Files/);
  assert.match(operations, /LOCKED/);
});
test('Terminal distinguishes a proposed target from authoritative campaign timing', async () => {
  const context = await loadRuntime();
  const pending = context.__renderHomeWithRuntime({
    serverNow: '2026-09-25T09:00:00.000Z', databaseState: 'DRAFT', operational: false,
    displayLabel: 'PRE-LAUNCH', tone: 'pending',
    schedule: { phase: 'PRE_LAUNCH', label: 'Campaign dates pending', targetAt: null, currentCycle: null },
  });
  assert.match(pending, /DATES PENDING/);
  assert.match(pending, /Campaign dates pending/);
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
  assert.match(xStep.home, /Connect Oracle X/);
  assert.match(xStep.home, /class="terminal-next-step oracle-next"/);
  assert.match(xStep.home, /assets\/oracle-logo\.jpg/);
  const walletStep = context.__renderIdentityState({ user, xVerified: true });
  assert.match(walletStep.home, /Verify Reward Wallet/);
  const pending = context.__renderIdentityState({ user, oracleAvailable: false });
  assert.match(pending.home, /Oracle Dev setup pending/);
  assert.doesNotMatch(pending.home, /<b>Connect Oracle X<\/b>/);
  const pendingWallet = context.__renderIdentityState({ user, xVerified: true, oracleAvailable: false });
  assert.match(pendingWallet.home, /Wallet connection will open when Oracle Dev is ready/);
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
  assert.match(context.__renderHomeLifecycleWith(upcomingRuntime, 'SCHEDULED'), /Prepare for Operation 01/);
  assert.match(context.__renderOperationOverviewWith(upcomingRuntime, 'SCHEDULED'), /REVIEW MISSION FILES/);

  const activeRuntime = { databaseState: 'ACTIVE', operational: true, schedule: { phase: 'ACTIVE' } };
  assert.match(context.__renderHomeLifecycleWith(activeRuntime, 'ACTIVE'), /Enter Mission Files/);
  assert.match(context.__renderOperationOverviewWith(activeRuntime, 'ACTIVE'), /ENTER MISSION FILES/);

  const reviewRuntime = { databaseState: 'VERIFYING', operational: false, schedule: { phase: 'REVIEW' } };
  assert.match(context.__renderHomeLifecycleWith(reviewRuntime, 'VERIFYING'), /Final Review in Progress/);
  assert.match(context.__renderOperationOverviewWith(reviewRuntime, 'VERIFYING'), /FOLLOW FINAL REVIEW/);

  const distributionRuntime = { databaseState: 'DISTRIBUTING', operational: false, schedule: { phase: 'POST_REVIEW' } };
  assert.match(context.__renderHomeLifecycleWith(distributionRuntime, 'DISTRIBUTING'), /Track Reward Delivery/);
  assert.match(context.__renderOperationOverviewWith(distributionRuntime, 'DISTRIBUTING'), /TRACK REWARD DELIVERY/);

  const completedRuntime = { databaseState: 'COMPLETED', operational: false, schedule: { phase: 'POST_REVIEW' } };
  assert.match(context.__renderHomeLifecycleWith(completedRuntime, 'COMPLETED'), /View Your Permanent Record/);
  assert.match(context.__renderOperationOverviewWith(completedRuntime, 'COMPLETED'), /VIEW OPERATION RECORD/);
});
test('campaign clearance explains the exact missing requirement instead of generic ineligibility', async () => {
  const context = await loadRuntime();

  const telegramMissing = context.__renderClearanceWith({});
  assert.match(telegramMissing, /Telegram identity/);
  assert.match(telegramMissing, /NEXT REQUIRED[\s\S]*Telegram identity/);
  assert.doesNotMatch(telegramMissing, /\bIneligible\b/i);

  const tokenMissing = context.__renderClearanceWith({
    telegramVerified: true,
    xVerified: true,
    walletVerified: true,
  });
  assert.match(tokenMissing, /FAWKQ token account/);
  assert.match(tokenMissing, /NEXT REQUIRED[\s\S]*FAWKQ token account/);

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
  assert.match(rendered, /Oracle X Raids[\s\S]*2 \/ 5 verified[\s\S]*1 pending[\s\S]*1 rejected/);
  assert.match(rendered, /Website Voting[\s\S]*4 \/ 9 verified/);
  assert.match(rendered, /Trending Bots[\s\S]*4 pushes · 1 \/ 5 bots/);
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
    assert.match(detail, /View all requirements/);
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
  assert.match(rendered.profile, /Scheduled[\s\S]*42,000/);
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
