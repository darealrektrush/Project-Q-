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
    window: { Telegram: null, scrollTo() {}, open() {} },
    location: { hash: '', search: '' },
    URLSearchParams,
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
    for (const view of ['overview', 'activity', 'rewards', 'referrals', 'identity']) {
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
    globalThis.__renderMissionDetail = (mission) => missionDetailMarkup(mission);
    globalThis.__renderRewardsWith = (rewards) => {
      state.profile.rewards = rewards;
      state.profile.allocation = rewards.allocatedBaseUnits;
      state.profileView = 'rewards';
      return { screen: rewardsScreen(), profile: profileScreen() };
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
  `;
  vm.runInContext(instrumented, context);
  return context;
}

test('every Project Q V3 screen renders from the real Bond campaign config', async () => {
  const context = await loadRuntime();
  assert.deepEqual(Array.from(context.__nav, ([id]) => id), ['home', 'missions', 'xp', 'leaderboard', 'rewards']);
  for (const screen of ['home', 'missions', 'xp', 'leaderboard', 'rewards', 'burns', 'profile']) {
    assert.equal(typeof context.__rendered[screen], 'string');
    assert.ok(context.__rendered[screen].length > 300, `${screen} should render substantial native UI`);
  }
  assert.match(context.__rendered.home, /Bond[\s\S]*the Duck/);
  assert.match(context.__rendered.missions, /Oracle X Raids/);
  assert.match(context.__rendered.missions, /Community Pulse/);
  assert.match(context.__rendered.missions, /Verified Referrals/);
  assert.match(context.__rendered.missions, /Earn to Burn/);
  assert.match(context.__rendered.xp, /Verified XP/);
  assert.match(context.__rendered.leaderboard, /No placeholder scores or identities are shown/);
  assert.match(context.__rendered.rewards, /No participant allocation exists yet/);
  assert.match(context.__profiles.identity, /oracle-logo\.jpg/);
  assert.match(context.__profiles.overview, /48H XP cycles/);
  assert.match(context.__profiles.activity, /Activity ledger/);
  assert.match(context.__profiles.rewards, /Recorded allocation/);
  assert.match(context.__profiles.referrals, /\$2 buy pending/);
  assert.match(context.__profiles.identity, /Privacy &amp; security|Privacy & security/);
});

test('V3 readiness templates never fabricate participant results', async () => {
  const { __rendered: rendered } = await loadRuntime();
  const all = Object.values(rendered).join('\n');
  assert.doesNotMatch(all, /184,250|1,240 XP|@AlphaDuck|@TideBuilder/);
  assert.match(rendered.rewards, /Recorded allocation[\s\S]*—/);
  assert.match(rendered.leaderboard, /Rankings are not live/);
  assert.doesNotMatch(rendered.home, /42%/);
});

test('home renders exact public readiness totals and native launch-gate status', async () => {
  const context = await loadRuntime();
  const checks = Array.from({ length: 11 }, (_, index) => ({
    key: `gate-${index + 1}`, label: `Launch gate ${index + 1}`, ready: index < 6,
  }));
  const rendered = context.__renderHomeWithReadiness({
    available: true, ready: false, readyCount: 6, totalCount: 11, percent: 55, checks,
  });
  assert.match(rendered, /Campaign readiness[\s\S]*55%/);
  assert.match(rendered, /6 \/ 11 verified/);
  assert.match(rendered, /Launch gate 1[\s\S]*Verified/);
  assert.match(rendered, /Launch gate 11[\s\S]*Pending/);
  assert.match(rendered, /Read-only readiness · no activation or treasury controls/);
});

test('home renders authoritative campaign phase, cycle rail and fail-closed launch state', async () => {
  const context = await loadRuntime();
  const blocked = context.__renderHomeWithRuntime({
    serverNow: '2026-09-02T15:00:00.000Z', databaseState: 'DRAFT', operational: false,
    displayLabel: 'LAUNCH BLOCKED', tone: 'blocked',
    schedule: { phase: 'ACTIVE', label: 'Cycle 1 closes', targetAt: '2026-09-03T15:00:00.000Z', currentCycle: 1 },
  });
  assert.match(blocked, /LAUNCH BLOCKED/);
  assert.match(blocked, /operations remain closed until every activation gate passes/);
  assert.match(blocked, /aria-label="Seven campaign cycles"/);
  const live = context.__renderHomeWithRuntime({
    serverNow: '2026-09-04T15:00:00.000Z', databaseState: 'ACTIVE', operational: true,
    displayLabel: 'CYCLE 2 LIVE', tone: 'success',
    schedule: { phase: 'ACTIVE', label: 'Cycle 2 closes', targetAt: '2026-09-05T15:00:00.000Z', currentCycle: 2 },
  });
  assert.match(live, /CYCLE 2 LIVE/);
  assert.match(live, /Verified activity cycle 2 of 7/);
  assert.match(live, /class="complete" title="Cycle 1"/);
  assert.match(live, /class="current" title="Cycle 2"/);
});

test('XP progress bars render authoritative daily bucket usage', async () => {
  const context = await loadRuntime();
  const rendered = context.__renderXpWithDailyBuckets({ participation: 3, mission: 8, other: 4 });
  assert.match(rendered, /Participation[\s\S]*3 \/ 15/);
  assert.match(rendered, /Project Q missions[\s\S]*8 \/ 20/);
  assert.match(rendered, /Other verified activity[\s\S]*4 \/ 40/);
});

test('mission cards render verified, pending and rejected participant evidence', async () => {
  const context = await loadRuntime();
  const rendered = context.__renderMissionsWithEvidence({
    available: true,
    oracleRaids: { verified: 2, pending: 1, rejected: 1, target: 5 },
    websiteVoting: { verified: 4, pending: 0, rejected: 0, target: 9 },
    trendingBots: { verified: 1, pending: 1, rejected: 0, target: 4 },
  });
  assert.match(rendered, /Oracle X Raids[\s\S]*2 \/ 5 verified[\s\S]*1 pending[\s\S]*1 rejected/);
  assert.match(rendered, /Website Voting[\s\S]*4 \/ 9 verified/);
  assert.match(rendered, /Trending Bots[\s\S]*1 \/ 4 verified/);
  assert.doesNotMatch(rendered, /telegram_user_id|source_key|evidence_ref/);
});

test('every mission has a native detail sheet with safe readiness actions', async () => {
  const context = await loadRuntime();
  assert.equal(Object.keys(context.__missionDetails).length, 9);
  for (const detail of Object.values(context.__missionDetails)) {
    assert.match(detail, /How Project Q verifies it/);
    assert.match(detail, /Requirements/);
    assert.match(detail, /Only verified Project Q records count/);
  }
  assert.match(context.__missionDetails['website-voting'], /Up to 11 XP/);
  assert.match(context.__missionDetails['website-voting'], /Readiness gate closed/);
  assert.match(context.__missionDetails.bagwork, /Open Bagwork/);
  assert.doesNotMatch(context.__missionDetails.bagwork, /Open Bagwork[\s\S]*disabled/);
  assert.match(context.__missionDetails['earn-to-burn'], /View public ledger/);
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
      { category: 'activity', cycleId: 1, percent: 25, scheduledAt: '2026-08-26T12:00:00Z', amountBaseUnits: '18000000000', status: 'paid' },
      { category: 'activity', cycleId: 1, percent: 50, scheduledAt: '2026-08-28T12:00:00Z', amountBaseUnits: '42000000000', status: 'scheduled' },
    ],
  });
  assert.match(rendered.screen, /184,250/);
  assert.match(rendered.screen, /42,000/);
  assert.match(rendered.screen, /18,000/);
  assert.match(rendered.screen, /Activity rewards · Cycle 1/);
  assert.match(rendered.screen, /paid/);
  assert.match(rendered.profile, /Scheduled[\s\S]*42,000/);
  assert.doesNotMatch(`${rendered.screen}\n${rendered.profile}`, /Claimable|claim tokens|sign transaction/i);
});
