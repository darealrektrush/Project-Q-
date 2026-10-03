import { participantClearance, participantNextStep } from './participant-guidance.js?v=20260929-ia-1';

const ORACLE_LOGO = '/campaign-app/assets/oracle-logo.jpg';
const OCEAN_CONSERVATION_VAULT = 'J9J6MsSxicqmwTuzJGHitVUuUhRwP4iaDdTRgMAUDj4p';
const OCEAN_CONSERVATION_EXPLORER = `https://solscan.io/account/${OCEAN_CONSERVATION_VAULT}`;

const EXPLAINERS = {
  campaign: {
    eyebrow: 'Campaign guide',
    title: 'How campaigns work',
    description: 'Project Q turns eligible community activity into verified campaign progress, XP and transparent reward records.',
    items: [
      { icon: '01', title: 'Create & Vote', text: 'Participate in campaign activities, voting and community objectives.' },
      { icon: '02', title: 'Mission Verify', text: 'Complete missions and have eligible activity verified by Project Q or Oracle.' },
      { icon: '03', title: 'Trending Bots', text: 'Join approved community trending and engagement activity when available.' },
      { icon: '04', title: 'Earn to Burn', text: 'Verified participation contributes toward transparent ecosystem burn milestones.' },
    ],
  },
  xp: {
    eyebrow: 'XP guide', title: 'How XP works',
    description: 'XP records verified participation and campaign contribution.',
    items: [
      { icon: '01', title: 'Participate', text: 'Complete eligible campaign and community activity.' },
      { icon: '02', title: 'Verify', text: 'Project Q confirms accepted activity before XP is settled.' },
      { icon: '03', title: 'Build Progress', text: 'Settled campaign XP contributes to campaign standings. Crab Army XP and level are separate Oracle records.' },
    ],
  },
  ranks: {
    eyebrow: 'Standing guide', title: 'How campaign standings work',
    description: 'Your standing is your position on a Project Q campaign leaderboard. It is separate from your Crab Army rank.',
    items: [
      { icon: '01', title: 'Earn XP', text: 'Verified activity contributes to your cumulative progression.' },
      { icon: '02', title: 'Compare', text: 'Settled campaign XP determines your position under published campaign rules.' },
      { icon: '03', title: 'Keep Building', text: 'Oracle owns lifetime Crab Army XP and the one ecosystem rank.' },
    ],
  },
  rewards: {
    eyebrow: 'Rewards guide', title: 'How rewards work',
    description: 'Rewards are recorded, verified and released through auditable Project Q records.',
    items: [
      { icon: '01', title: 'Qualify', text: 'Meet campaign eligibility and identity requirements.' },
      { icon: '02', title: 'Allocate', text: 'Verified outcomes create a recorded reward allocation.' },
      { icon: '03', title: 'Release', text: 'Eligible allocations follow the campaign release schedule.' },
      { icon: '04', title: 'Receipt', text: 'Completed releases remain visible through transparent receipts.' },
    ],
  },
  leaderboard: {
    eyebrow: 'Leaderboard guide', title: 'How leaderboards work',
    description: 'Leaderboards show verified campaign contribution using eligible settled activity.',
    items: [
      { icon: '01', title: 'Verified Activity', text: 'Only accepted activity contributes to campaign scoring.' },
      { icon: '02', title: 'Campaign Views', text: 'Different boards can show overall, cycle or mission-specific contribution.' },
      { icon: '03', title: 'Eligibility', text: 'Campaign rules determine which participants and outcomes qualify.' },
    ],
  },
  universal: {
    eyebrow: 'Oracle Universal Profile', title: 'Your verified ecosystem identity',
    description: 'Oracle keeps one canonical identity behind the scenes while Project Q shows the human-readable profile you actually use.',
    items: [
      { icon: '01', title: 'One identity', text: 'Telegram, X and your verified wallet resolve back to one canonical Oracle profile.' },
      { icon: '02', title: 'Human-readable', text: 'Your public-facing identity uses your verified handle or display name rather than an internal database identifier.' },
      { icon: '03', title: 'Portable history', text: 'Crab Army rank, lifetime XP and verified ecosystem achievements can stay attached to this same identity across campaigns.' },
    ],
  },
  profile: {
    eyebrow: 'Identity guide', title: 'How your profile works',
    description: 'Your Project Q profile ties campaign activity to one verified identity.',
    items: [
      { icon: '01', title: 'Telegram', text: 'Your Telegram identity establishes your Project Q participant profile.' },
      { icon: '02', title: 'X', text: 'Oracle verifies the X account used for eligible social activity.' },
      { icon: '03', title: 'Wallet', text: 'One verified reward wallet is used for eligibility and distributions.' },
    ],
  },
  oracle: {
    eyebrow: 'Oracle guide', title: 'What Oracle does',
    description: 'Oracle is Project Q’s identity, verification and intelligence partner.',
    items: [
      { icon: '01', title: 'Identity', text: 'Maintains canonical X and wallet connections for campaign participation.' },
      { icon: '02', title: 'Verification', text: 'Supplies verified activity signals used by supported Project Q systems.' },
      { icon: '03', title: 'Intelligence', text: 'Provides ecosystem guidance and supporting campaign intelligence.' },
    ],
  },
};

const NAV = [
  ['home', 'Terminal'],
  ['operations', 'Operations'],
  ['record', 'Record'],
  ['rewards', 'Rewards'],
  ['profile', 'Profile'],
];

const NAV_ICONS = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10 12 3l9 7v11h-6v-7H9v7H3z"/></svg>',
  operations: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 12l2.2 2.2 4.8-5"/></svg>',
  record: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V9h4v11M10 20V5h4v15M15 20V12h4v8M3 20.5h18"/></svg>',
  rewards: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v11H4zM3 6.5h18V10H3zM12 6.5V21"/><path d="M12 6.5H8.7A2.7 2.7 0 1 1 12 3.2zm0 0h3.3A2.7 2.7 0 1 0 12 3.2z"/></svg>',
  profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"/></svg>',
};

const APP_TOUR_VERSION = 2;

const APP_TOUR_STEPS = [
  { screen: 'home', target: '[data-tour-target="home"]', icon: 'Q', title: 'Your Terminal', text: 'See the current operation and the next action you can take.' },
  { screen: 'operations', operationsView: 'missions', target: '[data-tour-target="operations"]', icon: 'OP', title: 'Choose a Mission', text: 'Mission Files live inside Operations. Browse objectives here, use Briefing for its rules and Economics for its pools.' },
  { screen: 'record', recordView: 'xp', target: '[data-tour-target="record"]', icon: 'R', title: 'Track Your Record', text: 'Review campaign XP, standing and verified activity. Rewards and identity have their own screens.' },
];

const WEBSITE_VOTE_FLOW_SESSION_KEY = 'project-q:website-vote-flow';
const RAIL_COLLAPSED_KEY = 'project-q:rail-collapsed';

const READINESS_GROUPS = [
  {
    id: 'foundation', label: 'Campaign foundation', number: '01',
    description: 'Rules, funding, registry evidence, certified sources, the locked five-cycle schedule and five pre-open draw commitments.',
    keys: ['rules', 'funding', 'registry', 'sources', 'dates', 'draw-commitments'],
  },
  {
    id: 'operations', label: 'Participation rails', number: '02',
    description: 'The Mini App, wallet ownership flow and XP settlement worker must be explicitly enabled.',
    keys: ['app', 'wallet', 'settlement'],
  },
  {
    id: 'burn', label: 'Earn to Burn', number: '03',
    description: 'Burn rules, the creator-wallet source, founders, milestones and on-chain verification remain separate.',
    keys: ['burn-rules', 'burn-progress', 'burn-verification'],
  },
];

const state = {
  screen: 'home',
  telegram: window.Telegram?.WebApp,
  wallet: null,
  walletStatus: {
    available: false, network: 'mainnet-beta', mint: null, tokenProgramId: null,
    decimals: 6, balanceBaseUnits: null, tokenAccountCount: 0, observedAt: null,
  },
  campaign: null,
  campaignRecord: null,
  runtime: null,
  runtimeLoadedAt: null,
  readiness: { available: false, ready: false, readyCount: 0, totalCount: 0, percent: null, checks: [] },
  burns: null,
  oceanVault: null,
  oceanProof: null,
  oceanReceipts: null,
  oceanRecognition: null,
  oceanRecognitionState: null,
  oceanDraftMode: null,
  oceanDraftAlias: null,
  oceanPreferenceError: null,
  oceanView: 'mission',
  community: { today: null, history: [], unavailable: true },
  xInvite: { verified: false, bonusAwarded: false, unavailable: true },
  missionEvidence: { available: false, oracleRaids: null, websiteVoting: null, trendingBots: null },
  websiteVotes: { available: false, enabled: false, generatedAt: null, sources: [] },
  telegramTrendingSources: [],
  websiteVoteFlow: null,
  referrals: {
    code: null, link: null,
    counts: { invited: 0, qualified: 0, bonusAwarded: 0 },
    bonusXp: null, minimumPurchaseUsd: 2, unavailable: true,
  },
  profileView: 'overview',
  operationsView: 'overview',
  missionFilter: 'all',
  recordView: 'xp',
  achievementView: 'overview',
  selectedAchievementId: null,
  pendingAchievementUnlock: null,
  activeMissionId: null,
  leaderboardView: 'overall',
  leaderboards: { overall: [], '48h': [], missions: [], trending: [], community: [], burn: [] },
  leaderboardMeta: null,
  profile: {
    name: telegramDisplayName(window.Telegram?.WebApp?.initDataUnsafe?.user),
    username: null,
    profileId: null,
    photoUrl: null,
    crabArmy: null,
    telegramVerified: false,
    xVerified: false,
    walletVerified: false,
    campaignReady: false,
    holderEligible: false,
    rewardEligible: false,
    holderEligibility: null,
    tokenAccountReady: false,
    tokenAccount: null,
    xp: 0,
    todayXp: 0,
    todayXpByBucket: { participation: 0, mission: 0, trending: 0, other: 0 },
    rank: '—',
    rankChange: null,
    percentile: 0,
    completedMissions: 0,
    allocation: null,
    allocationByCategory: {},
    rewards: { recorded: false, allocatedBaseUnits: null, scheduledBaseUnits: null,
      distributedBaseUnits: null, failedBaseUnits: null, releaseCount: 0, receiptCount: 0, releases: [] },
    campaignState: 'DRAFT',
    enrolledAt: null,
    xVerifiedAt: null,
    walletVerifiedAt: null,
    xpByCycle: [],
    xpByBucket: { participation: 0, mission: 0, trending: 0, other: 0 },
    buyToEarn: null,
    activity: [],
    achievements: [],
    achievementRecords: [],
    achievementRecordsAvailable: false,
  },
  sessionStatus: 'checking',
  walletManagedByOracle: true,
  websiteVoteReviewEnabled: false,
  preferences: { appTourVersion: 0, appTourCompletedAt: null },
  tour: { active: false, step: 0, source: 'auto' },
  navigationStack: ['home'],
};

const fallbackCampaign = {
  id: 'unavailable', name: 'Campaign Hub', shortName: 'Campaign', sequence: 'CAMPAIGN HUB',
  status: 'DISABLED', statusLabel: 'NO ACTIVE CAMPAIGN', tagline: 'Campaign data unavailable.',
  description: 'Project Q campaign records remain safely closed.',
  xpCaps: { overallDaily: 0, participationDaily: 0, projectQDaily: 0, trendingBotsDaily: 0 },
  releases: [], missions: [],
  stateArtwork: { DISABLED: '/campaign-app/assets/states/empty.webp' },
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function telegramDisplayName(user) {
  return [user?.firstName || user?.first_name, user?.lastName || user?.last_name]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ').trim() || user?.username || 'Duck Recruit';
}

function short(value) { return `${value.slice(0, 5)}…${value.slice(-5)}`; }
function isSolanaAddress(value) { return typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value); }
function isSolanaSignature(value) { return typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(value); }
function verifiedCount() {
  const p = state.profile;
  return [p.telegramVerified, p.xVerified, p.walletVerified].filter(Boolean).length;
}

function navMarkup() {
  return NAV.map(([id, label]) => `<button class="nav-button ${state.screen === id || (['burns', 'readiness'].includes(state.screen) && id === 'operations') || (state.screen === 'ocean' && id === 'home') ? 'active' : ''}" data-screen="${id}" data-tour-target="${id}" aria-label="${label}" title="${label}"><span class="nav-icon">${NAV_ICONS[id]}</span><span class="nav-label">${label}</span></button>`).join('');
}

function railCollapsedPreference() {
  try { return localStorage.getItem(RAIL_COLLAPSED_KEY) === 'true'; }
  catch { return false; }
}

function applyRailPreference(collapsed = railCollapsedPreference()) {
  document.body.classList.toggle('rail-collapsed', Boolean(collapsed));
  const toggle = document.querySelector('#rail-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
    toggle.textContent = collapsed ? '›' : '‹';
  }
}

function toggleRail() {
  const collapsed = !document.body.classList.contains('rail-collapsed');
  try { localStorage.setItem(RAIL_COLLAPSED_KEY, String(collapsed)); } catch {}
  applyRailPreference(collapsed);
}

function statePill(label, tone = 'pending') {
  return `<span class="state-pill ${tone}"><i></i>${escapeHtml(label)}</span>`;
}

function systemStatusMarkup() {
  const c = state.campaign || fallbackCampaign;

  if (c.id === 'unavailable') {
    return `<section class="system-status-banner blocked">
      <div><span>CONFIGURATION</span><b>Operation data unavailable</b><small>Project Q is keeping campaign actions closed until configuration can be loaded.</small></div>
      <button data-retry-system>Retry</button>
    </section>`;
  }

  if (state.sessionStatus === 'outside') {
    return `<section class="system-status-banner preview">
      <div><span>WEB PREVIEW</span><b>Viewing outside Telegram</b><small>Browse the interface here. Open Project Q from the official Telegram Mini App for verified identity and participation.</small></div>
    </section>`;
  }

  if (state.sessionStatus === 'error') {
    return `<section class="system-status-banner blocked">
      <div><span>IDENTITY SYNC</span><b>Participant session unavailable</b><small>Project Q could not confirm the Telegram session. No identity or reward state is being inferred.</small></div>
      <button data-retry-session>Retry</button>
    </section>`;
  }

  if (state.sessionStatus === 'identity-unavailable') {
    return `<section class="system-status-banner blocked">
      <div><span>IDENTITY SYNC</span><b>Telegram confirmed · campaign record pending</b><small>Your signed Telegram name is shown. Your photo appears if Telegram supplies it. Oracle identity and rewards are unavailable; participation remains closed.</small></div>
      <button data-retry-session>Retry</button>
    </section>`;
  }

  if (!state.runtime || !state.readiness?.available) {
    return `<section class="system-status-banner syncing">
      <div><span>CAMPAIGN SYNC</span><b>Live operation state is temporarily unavailable</b><small>Read-only content remains visible. Eligibility and campaign actions stay fail-closed until authoritative state returns.</small></div>
      <button data-retry-system>Retry</button>
    </section>`;
  }

  return '';
}

function runtimeNow() {
  const serverNow = Date.parse(state.runtime?.serverNow || '');
  if (!Number.isFinite(serverNow) || !state.runtimeLoadedAt) return Date.now();
  return serverNow + Math.max(0, Date.now() - state.runtimeLoadedAt);
}

function formatCountdown(targetAt, now = runtimeNow()) {
  const remaining = Date.parse(targetAt || '') - now;
  if (!Number.isFinite(remaining)) return 'Schedule unavailable';
  if (remaining <= 0) return 'Updating…';
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days) return `${days}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M`;
  return `${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`;
}

function runtimePill() {
  if (!state.runtime) return statePill('SYNCING', 'pending');
  const lifecycle = operationLifecycleState();
  return statePill(lifecycle.label, lifecycle.tone);
}

function operationScheduleDisplayLabel(campaign = state.campaign || fallbackCampaign, schedule = state.runtime?.schedule) {
  const configuredTarget = campaign.schedule?.activeOpensAt;
  if (schedule?.phase === 'PRE_LAUNCH' && !schedule.targetAt
      && Number.isFinite(Date.parse(configuredTarget || ''))
      && Date.parse(configuredTarget) > runtimeNow()) {
    const label = campaign.schedule?.activeLabel || `${formatOperationDate(configuredTarget)} target · readiness pending`;
    return `${label} · ${formatOperationTime(configuredTarget, campaign.schedule?.timeZone)}`;
  }
  return schedule?.label || 'Checking campaign schedule';
}

function campaignClockMarkup(campaign) {
  const runtime = state.runtime;
  const schedule = runtime?.schedule;
  if (!runtime || !schedule) {
    return '<section class="campaign-clock pending"><div><span>Campaign timeline</span><strong>Synchronizing</strong><small>Waiting for authoritative Project Q state</small></div></section>';
  }
  const cycle = Number(schedule.currentCycle || 0);
  const cycleCount = Number(campaign.schedule?.cycles?.length || 5);
  const targetIsFuture = Number.isFinite(Date.parse(campaign.schedule?.activeOpensAt || ''))
    && Date.parse(campaign.schedule.activeOpensAt) > runtimeNow();
  const awaitingTargetApproval = schedule.phase === 'PRE_LAUNCH' && !schedule.targetAt && targetIsFuture;
  const completedCycles = schedule.phase === 'ACTIVE' ? Math.max(0, cycle - 1)
    : ['HANDOFF', 'REVIEW', 'REVIEW_EXTENSION', 'POST_REVIEW'].includes(schedule.phase) ? cycleCount : 0;
  const countdown = schedule.targetAt ? formatCountdown(schedule.targetAt)
    : schedule.phase === 'POST_REVIEW' ? 'Review complete'
      : awaitingTargetApproval ? 'Target awaiting approval'
        : schedule.phase === 'PRE_LAUNCH' ? 'Dates pending' : 'Schedule unavailable';
  const detail = schedule.phase === 'ACTIVE' && !runtime.operational
    ? 'Calendar window reached · operations remain closed until every activation gate passes'
    : schedule.phase === 'ACTIVE'
      ? `Verified activity cycle ${cycle} of ${cycleCount}`
      : schedule.phase === 'PRE_LAUNCH'
        ? `${campaign.schedule?.activeLabel || 'Final dates pending · 10 active days'} · ${formatOperationTime(campaign.schedule?.activeOpensAt, campaign.schedule?.timeZone)}`
        : schedule.phase === 'HANDOFF'
          ? 'Campaign close reconciliation before final review'
          : ['REVIEW', 'REVIEW_EXTENSION'].includes(schedule.phase)
            ? `${campaign.schedule?.reviewLabel || '48–72 hours after campaign handoff'} · verification in progress`
            : 'Post-review release records become the source of truth';
  const dots = Array.from({ length: cycleCount }, (_, index) => {
    const number = index + 1;
    const status = number <= completedCycles ? 'complete' : number === cycle ? 'current' : '';
    return `<i class="${status}" title="Cycle ${number}">${number}</i>`;
  }).join('');
  const scheduleLabel = awaitingTargetApproval ? operationScheduleDisplayLabel(campaign, schedule) : schedule.label;
  return `<section class="campaign-clock ${escapeHtml(runtime.tone || 'pending')}"><div class="clock-copy"><span>${escapeHtml(awaitingTargetApproval ? 'Campaign target awaiting approval' : scheduleLabel)}</span><strong data-countdown data-target-at="${escapeHtml(schedule.targetAt || '')}" data-empty-label="${escapeHtml(countdown)}">${escapeHtml(countdown)}</strong><small>${escapeHtml(detail)}</small></div><div class="cycle-rail" aria-label="${cycleCount} campaign cycles">${dots}</div></section>`;
}

function updateCountdownLabels() {
  document.querySelectorAll('[data-countdown]').forEach((element) => {
    element.textContent = element.dataset.targetAt
      ? formatCountdown(element.dataset.targetAt) : element.dataset.emptyLabel || 'Schedule unavailable';
  });
}

function readinessGroupMarkup(group, checks) {
  const groupChecks = group.keys.map((key) => checks.find((check) => check.key === key)).filter(Boolean);
  const complete = groupChecks.length > 0 && groupChecks.every(({ ready }) => ready);
  const passed = groupChecks.filter(({ ready }) => ready).length;
  return `<article class="launch-group ${complete ? 'complete' : 'pending'}"><header><span>${escapeHtml(group.number)}</span><div><small>${escapeHtml(group.id)}</small><h3>${escapeHtml(group.label)}</h3><p>${escapeHtml(group.description)}</p></div>${statePill(complete ? 'VERIFIED' : `${passed}/${groupChecks.length} READY`, complete ? 'success' : 'pending')}</header><div class="launch-gates">${groupChecks.map(({ key, label, ready }) => `<div class="${ready ? 'complete' : 'pending'}" data-readiness-key="${escapeHtml(key)}"><i>${ready ? '✓' : '○'}</i><span>${escapeHtml(label)}</span><b>${ready ? 'Verified' : 'Pending'}</b></div>`).join('')}</div></article>`;
}

function readinessBlockersMarkup(checks = []) {
  const pending = checks.filter(({ ready }) => !ready);
  if (!pending.length) return '<section class="readiness-blocker-summary complete"><div><span>LAUNCH BLOCKERS</span><b>None in the public readiness report</b><p>Every public gate is verified. Founder activation approval remains a separate control.</p></div></section>';
  const guidance = {
    rules: ['FINALIZE RULES', 'Review and hash-match the final Bond ruleset.'],
    funding: ['VERIFY FUNDING', 'Record the verified 17.5M FAWKQ Squads campaign commitment.'],
    registry: ['COMPLETE REGISTRY', 'Finalize the deployment, vault and treasury registry evidence.'],
    sources: ['CERTIFY SOURCES', 'Certify all configured voting sites and trending bots with current evidence.'],
    dates: ['LOCK SCHEDULE', 'Keep all five 48-hour cycles valid for the approved launch window.'],
    'draw-commitments': ['COMMIT DRAWS', 'Record all five pre-open deterministic draw commitments.'],
    app: ['ENABLE APP', 'Enable the campaign application rail in the launch environment.'],
    wallet: ['ENABLE WALLET EVENTS', 'Enable verified Oracle wallet events for campaign eligibility.'],
    settlement: ['ENABLE SETTLEMENT', 'Enable campaign XP settlement only after launch rails are verified.'],
    'burn-rules': ['PROVISION BURN', 'Provision approved creator-wallet source, founders and milestone rules.'],
    'burn-progress': ['ENABLE BURN PROGRESS', 'Enable Earn-to-Burn progress after its rules are provisioned.'],
    'burn-verification': ['ENABLE BURN VERIFICATION', 'Enable on-chain burn verification after rehearsal passes.'],
  };
  return `<section class="readiness-blocker-summary"><header><div><span>LAUNCH BLOCKERS</span><b>${pending.length} public ${pending.length === 1 ? 'gate' : 'gates'} remaining</b></div><small>Fail-closed until verified</small></header><div class="readiness-blocker-list">${pending.map((check) => {
    const [title, detail] = guidance[check.key] || ['REVIEW GATE', check.label];
    return `<article><i>○</i><div><b>${escapeHtml(title)}</b><p>${escapeHtml(detail)}</p><small>${escapeHtml(check.label)}</small></div></article>`;
  }).join('')}</div></section>`;
}

function readinessScreen() {
  const c = state.campaign || fallbackCampaign;
  const readiness = state.readiness || {};
  const available = Boolean(readiness.available && readiness.totalCount);
  const percent = available ? Math.max(0, Math.min(100, Number(readiness.percent || 0))) : 0;
  const checks = Array.isArray(readiness.checks) ? readiness.checks : [];
  const reportHash = /^[0-9a-f]{64}$/.test(readiness.reportHash || '') ? readiness.reportHash : null;
  const launchState = readiness.ready ? 'READY FOR FOUNDER REVIEW' : available ? 'LAUNCH BLOCKED' : 'STATE UNAVAILABLE';
  const launchTone = readiness.ready ? 'success' : 'pending';
  const groups = available
    ? READINESS_GROUPS.map((group) => readinessGroupMarkup(group, checks)).join('')
    : '<section class="command-card launch-unavailable"><b>No launch state is being inferred.</b><p>Project Q will retry the authoritative readiness service. Every operational action remains disabled.</p></section>';
  return `<section class="launch-command command-card"><div><span class="label">Operation 01 · Public launch readiness</span><h2>${launchState}</h2><p>${available ? `${Number(readiness.readyCount)} of ${Number(readiness.totalCount)} public gates are verified.` : 'The readiness service is unavailable.'} The campaign cannot open from this screen.</p>${statePill(launchState, launchTone)}</div><img src="/campaign-app/assets/system/q-campaigns.webp" alt="Project Q campaigns" /></section>
  <section class="launch-progress command-card"><div><span>Public readiness</span><strong>${available ? `${percent}%` : '—'}</strong></div><div class="progress" role="progressbar" aria-label="Public launch readiness" aria-valuemin="0" aria-valuemax="100" ${available ? `aria-valuenow="${percent}"` : ''}><span style="width:${percent}%"></span></div><small>${readiness.ready ? 'All public gates verified. Two founder approvals are still required for activation.' : 'Fail-closed until every required gate passes.'}</small></section>
  ${available ? readinessBlockersMarkup(checks) : ''}
  <div class="section-head compact-head"><div><span class="label">Launch sequence</span><h2>Three controlled layers</h2></div><span>Evidence-bound</span></div>
  <section class="launch-groups">${groups}</section>
  <div class="section-head"><div><span class="label">Campaign commitments</span><h2>Separated by purpose</h2></div><span>No overlapping allocations</span></div>
  <button class="outline-action" data-operation-view="economics">SEE OPERATION ECONOMICS →</button>
  <section class="readiness-fingerprint command-card"><div><span class="label">Readiness fingerprint</span><h3>${reportHash ? 'Exact reviewed state' : 'Report unavailable'}</h3><p>${reportHash ? 'This SHA-256 fingerprint changes whenever the readiness evidence or an operational gate changes.' : 'A fingerprint appears only when Project Q can build the authoritative readiness report.'}</p></div><code>${reportHash || 'No report hash available'}</code><small>${escapeHtml(readiness.reportVersion || 'readiness report pending')}</small></section>
  <section class="launch-safety"><img src="/campaign-app/assets/project-q-mark-20260929.jpg" alt="" /><div><b>Founder approval remains outside this public screen.</b><p>Project Q may calculate, verify and publish status. It cannot activate the campaign, hold a treasury signer or execute a transfer from this interface.</p></div></section>
  <button class="outline-action launch-back" data-operation-view="overview">← Back to Briefing</button>`;
}

function metric(label, value, detail = '') {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${value}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}</div>`;
}

function progressRow(label, value, cap) {
  const safeValue = Math.max(0, Number(value || 0));
  const safeCap = Math.max(0, Number(cap || 0));
  const percent = safeCap ? Math.min(100, Math.round((safeValue / safeCap) * 100)) : 0;
  return `<div class="progress-row"><div><span>${escapeHtml(label)}</span><b>${safeValue} / ${safeCap}</b></div><div class="progress"><span style="width:${percent}%"></span></div></div>`;
}

function identityStep(label, ok, active = false) {
  return `<span class="identity-step ${ok ? 'complete' : (active ? 'current' : '')}"><i>${ok ? '✓' : '○'}</i>${escapeHtml(label)}</span>`;
}

function identityStepper() {
  const p = state.profile;
  return `<div class="identity-stepper" aria-label="Identity verification progress">${identityStep('Telegram', p.telegramVerified, !p.telegramVerified)}<span class="step-line"></span>${identityStep('X', p.xVerified, p.telegramVerified && !p.xVerified)}<span class="step-line"></span>${identityStep('Wallet', p.walletVerified, p.telegramVerified && p.xVerified && !p.walletVerified)}</div>`;
}

function nextIdentityAction() {
  const p = state.profile;
  if (state.sessionStatus === 'identity-unavailable') return 'Sync Oracle identity';
  if (!p.telegramVerified) return 'Verify Telegram';
  if (!p.xVerified) return 'Connect Oracle X';
  if (!p.walletVerified) return 'Connect wallet in Oracle';
  return 'Open missions';
}

function nextStatusCard() {
  const p = state.profile;
  if (state.sessionStatus === 'identity-unavailable') {
    return `<article class="next-status oracle"><img src="${ORACLE_LOGO}" alt="Oracle" /><div><span>Next status</span><b>Sync Oracle identity</b><small>Telegram is confirmed. The campaign record is temporarily unavailable.</small></div><button class="outline-action" data-retry-session>Retry</button></article>`;
  }
  if (!p.telegramVerified) {
    return `<article class="next-status"><img src="/campaign-app/assets/identity/telegram-verified.webp" alt="" /><div><span>Next status</span><b>Verify Telegram</b><small>Open Project Q from the official bot.</small></div><button class="outline-action" data-screen="profile">Review</button></article>`;
  }
  if (!p.xVerified) {
    if (!state.runtime?.oracleBotUrl) {
      return `<article class="next-status oracle"><img src="${ORACLE_LOGO}" alt="Oracle" /><div><span>Next status</span><b>Oracle Dev setup pending</b><small>X connection will open here when the isolated Oracle flow is ready.</small></div><button class="outline-action" data-screen="profile">Review</button></article>`;
    }
    return `<article class="next-status oracle"><img src="${ORACLE_LOGO}" alt="Oracle" /><div><span>Next status</span><b>Connect Oracle X</b><small>Verify your X identity to unlock social missions.</small></div><button class="outline-action" id="oracle-home-link">Connect</button></article>`;
  }
  if (!p.walletVerified) {
    return `<article class="next-status oracle"><img src="${ORACLE_LOGO}" alt="Oracle" /><div><span>Next status</span><b>Verify wallet in Oracle</b><small>Oracle owns the single canonical payout-wallet connection.</small></div><button class="outline-action" data-screen="profile">Open profile</button></article>`;
  }
  return `<article class="next-status"><img src="/campaign-app/assets/system/q-campaigns.webp" alt="" /><div><span>Identity ready</span><b>Choose your next mission</b><small>Every accepted action settles into one Project Q record.</small></div><button class="outline-action" data-operation-view="missions">Open</button></article>`;
}

function home() {
  const p = state.profile;
  const c = state.campaign || fallbackCampaign;
  const op = operationNumber();
  const nextMove = currentNextStep();
  const actionAttrs = nextStepActionAttrs(nextMove);

  const schedule = state.runtime?.schedule;
  const target = schedule?.targetAt ? Date.parse(schedule.targetAt) : null;
  const hasTarget = Number.isFinite(target);
  const diff = hasTarget ? Math.max(0, target - runtimeNow()) : 0;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const countdownState = !state.runtime
    ? 'SYNCING'
    : !hasTarget
      ? schedule?.phase === 'PRE_LAUNCH'
        ? 'TARGET PENDING'
        : schedule?.phase === 'POST_REVIEW'
          ? 'REVIEW COMPLETE'
          : 'SCHEDULE PENDING'
      : diff <= 0
        ? 'UPDATING'
        : null;

  const bondArtwork = c.id === 'bond-the-duck-2026';
  const globe = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/></svg>';
  const xIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2h5l13 20h-5L3 2ZM21 2 3 22"/></svg>';
  const identitySymbol = !p.telegramVerified
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 11 20-8-4 19-6-7-4 4v-6l10-7-12 6z"/></svg>'
    : !p.xVerified ? xIcon : !p.walletVerified ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h17v15H3zM3 6V3h14v3M15 11h6v5h-6z"/></svg>' : NAV_ICONS.operations;
  return `<div class="terminal-ui terminal-mobile-reference terminal-v2">
    <section class="terminal-v2-campaign" aria-label="${escapeHtml(c.name)}">
      ${bondArtwork
        ? '<figure class="reference-art reference-hero"><img src="/campaign-app/assets/bond-the-duck-terminal-hero-20260927.jpg" alt="Bond the Duck. 10-day verified. Small actions, bigger oceans. The tide rises together." /></figure>'
        : c.banner ? `<figure class="terminal-campaign-art"><img src="${escapeHtml(c.banner)}" alt="${escapeHtml(c.bannerAlt || c.name)}" /></figure>` : ''}
      <div class="operation-summary">
        <div class="operation-summary-heading"><strong>OPERATION ${op}</strong>${terminalOperationPill()}</div>
        <div class="operation-summary-body">
          ${countdownState
            ? `<div class="terminal-countdown-state"><strong>${escapeHtml(countdownState === 'TARGET PENDING' ? 'TARGET AWAITING APPROVAL' : countdownState)}</strong><small>${escapeHtml(operationScheduleDisplayLabel(c, schedule))}</small></div>`
            : `<div class="terminal-countdown-strip" aria-label="Campaign countdown">${[[days,'DAYS'],[hours,'HOURS'],[minutes,'MINS'],[seconds,'SECS']].map(([value,label]) => `<div><strong>${String(value).padStart(2,'0')}</strong><span>${label}</span></div>`).join('')}</div>`}
          <div class="operation-impact-categories">${globe}<span>PEOPLE<br />COMMUNITY<br />DEFI<br />OCEAN IMPACT</span></div>
        </div>
      </div>
    </section>
    <section class="terminal-next-step ${nextMove.brand === 'oracle' ? 'oracle-next' : ''}">
      <div class="terminal-identity-art"><span class="identity-channel">${identitySymbol}</span>${nextMove.brand === 'oracle' ? `<img src="${ORACLE_LOGO}" alt="Oracle" />` : '<img src="/campaign-app/assets/project-q-mark-20260929.jpg" alt="Project Q" />'}</div>
      <div><span>${escapeHtml(nextMove.label)}</span><b>${escapeHtml(nextMove.title)}</b><small>${escapeHtml(nextMove.detail)}</small></div>
      <button ${actionAttrs}>${escapeHtml(nextMove.action)} <span aria-hidden="true">→</span></button>
    </section>
    ${terminalSnapshotMarkup()}
    <button class="terminal-ocean-banner ocean-impact-entry" data-screen="ocean" aria-label="Explore the CrabStar Ocean Impact mission"><img src="/campaign-app/assets/crabstar-ocean-impact-card-20260929.jpg" alt="CrabStar Ocean Impact. Cleaner oceans. Brighter tomorrows. Community-powered conservation. Explore the mission." /></button>
  </div>`;
}

function missionTelemetry(mission) {
  const evidence = state.missionEvidence;
  const lane = {
    'oracle-raids': evidence?.oracleRaids,
    'website-voting': evidence?.websiteVoting,
    'trending-bots': evidence?.trendingBots,
  }[mission.id];
  if (evidence?.available && lane) {
    const target = Number(lane.target || 0);
    const pushPoints = Number(lane.pushPoints || 0);
    return {
      detail: mission.id === 'trending-bots'
        ? `${pushPoints} pushes · ${Number(lane.verified || 0)} / ${target} bots`
        : (target ? `${Number(lane.verified || 0)} / ${target} verified` : `${Number(lane.verified || 0)} verified`),
      verified: Number(lane.verified || 0),
      pending: Number(lane.pending || 0),
      rejected: Number(lane.rejected || 0),
      target,
      pushPoints,
    };
  }
  if (mission.id === 'participation-xp') {
    return { detail: `${Number(state.profile.todayXp || 0)} / ${Number(state.campaign?.xpCaps?.overallDaily || 0)} XP today` };
  }
  if (mission.id === 'community-pulse' && state.community?.today) {
    return { detail: `${Number(state.community.today.xp_awarded || 0)} XP today · ${state.community.today.eligible ? 'qualified' : 'in progress'}` };
  }
  if (mission.id === 'verified-referrals' && !state.referrals?.unavailable) {
    return { detail: `${Number(state.referrals.counts?.qualified || 0)} qualified · ${Number(state.referrals.counts?.invited || 0)} invited` };
  }
  if (mission.id === 'buy-to-earn' && state.profile.buyToEarn) {
    return { detail: state.profile.buyToEarn.eligible ? `Tier ${Number(state.profile.buyToEarn.tier || 0)} eligible` : 'Position tracked · review pending' };
  }
  if (mission.id === 'earn-to-burn' && state.burns && !state.burns.unavailable) {
    return { detail: `${Number(state.burns.burnCount || 0)} public burn receipts` };
  }
  return null;
}

function campaignEligibilityRequirements() {
  return participantClearance(state.profile, (state.campaign || fallbackCampaign).eligibility);
}

function currentNextStep() {
  return participantNextStep({ profile: state.profile, eligibility: (state.campaign || fallbackCampaign).eligibility,
    lifecycle: operationLifecycleState().label, sessionStatus: state.sessionStatus,
    oracleAvailable: Boolean(state.runtime?.oracleBotUrl) });
}

function nextStepActionAttrs(next) {
  if (next.retry) return 'data-retry-session';
  if (next.screen === 'operations') return `data-operation-view="${next.operationsView || 'overview'}"`;
  if (next.screen === 'profile') return `data-profile-view="${next.profileView || 'overview'}"`;
  return `data-screen="${next.screen}"`;
}

function clearanceCountLabel() {
  const checks = campaignEligibilityRequirements();
  return `${checks.filter(item => item.complete).length}/${checks.length}`;
}

function terminalSnapshotMarkup() {
  const p = state.profile;
  return `<section class="terminal-snapshot" aria-label="Your snapshot"><header><span>YOUR SNAPSHOT</span><b>${escapeHtml(p.name)}</b></header><div>
    <article><span>Clearance</span><strong>${clearanceCountLabel()}</strong></article>
    <article><span>Operation XP</span><strong>${Number(p.xp || 0).toLocaleString()}</strong></article>
    <article><span>Standing</span><strong>${escapeHtml(p.rank && p.rank !== '—' ? p.rank : 'UNRANKED')}</strong></article>
  </div></section>`;
}

function actionableMissionFiles() {
  return (state.campaign?.missions || []).filter(({ id }) => !['participation-xp', 'earn-to-burn'].includes(id));
}

function campaignClearanceReady() {
  return campaignEligibilityRequirements().every(({ complete }) => complete);
}

function clearanceMarkup() {
  const checks = campaignEligibilityRequirements();
  const complete = checks.filter(item => item.complete).length;
  const oracleAvailable = Boolean(state.runtime?.oracleBotUrl && state.profile.telegramVerified);
  const nativeConnectionReady = Boolean(state.profile.telegramVerified && state.telegram?.initData);
  const hasWalletChecks = checks.some(({ key }) => ['wallet', 'token-account', 'holder'].includes(key));
  return `<section class="clearance-panel profile-clearance"><div class="clearance-head"><div><span>CLEARANCE</span><h3>${complete === checks.length ? 'Ready for eligible missions' : 'Complete your operation setup'}</h3></div><b>${complete}/${checks.length}</b></div>
    <div class="dossier-clearance-track">${checks.map(item => `<i class="${item.complete ? 'complete' : ''}"></i>`).join('')}</div>
    <div class="clearance-list">${checks.map(item => {
      const actionLabel = item.key === 'x' ? 'CONNECT X'
        : item.key === 'wallet' ? 'VERIFY WALLET'
          : item.action === 'wallet' ? 'REFRESH'
            : 'OPEN TELEGRAM';
      return `<article class="clearance-row ${item.complete ? 'complete' : 'incomplete'}"><i>${item.complete ? '✓' : '○'}</i><div><b>${escapeHtml(item.label)}</b><small>${item.complete ? 'Verified' : escapeHtml(['x','wallet-verify'].includes(item.action) && !nativeConnectionReady ? 'Open Project Q from Telegram to continue.' : item.detail)}</small></div>${item.complete ? '' : `<button data-clearance-action="${item.action}" ${['x','wallet-verify'].includes(item.action) && !nativeConnectionReady ? 'disabled' : ''}>${actionLabel} →</button>`}</article>`;
    }).join('')}</div>
    <small class="clearance-observation">${hasWalletChecks ? 'One connected setup: verify X and your reward wallet through Oracle once. Project Q then checks the FAWKQ token account and minimum holding automatically from that same wallet.' : 'One connected setup: complete only the identity requirements configured for this operation.'}</small>
  </section>`;
}

function missionLockReason(mission) {
  const lifecycle = operationLifecycleState();

  if (lifecycle.label !== 'ACTIVE') {
    const copy = lifecycle.label === 'UPCOMING'
      ? ['Operation has not opened this mission yet', 'Wait for operation activation', 'Operation activation']
      : lifecycle.label === 'LAUNCH BLOCKED'
        ? ['Launch gates are not cleared', 'Review operation status', 'Launch clearance']
        : lifecycle.label === 'REVIEWING'
          ? ['Campaign scoring is closed for final review', 'Follow final review', 'Final review']
          : lifecycle.label === 'DISTRIBUTING'
            ? ['Campaign scoring is closed', 'Track reward delivery', 'Reward distribution']
            : ['Mission is not open in this operation state', 'Review operation record', lifecycle.label];
    return { title: copy[0], action: copy[1], remains: copy[2] };
  }

  if (!mission.enabled) {
    return {
      title: 'Mission is currently unavailable',
      action: 'Review operation status',
      remains: 'Mission availability',
    };
  }

  if (!campaignClearanceReady()) {
    const next = campaignEligibilityRequirements().find(({ complete }) => !complete);
    return {
      title: next ? `${next.label} incomplete` : 'Campaign clearance incomplete',
      action: next?.action?.label || 'Complete campaign clearance',
      remains: next?.label || 'Campaign clearance',
    };
  }

  return null;
}

function canonicalMissionState(mission, telemetry) {
  const verified = Number(telemetry?.verified || 0);
  const pending = Number(telemetry?.pending || 0);
  const rejected = Number(telemetry?.rejected || 0);
  const target = Number(telemetry?.target || 0);

  if (mission.id === 'website-voting') {
    const sourceStates = (state.websiteVotes?.sources || []).map(({ status }) => status);
    if (state.websiteVoteFlow?.attempt || sourceStates.includes('IN_PROGRESS')) {
      return { label: 'IN PROGRESS', tone: 'ready' };
    }
    if (sourceStates.includes('PENDING_REVIEW')) {
      return { label: 'SUBMITTED', tone: 'pending' };
    }
    if (sourceStates.length && sourceStates.every((status) => ['ON_COOLDOWN','COMMUNITY_ONLY','SOURCE_UNAVAILABLE','PENDING_CERTIFICATION'].includes(status))) {
      return { label: 'COOLDOWN', tone: 'pending' };
    }
  }

  if (target > 0 && verified >= target) return { label: 'COMPLETE', tone: 'success' };
  if (verified > 0) return { label: 'VERIFIED', tone: 'success' };
  if (pending > 0) return { label: 'VERIFYING', tone: 'pending' };
  if (rejected > 0 && verified === 0 && pending === 0) return { label: 'REJECTED', tone: 'blocked' };

  if (mission.kind === 'COLLECTIVE') {
    return operationLifecycleState().label === 'ACTIVE'
      ? { label: 'COLLECTIVE', tone: 'pending' }
      : { label: 'LOCKED', tone: 'pending' };
  }

  if (operationLifecycleState().label === 'ACTIVE' && mission.enabled && campaignClearanceReady()) {
    return { label: 'AVAILABLE', tone: 'ready' };
  }

  return { label: 'LOCKED', tone: 'pending' };
}

function missionCard(mission) {
  const oracle = mission.id === 'oracle-raids';
  const collective = mission.kind === 'COLLECTIVE';
  const image = mission.image;
  const visual = image
    ? `<img class="mission-art ${oracle ? 'oracle-art' : ''}" src="${image}" alt="" loading="lazy" decoding="async" />`
    : `<div class="mission-icon">${escapeHtml(mission.icon || 'Q')}</div>`;
  const telemetry = missionTelemetry(mission);
  const missionState = canonicalMissionState(mission, telemetry);
  const status = missionState.label;
  const tone = missionState.tone;
  const action = mission.enabled ? (mission.id === 'buy-to-earn' ? 'VIEW' : 'OPEN') : 'DETAILS';
  const evidenceLine = telemetry && ('verified' in telemetry)
    ? `<span class="mission-evidence"><i>${Number(telemetry.verified || 0)} verified</i>${mission.id === 'trending-bots' ? `<i>${Number(telemetry.pushPoints || 0)} pushes</i>` : ''}<i>${Number(telemetry.pending || 0)} pending</i><i class="rejected">${Number(telemetry.rejected || 0)} rejected</i></span>`
    : '';
  return `<button class="mission-card ${oracle ? 'oracle-mission' : ''} ${collective ? 'collective' : ''}" data-mission-id="${escapeHtml(mission.id)}">${visual}<span class="mission-copy"><span class="mission-title"><b>${escapeHtml(mission.title)}</b>${statePill(status, tone)}</span><small>${escapeHtml(mission.description)}</small><span class="mission-meta"><em>${escapeHtml(mission.reward)}</em><span>${escapeHtml(telemetry?.detail || mission.status)}</span></span>${evidenceLine}</span><span class="mission-action">${action}</span></button>`;
}

function missionsScreen() {
  return operationMissionsMarkup(state.campaign || fallbackCampaign);
}

function communityPulsePanel() {
  const pulse = state.community?.today;
  if (!pulse) {
    return `<section class="command-card community-pulse"><div class="community-pulse-head"><div><span class="label">Community Pulse · Daily</span><h2>Meaningful activity, not message farming.</h2></div>${statePill('READINESS')}</div><p>Qualify with 5 useful messages across 3 separate 30-minute windows, at least 2 genuine replies and a 2-hour activity span.</p><small>Commands, bots, repeated text and low-content messages do not count. Project Q stores a content fingerprint, not raw message text.</small></section>`;
  }
  return `<section class="command-card community-pulse"><div class="community-pulse-head"><div><span class="label">Community Pulse · ${escapeHtml(pulse.local_day)}</span><h2>${pulse.eligible ? 'Daily activity qualified' : 'Keep contributing naturally'}</h2></div>${statePill(`${Number(pulse.xp_awarded || 0)} XP`, pulse.eligible ? 'success' : 'pending')}</div><div class="pulse-stats">${metric('Messages', Number(pulse.qualifying_messages || 0), '5 minimum')}${metric('Windows', Number(pulse.distinct_windows || 0), '3 minimum')}${metric('Replies', Number(pulse.reply_count || 0), '2 minimum')}${metric('Span', `${Number(pulse.activity_span_minutes || 0)}m`, '120m minimum')}${metric('Rank', pulse.daily_rank ? `#${Number(pulse.daily_rank)}` : '—', 'Daily')}</div></section>`;
}

function activityRow(item) {
  const oracle = String(item.label || '').toLowerCase().includes('oracle');
  return `<article class="ledger-row record-receipt-row">
    <span class="ledger-icon ${oracle ? 'oracle' : ''}">${oracle ? `<img src="${ORACLE_LOGO}" alt="Oracle" />` : escapeHtml(item.icon || 'Q')}</span>
    <div class="record-receipt-copy">
      <span>PROJECT Q // XP RECORD</span>
      <b>${escapeHtml(item.label)}</b>
      <small>${escapeHtml(item.timestamp)}</small>
    </div>
    <strong>+${Number(item.xp || 0)} XP</strong>
    ${statePill('VERIFIED', 'success')}
  </article>`;
}

function achievementDefinitions() {
  const campaign = state.campaign || fallbackCampaign;
  return [...(campaign.xpBadges || []), ...(campaign.leaderboardBadges || [])]
    .filter((item, index, all) => item?.id && all.findIndex((other) => other.id === item.id) === index)
    .map((item) => ({
      ...item,
      collection: item.collection || (item.id.startsWith('top-') || item.id === 'champion' ? 'standings' : 'xp'),
      criteriaState: item.criteriaState || 'CLASSIFIED',
    }));
}

function achievementRecordById() {
  return new Map((state.profile.achievementRecords || [])
    .filter((record) => record?.achievementId && record.verificationState === 'VERIFIED')
    .map((record) => [record.achievementId, record]));
}

function achievementOperationLabel(value) {
  const match = String(value || '').match(/operation[-_ ]?(\d+)/i);
  return match ? `Operation ${String(match[1]).padStart(2, '0')}` : String(value || 'Campaign');
}

function detectNewAchievementUnlock(profileId, records) {
  if (!profileId || !Array.isArray(records)) return null;
  const verified = records.filter((record) => record?.recordId && record.verificationState === 'VERIFIED');
  const ids = verified.map((record) => String(record.recordId));
  const key = `project-q:achievement-seen:${profileId}`;
  let knownIds;
  try {
    const stored = localStorage.getItem(key);
    knownIds = stored === null ? null : new Set(JSON.parse(stored));
    localStorage.setItem(key, JSON.stringify(ids.slice(0, 500)));
  } catch {
    return null;
  }
  if (!knownIds) return null;
  const newlyEarned = verified.filter((record) => !knownIds.has(String(record.recordId)))
    .sort((a,b) => new Date(b.awardedAt || 0) - new Date(a.awardedAt || 0));
  return newlyEarned.length ? { record: newlyEarned[0], additionalCount: newlyEarned.length - 1 } : null;
}

function achievementProgress(badge) {
  const record = achievementRecordById().get(badge.id);
  if (record) return {
    state: 'earned', label: 'VERIFIED · EARNED', detail: badge.description || 'Verified achievement',
    progress: 100, record, current: null, remaining: null,
  };
  if (badge.criteriaState === 'CLASSIFIED' || !badge.criteriaVersion) return {
    state: 'classified', label: 'CLASSIFIED',
    detail: 'Unlock criteria will be published when this achievement is ready.',
    progress: null, record: null, current: null, remaining: null,
  };
  if (badge.id === 'xp-earned') {
    const hasSettledXp = state.sessionStatus === 'verified' && Number(state.profile.xp || 0) > 0;
    return hasSettledXp ? {
      state: 'pending', label: 'RECORD SYNCING',
      detail: 'Settled XP is present. The verified achievement receipt is still syncing.',
      progress: null, record: null, current: null, remaining: null,
    } : {
      state: 'locked', label: state.sessionStatus === 'verified' ? 'NOT STARTED' : 'SYNC REQUIRED',
      detail: 'Complete your first eligible action and wait for its XP to settle.',
      progress: 0, record: null, current: null, remaining: null,
    };
  }
  const phase = String(state.runtime?.phase || state.runtime?.schedule?.phase || '').toUpperCase();
  const live = ['ACTIVE', 'PAUSED', 'VERIFYING'].includes(phase);
  const finalized = ['DISTRIBUTING', 'COMPLETED', 'ARCHIVED'].includes(String(state.profile.campaignState || '').toUpperCase());
  const view = state.leaderboardMeta?.overall;
  const rank = Number(view?.participantRank);
  const count = Number(view?.participantCount);
  if (badge.verificationSource === 'finalized_campaign_standings' && finalized) return {
    state: 'pending', label: 'FINAL RECORD PENDING',
    detail: 'Finalized standings are required before this achievement can be recorded.',
    progress: null, record: null, current: null, remaining: null,
  };
  if (badge.verificationSource === 'finalized_campaign_standings' && live && view?.available && rank > 0 && count > 0) {
    const currentPercent = (rank / count) * 100;
    if (Number.isFinite(Number(badge.rankPercent))) {
      const target = Number(badge.rankPercent);
      const progress = Math.max(0, Math.min(100, Math.round((target / Math.max(target, currentPercent)) * 100)));
      const roundedCurrent = Math.max(1, Math.ceil(currentPercent - 1e-9));
      return {
        state: currentPercent <= target ? 'provisional' : 'in-progress',
        label: currentPercent <= target ? 'LIVE · PROVISIONAL' : 'IN PROGRESS',
        detail: currentPercent <= target
          ? `Currently around the top ${roundedCurrent}%. Final review confirms the result.`
          : `Currently around the top ${roundedCurrent}%; ${Math.max(0, roundedCurrent - target)} percentage points to the top ${target}%. Rankings can move.`,
        progress, record: null, current: `Top ${roundedCurrent}%`, remaining: `${Math.max(0, roundedCurrent - target)} pp`,
      };
    }
    if (Number.isSafeInteger(Number(badge.rankPosition))) {
      const target = Number(badge.rankPosition);
      const progress = Math.max(0, Math.min(100, Math.round((target / Math.max(target, rank)) * 100)));
      return {
        state: rank <= target ? 'provisional' : 'in-progress',
        label: rank <= target ? 'LIVE · PROVISIONAL' : 'IN PROGRESS',
        detail: rank <= target ? `Currently ranked #${rank}. Final review confirms the result.` : `Currently ranked #${rank}; reach #${target} to qualify. Rankings can move.`,
        progress, record: null, current: `#${rank}`, remaining: `${Math.max(0, rank - target)} places`,
      };
    }
  }
  return {
    state: 'locked', label: 'AWAITING VERIFIED STANDINGS',
    detail: 'This achievement is awarded only from finalized eligible campaign standings.',
    progress: null, record: null, current: null, remaining: null,
  };
}

function achievementCardMarkup(badge, { compact = false } = {}) {
  const progress = achievementProgress(badge);
  const record = progress.record;
  const classes = ['achievement-tile', `achievement-${progress.state}`, compact ? 'compact' : ''].filter(Boolean).join(' ');
  const hasVisibleProgress = ['in-progress', 'provisional'].includes(progress.state) && progress.progress !== null;
  const progressMarkup = !hasVisibleProgress ? '' : `<span class="achievement-tile-meter" style="--tile-progress:${progress.progress}%" role="progressbar" aria-label="${escapeHtml(badge.label)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.progress}">${progress.progress}%</span>`;
  const statusMarkup = record
    ? '<span class="achievement-tile-status" aria-hidden="true">✓</span>'
    : progress.state === 'classified' || progress.state === 'locked'
      ? '<span class="achievement-tile-status locked" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3 7h10v7H3z" /></svg></span>'
      : '';
  if (compact) return `<button type="button" class="${classes}" data-achievement-id="${escapeHtml(badge.id)}" aria-label="${escapeHtml(badge.label)}: ${escapeHtml(progress.label)}">
    <span class="achievement-art"><img src="${escapeHtml(badge.image)}" alt="" loading="lazy" decoding="async" />${progressMarkup}${statusMarkup}</span>
    <span class="achievement-tile-copy"><b>${escapeHtml(badge.label)}</b><small>${escapeHtml(record?.rarityTier || (progress.state === 'in-progress' || progress.state === 'provisional' ? 'IN PROGRESS' : progress.state === 'pending' ? 'VERIFYING' : progress.state === 'classified' ? 'CLASSIFIED' : progress.state === 'earned' ? 'EARNED' : 'LOCKED'))}</small></span>
  </button>`;
  return `<button type="button" class="${classes}" data-achievement-id="${escapeHtml(badge.id)}" aria-label="${escapeHtml(badge.label)}: ${escapeHtml(progress.label)}">
    <span class="achievement-art"><img src="${escapeHtml(badge.image)}" alt="" loading="lazy" decoding="async" />${progressMarkup}${statusMarkup}</span>
    <span class="achievement-tile-copy"><small>${escapeHtml(progress.label)}</small><b>${escapeHtml(badge.label)}</b><span>${escapeHtml(badge.description || 'Verified campaign recognition')}</span></span>
    ${record?.rarityTier ? `<span class="achievement-rarity-chip rarity-${escapeHtml(record.rarityTier)}">${escapeHtml(record.rarityTier)}</span>` : ''}
  </button>`;
}

function achievementTabsMarkup() {
  const tabs = [['overview','Overview'],['collections','Collections'],['rarity','Rarity'],['history','History']];
  return `<div class="achievement-tabs" role="tablist" aria-label="Achievement views">${tabs.map(([id,label]) => {
    const selected = state.achievementView === id;
    return `<button type="button" role="tab" id="achievement-tab-${id}" data-achievement-view="${id}" aria-controls="achievement-panel" aria-selected="${selected}" tabindex="${selected ? '0' : '-1'}">${label}</button>`;
  }).join('')}</div>`;
}

function achievementCollectionMarkup(collection, definitions) {
  const items = definitions.filter((item) => item.collection === collection.id);
  if (!items.length) return '';
  const progressStates = items.map((item) => achievementProgress(item));
  const earned = progressStates.filter((progress) => progress.state === 'earned').length;
  const inProgress = progressStates.filter((progress) => ['in-progress', 'provisional', 'pending'].includes(progress.state)).length;
  const complete = earned === items.length;
  const progressPercent = Math.round((earned / items.length) * 100);
  const collectionState = complete ? 'complete' : inProgress ? 'active' : earned ? 'started' : 'locked';
  const stateLabel = complete ? 'COLLECTION COMPLETE' : inProgress ? `${inProgress} IN PROGRESS` : earned ? 'BUILDING' : 'LOCKED';
  return `<section class="achievement-collection-row is-${collectionState}" data-achievement-collection="${escapeHtml(collection.id)}"><header><div><b>${escapeHtml(collection.label)}</b><small>${escapeHtml(collection.description)}</small></div><span><b>${earned} / ${items.length}</b><small>${stateLabel}</small></span></header><div class="achievement-collection-progress" aria-label="${escapeHtml(collection.label)} collection progress"><i style="width:${progressPercent}%"></i></div><div class="achievement-tile-grid">${items.map((item) => achievementCardMarkup(item, { compact: true })).join('')}</div></section>`;
}

function achievementCollectionsComingMarkup(collections) {
  if (!collections.length) return '';
  return `<aside class="achievement-collections-coming"><span>MORE COLLECTIONS</span><div>${collections.map((collection) => `<span>${escapeHtml(collection.label)}</span>`).join('')}</div><p>New achievements appear here as their campaign criteria are finalized.</p></aside>`;
}

function achievementViewPanel(content) {
  return `<div class="achievement-view-panel" id="achievement-panel" role="tabpanel" aria-labelledby="achievement-tab-${escapeHtml(state.achievementView)}" tabindex="0">${content}</div>`;
}

function achievementDetailMarkup(definition) {
  const progress = achievementProgress(definition);
  const record = progress.record;
  const campaign = state.campaign || fallbackCampaign;
  const rarity = record?.rarityTier
    ? (campaign.achievementRarityTiers || []).find((tier) => tier.id === record.rarityTier)
    : null;
  const sync = record?.universalProfileSync || 'PENDING';
  const verificationNote = definition.verificationSource === 'finalized_campaign_standings'
    ? 'Live standings are provisional. Only a verified receipt appears as earned in your history.'
    : definition.criteriaState === 'CLASSIFIED' || !definition.criteriaVersion
      ? 'The requirement is classified. Keep participating in Operation 01 to discover it.'
      : 'Progress reflects settled, verified activity. Only a verified receipt appears as earned in your history.';
  const collection = (campaign.achievementCollections || []).find((item) => item.id === definition.collection);
  const meta = `<div class="achievement-detail-meta"><span>${escapeHtml(rarity?.label || (record ? 'VERIFIED' : 'RARITY ON VERIFICATION'))}</span><span>${escapeHtml(collection?.label || 'CAMPAIGN')}</span><span>${escapeHtml(campaign.name)}</span></div>`;
  const progressBlock = ['in-progress', 'provisional'].includes(progress.state) && progress.progress !== null && !record
    ? `<section class="achievement-detail-progress"><header><strong>YOUR PROGRESS</strong><span>${progress.progress}%</span></header>${progress.current ? `<p>${escapeHtml(progress.current)}</p>` : ''}<div class="achievement-progress" role="progressbar" aria-label="${escapeHtml(definition.label)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.progress}"><i style="width:${progress.progress}%"></i></div><small>${escapeHtml(progress.remaining || progress.detail)}</small></section>`
    : record
      ? `<div class="achievement-verified-banner"><span aria-hidden="true">✓</span><div><b>ACHIEVEMENT VERIFIED</b><small>Earned ${escapeHtml(formatProfileDate(record.awardedAt))}</small></div></div>`
      : `<div class="achievement-status-note">${escapeHtml(progress.detail)}</div>`;
  const detailFields = record
    ? `<dl class="achievement-receipt-fields"><div><dt>VERIFICATION</dt><dd>Verified by Project Q</dd></div><div><dt>CAMPAIGN</dt><dd>${escapeHtml(campaign.name)} · ${escapeHtml(achievementOperationLabel(record.operationKey))}</dd></div><div><dt>ADDED TO UNIVERSAL PROFILE</dt><dd>${escapeHtml(sync === 'DELIVERED' ? '✓ Synced' : 'Sync pending')}</dd></div>${record.holderSharePercent != null ? `<div><dt>VERIFIED HOLDERS</dt><dd>${Number(record.holderSharePercent).toFixed(2)}% · ${Number(record.holderCount || 0).toLocaleString()} holders</dd></div>` : ''}${record.result ? `<div><dt>RESULT</dt><dd>${escapeHtml(record.result)}</dd></div>` : ''}</dl>`
    : `<section class="achievement-requirement"><b>REQUIREMENT & VERIFICATION</b><p>${escapeHtml(progress.detail)}</p><small>${escapeHtml(verificationNote)}</small><div><span>CAMPAIGN</span><strong>${escapeHtml(campaign.name)} · ${escapeHtml(achievementOperationLabel(campaign.operationKey || 'operation-01'))}</strong></div></section>`;
  return `<section class="achievement-detail-view ${record ? 'is-earned' : `is-${escapeHtml(progress.state)}`}" aria-labelledby="achievement-detail-title">
    <button type="button" class="achievement-back" data-achievement-back aria-label="Back to achievements">← BACK TO ACHIEVEMENTS</button>
    <div class="achievement-detail-art ${record ? '' : 'locked'}"><img src="${escapeHtml(definition.image)}" alt="${escapeHtml(definition.label)} achievement artwork" /><span>${record ? escapeHtml(rarity?.label || 'VERIFIED') : escapeHtml(progress.label)}</span></div>
    <div class="achievement-detail-copy"><span class="achievement-record-kicker">PROJECT Q // ACHIEVEMENT</span><h2 id="achievement-detail-title">${escapeHtml(definition.label)}</h2><p>${escapeHtml(definition.description || 'Verified campaign achievement')}</p>${meta}
      ${progressBlock}
      <div class="achievement-detail-lower"><span>DETAILS</span>${detailFields}</div>
      ${record ? `<button type="button" class="achievement-share" data-share-achievement="${escapeHtml(definition.id)}">SHARE ACHIEVEMENT</button>` : ''}
    </div>
  </section>`;
}

function achievementHistoryMarkup(definitions) {
  const records = [...(state.profile.achievementRecords || [])]
    .filter((record) => record?.verificationState === 'VERIFIED')
    .sort((a,b) => new Date(b.awardedAt || 0) - new Date(a.awardedAt || 0));
  if (!state.profile.achievementRecordsAvailable) return `<div class="achievement-empty"><span>PROJECT Q // HISTORY</span><b>Your verified record is waiting to sync.</b><p>Open Project Q in Telegram to load campaign achievements tied to your identity.</p></div>`;
  if (!records.length) return `<div class="achievement-empty"><span>PROJECT Q // HISTORY</span><b>Your record starts with your first verified achievement.</b><p>Project Q adds campaign receipts here after each requirement is verified.</p></div>`;
  const definitionsById = new Map(definitions.map((item) => [item.id, item]));
  return `<ol class="achievement-history-list">${records.map((record) => {
    const definition = definitionsById.get(record.achievementId);
    return `<li><span class="history-marker">✓</span><div><small>${escapeHtml(formatProfileDate(record.awardedAt))} · ${escapeHtml(record.universalProfileSync === 'DELIVERED' ? 'UNIVERSAL PROFILE SYNCED' : 'UNIVERSAL PROFILE SYNC PENDING')}</small><b>${escapeHtml(definition?.label || record.achievementId)}</b><p>${escapeHtml(state.campaign?.name || 'Campaign')} · ${escapeHtml(achievementOperationLabel(record.operationKey))}</p></div>${definition ? `<button type="button" data-achievement-id="${escapeHtml(definition.id)}" aria-label="View ${escapeHtml(definition.label)}">VIEW →</button>` : ''}</li>`;
  }).join('')}</ol>`;
}

function achievementsScreen() {
  const campaign = state.campaign || fallbackCampaign;
  const definitions = achievementDefinitions();
  const records = (state.profile.achievementRecords || []).filter((record) => record.verificationState === 'VERIFIED');
  if (state.selectedAchievementId) {
    const selected = definitions.find((item) => item.id === state.selectedAchievementId);
    if (selected) return achievementDetailMarkup(selected);
  }
  if (state.achievementView === 'history') return `<section class="achievement-center">${achievementTabsMarkup()}${achievementViewPanel(`<header class="achievement-page-heading"><span>PROJECT Q // HISTORY</span><h2>Your campaign record.</h2><p>Verified achievements, in the order you earned them.</p></header>${achievementHistoryMarkup(definitions)}`)}</section>`;
  if (state.achievementView === 'collections') {
    const collections = campaign.achievementCollections || [];
    const configured = collections.filter((collection) => definitions.some((item) => item.collection === collection.id));
    const upcoming = collections.filter((collection) => !definitions.some((item) => item.collection === collection.id));
    return `<section class="achievement-center">${achievementTabsMarkup()}${achievementViewPanel(`<header class="achievement-page-heading"><span>PROJECT Q // COLLECTIONS</span><h2>Build your record.</h2><p>Eight Bond the Duck achievements across progression and standings.</p></header><div class="achievement-collections">${configured.map((collection) => achievementCollectionMarkup(collection, definitions)).join('')}</div>${achievementCollectionsComingMarkup(upcoming)}`)}</section>`;
  }
  if (state.achievementView === 'rarity') {
    const rarityTiers = campaign.achievementRarityTiers || [];
    const tierMarkup = rarityTiers.map((tier) => {
      const count = records.filter((record) => record.rarityTier === tier.id).length;
      return `<div class="rarity-tier rarity-${escapeHtml(tier.id)}"><span>${escapeHtml(tier.label)}</span><b>${count}</b></div>`;
    }).join('');
    const earnedItems = records.map((record) => definitions.find((item) => item.id === record.achievementId)).filter(Boolean);
    const cabinet = earnedItems.length
      ? `<div class="achievement-tile-grid">${earnedItems.map((item) => achievementCardMarkup(item, { compact: true })).join('')}</div>`
      : `<div class="achievement-empty"><span>VERIFIED TROPHY CABINET</span><b>No rarity awards recorded yet.</b><p>Achievement tiers appear here only after Project Q verifies an award. Holder statistics wait until campaign results are finalized.</p></div>`;
    return `<section class="achievement-center">${achievementTabsMarkup()}${achievementViewPanel(`<header class="achievement-page-heading"><span>PROJECT Q // RARITY</span><h2>Your verified trophy cabinet.</h2><p>Rarity follows verified campaign results. Holder statistics are shown only after finalization.</p></header><div class="rarity-tier-shelf" aria-label="Verified awards by rarity">${tierMarkup}</div>${cabinet}`)}</section>`;
  }
  const earned = records.length;
  const latest = [...records].sort((a,b) => new Date(b.awardedAt || 0) - new Date(a.awardedAt || 0))[0];
  const next = definitions.map((definition) => ({ definition, progress: achievementProgress(definition) }))
    .filter(({ progress }) => !['earned','classified','provisional'].includes(progress.state))
    .sort((a,b) => (b.progress.progress ?? -1) - (a.progress.progress ?? -1))[0];
  const availableRarityCount = records.filter((record) => record.rarityTier).length;
  const collections = campaign.achievementCollections || [];
  const configuredCollections = collections.filter((collection) => definitions.some((item) => item.collection === collection.id));
  return `<section class="achievement-center">
    ${achievementTabsMarkup()}
    ${achievementViewPanel(`<header class="achievement-page-heading"><span>PROJECT Q // ACHIEVEMENTS</span><h2>Your operation record.</h2><p>Verified achievements add to your campaign history and Universal Profile.</p></header>
    <section class="achievement-overview-hero"><div class="achievement-count-ring" style="--achievement-progress:${definitions.length ? Math.round(earned / definitions.length * 100) : 0}%" aria-label="${earned} of ${definitions.length} achievements earned"><strong>${earned}</strong><span>/ ${definitions.length}<small>VERIFIED</small></span></div><div><span>CAMPAIGN ACHIEVEMENTS</span><h3>${earned} / ${definitions.length} earned</h3><p>${definitions.length ? `${Math.round(earned / definitions.length * 100)}% complete` : 'Achievement criteria are being prepared.'}</p></div>${availableRarityCount ? `<div class="achievement-overview-rarity"><b>${availableRarityCount}</b><span>RARITY AWARDS</span></div>` : ''}</section>
    ${next ? `<section class="achievement-next-intel"><header><span>NEXT ACHIEVEMENT</span><small>${escapeHtml(next.progress.label)}</small></header><div>${next.definition.image ? `<img src="${escapeHtml(next.definition.image)}" alt="" />` : ''}<div><b>${escapeHtml(next.definition.label)}</b><p>${escapeHtml(next.progress.detail)}</p>${next.progress.progress !== null && ['in-progress', 'provisional'].includes(next.progress.state) ? `<div class="achievement-progress" role="progressbar" aria-label="${escapeHtml(next.definition.label)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${next.progress.progress}"><i style="width:${next.progress.progress}%"></i></div>` : ''}</div><button type="button" data-achievement-id="${escapeHtml(next.definition.id)}" aria-label="View ${escapeHtml(next.definition.label)}">›</button></div></section>` : ''}
    ${latest ? `<section class="achievement-latest-unlock"><span>LATEST UNLOCK</span>${achievementCardMarkup(definitions.find((item) => item.id === latest.achievementId) || { id: latest.achievementId, label: latest.achievementId, image: '' }, { compact: true })}</section>` : ''}
    <div class="achievement-collections-preview"><header><div><span>COLLECTIONS</span><b>Build your achievement set</b></div><button type="button" data-achievement-view="collections">VIEW ALL →</button></header><div class="achievement-collection-deck">${configuredCollections.map((collection) => achievementCollectionMarkup(collection, definitions)).join('')}</div></div>`) }
  </section>`;
}

function achievementUnlockMarkup(unlock) {
  const record = unlock.record;
  const definition = achievementDefinitions().find((item) => item.id === record.achievementId);
  const campaign = state.campaign || fallbackCampaign;
  const rarity = (campaign.achievementRarityTiers || []).find((tier) => tier.id === record.rarityTier);
  return `<section class="achievement-unlock-event" aria-labelledby="achievement-unlock-title">
    <button type="button" class="achievement-unlock-close" data-dismiss-achievement-unlock aria-label="Close achievement unlocked dialog">×</button>
    <span class="achievement-unlock-kicker">PROJECT Q // VERIFIED RECORD</span>
    <div class="achievement-unlock-glow"><img src="${escapeHtml(definition?.image || '/campaign-app/assets/system/q-id.webp')}" alt="" /></div>
    <span class="achievement-unlock-eyebrow">ACHIEVEMENT UNLOCKED</span>
    <h2 id="achievement-unlock-title">${escapeHtml(definition?.label || record.achievementId)}</h2>
    <p>${escapeHtml(definition?.description || 'A verified campaign achievement has been added to your record.')}</p>
    <div class="achievement-unlock-proof"><b>${escapeHtml(rarity?.label || 'VERIFIED')}</b><span>Verified for ${escapeHtml(campaign.name)} · ${escapeHtml(achievementOperationLabel(record.operationKey))}</span><small>${escapeHtml(record.universalProfileSync === 'DELIVERED' ? 'Added to your Universal Profile' : 'Universal Profile sync queued')}</small></div>
    ${unlock.additionalCount ? `<p class="achievement-unlock-more">+${Number(unlock.additionalCount)} additional verified ${unlock.additionalCount === 1 ? 'achievement' : 'achievements'} added to your record.</p>` : ''}
    <button type="button" class="achievement-unlock-action" data-view-achievement-unlock="${escapeHtml(record.achievementId)}">VIEW ACHIEVEMENT RECORD</button>
  </section>`;
}

function maybeShowAchievementUnlock() {
  const unlock = state.pendingAchievementUnlock;
  const dialog = document.querySelector('#achievement-unlock-dialog');
  if (!unlock || !dialog || dialog.open) return;
  dialog.innerHTML = achievementUnlockMarkup(unlock);
  dialog.onclick = (event) => { if (event.target === dialog) dialog.close(); };
  dialog.onclose = () => { state.pendingAchievementUnlock = null; };
  dialog.querySelector('[data-dismiss-achievement-unlock]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-view-achievement-unlock]')?.addEventListener('click', (event) => {
    const achievementId = event.currentTarget.dataset.viewAchievementUnlock;
    state.pendingAchievementUnlock = null;
    dialog.close();
    state.selectedAchievementId = achievementId;
    go('record', { view: 'achievements' });
  });
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  state.telegram?.HapticFeedback?.notificationOccurred?.('success');
}

function contributionBreakdownMarkup() {
  const available = state.sessionStatus === 'verified';
  const entries = [['Participation','participation'],['Project Q missions','mission'],['Trending activity','trending'],['Other verified activity','other']];
  const values = state.profile.xpByBucket || {};
  const maximum = Math.max(1,...entries.map(([,key])=>Number(values[key] || 0)));
  return `<section class="contribution-intelligence"><header><span>SOURCE BREAKDOWN</span><b>${available ? 'RECORDED XP' : 'SYNC PENDING'}</b></header>${available ? entries.map(([label,key])=>`<div><span>${label}</span><i><em style="width:${Math.min(100,Math.max(0,Number(values[key] || 0))/maximum*100)}%"></em></i><strong>${Number(values[key] || 0).toLocaleString()}</strong></div>`).join('') : '<p>Open Project Q in Telegram to load your verified contribution breakdown.</p>'}<small>Source totals reflect up to 1,000 ledger entries. Total operation XP is shown separately.</small></section>`;
}

function xpScreen({ embedded = false } = {}) {
  const c = state.campaign || fallbackCampaign;
  const caps = c.xpCaps || fallbackCampaign.xpCaps;
  const otherCap = Math.max(0, caps.overallDaily - caps.participationDaily - caps.projectQDaily - caps.trendingBotsDaily);
  const today = state.profile.todayXpByBucket || {};
  const activity = state.profile.activity || [];
  const totalXp = Number(state.profile.xp || 0);
  const todayXp = Number(state.profile.todayXp || 0);
  const rank = state.profile.rank && state.profile.rank !== '—' ? state.profile.rank : 'UNRANKED';

  return `<div class="xp-v2">
    ${embedded ? '' : `<section class="progression-hero command-card">
      <div class="progression-copy">
        <span class="label">Campaign progression</span>
        <div class="progression-value"><strong>${totalXp.toLocaleString()}</strong><em>CAMPAIGN XP</em></div>
        <h2>${escapeHtml(rank)}</h2>
        <p>${todayXp > 0 ? `+${todayXp} XP today from verified activity.` : 'Complete eligible activity to build verified campaign progress.'}</p>
      </div>
      <div class="progression-actions">
        <button class="info-action" data-explainer="xp" aria-label="How XP works">?</button>
        <button class="outline-action" data-record-view="rank">View standing</button>
      </div>
    </section>`}

    <section class="xp-daily command-card">
      <div class="panel-title"><span>Today’s XP</span><small>Overall cap ${Number(caps.overallDaily || 0)} XP</small></div>
      <div class="xp-progress-list">
        ${progressRow('Participation', today.participation, caps.participationDaily)}
        ${progressRow('Trending activity', today.trending, caps.trendingBotsDaily)}
        ${progressRow('Project Q missions', today.mission, caps.projectQDaily)}
        ${progressRow('Other verified activity', today.other, otherCap)}
      </div>
    </section>

    ${contributionBreakdownMarkup()}
    <section class="xp-ledger-section"><div class="section-head compact-head"><div><span class="label">Settled activity</span><h2>Recent XP history</h2></div><span>Latest ${activity.length} entries</span></div>
      <section class="ledger xp-ledger">${activity.length ? activity.map(item => activityRow({ label: missionName(item.missionCode, item.source), timestamp: `${item.source || 'verified'} · Cycle ${Number(item.cycleId || 0)} · ${formatProfileDate(item.awardedAt)}`, xp: Number(item.amount || 0), icon: 'Q' })).join('') : '<div class="empty compact"><b>Awaiting verified activity</b><p>Entries appear only after eligible activity is verified and settled.</p></div>'}</section>
    </section>

    ${embedded ? '' : `<section class="xp-achievement-section xp-achievement-link">
      <div class="section-head"><div><span class="label">Campaign milestones</span><h2>Achievements</h2></div></div>
      <p>Verified achievements build your Bond the Duck history and Universal Profile.</p>
      <button type="button" data-record-view="achievements">OPEN ACHIEVEMENT RECORD →</button>
    </section>`}
  </div>`;
}

function leaderboardRow(row, index, unit = 'XP') {
  const isUser = Boolean(row.isUser) || String(row.name) === String(state.profile.name);
  return `<article class="leaderboard-row ${isUser ? 'you' : ''}"><span>${String(row.rank || index + 1).padStart(2, '0')}</span><div><b>${isUser ? 'YOU' : escapeHtml(row.name)}</b><small>${escapeHtml(row.detail || 'Verified participant')}</small></div><strong>${Number(row.xp || 0).toLocaleString()} ${escapeHtml(unit)}</strong></article>`;
}

function leaderboardScreen() {
  const c = state.campaign || fallbackCampaign;
  const rows = state.leaderboards[state.leaderboardView] || [];
  const tabs = [['overall', 'Overall'], ['48h', '48H'], ['missions', 'Missions'], ['trending', 'Trending'], ['community', 'Community'], ['burn', 'Earn-to-Burn']];
  const view = state.leaderboardMeta?.[state.leaderboardView];
  const change = Number(state.profile.rankChange || 0);
  const lifecycle = operationLifecycleState();
  const participantCount = Number(view?.participantCount || 0).toLocaleString();

  const standingState = lifecycle.label === 'ACTIVE'
    ? {
        kicker: 'LIVE CAMPAIGN STANDING',
        detail: view?.available ? `${participantCount} verified participants · rank can still move` : 'Standings open as verified campaign activity settles.',
        note: 'Live standings update only after finalized verification.',
        mode: 'LIVE VERIFIED',
      }
    : lifecycle.label === 'REVIEWING'
      ? {
          kicker: 'FINAL REVIEW',
          detail: view?.available ? `${participantCount} verified participants · final verification in progress` : 'Final standings are being reconciled.',
          note: 'Campaign scoring is closed while Project Q finalizes verified standings.',
          mode: 'UNDER REVIEW',
        }
      : ['DISTRIBUTING','COMPLETED','ARCHIVED'].includes(lifecycle.label)
        ? {
            kicker: 'FINAL CAMPAIGN STANDING',
            detail: view?.available ? `${participantCount} verified participants · finalized campaign result` : 'Finalized verified standings.',
            note: 'This standing is part of your permanent Project Q operation record.',
            mode: 'FINALIZED',
          }
        : {
            kicker: 'CAMPAIGN STANDING',
            detail: view?.available ? `${participantCount} verified participants` : 'Rankings open with verified activity.',
            note: 'No placeholder scores or identities are shown.',
            mode: 'PRE-LAUNCH',
          };

  const emptyTitle = view?.available ? 'No ranked activity yet' : standingState.detail;
  const emptyDetail = view?.reason || standingState.note;
  const rank = state.profile.rank && state.profile.rank !== '—' ? state.profile.rank : 'UNRANKED';

  return `<div class="leaderboard-v2">
    <section class="rank-hero command-card">
      <div>
        <span class="label">${escapeHtml(standingState.kicker)}</span>
        <strong>${escapeHtml(rank)}</strong>
        <p>${change && lifecycle.label === 'ACTIVE' ? `${change > 0 ? '↑' : '↓'} ${Math.abs(change)} positions today · ${escapeHtml(standingState.detail)}` : escapeHtml(standingState.detail)}</p>
      </div>
      <div class="progression-actions">
        <button class="info-action" data-explainer="leaderboard" aria-label="How leaderboards work">?</button>
        <button class="outline-action" data-explainer="ranks">How standings work</button>
      </div>
    </section>

    <label class="standing-filter">STANDING BY <select id="standing-filter">${tabs.map(([id, label]) => `<option value="${id}" ${state.leaderboardView === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label>

    <section class="leaderboard-list rank-list">
      ${rows.length ? rows.map((row, index) => leaderboardRow(row, index, view?.unit || 'XP')).join('') : `<div class="empty compact"><b>${escapeHtml(emptyTitle)}</b><p>${escapeHtml(emptyDetail)}</p></div>`}
    </section>

    <div class="leaderboard-clock rank-verification-note">
      <span>${escapeHtml(standingState.note)}</span><b>${escapeHtml(standingState.mode)}</b>
    </div>

    ${cycleResultsMarkup()}
  </div>`;
}

function formatBaseUnits(value, decimals = 6) {
  if (value == null) return '—';
  try {
    const amount = BigInt(value);
    const scale = 10n ** BigInt(decimals);
    const whole = amount / scale;
    const fraction = (amount % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${whole.toLocaleString('en-US')}${fraction ? `.${fraction}` : ''}`;
  } catch { return '—'; }
}

function formatPercentBps(value = 0) { return `${(Number(value) / 100).toFixed(2)}%`; }

function subtractBaseUnits(total, paid) {
  if (total == null || paid == null) return null;
  try {
    const remaining = BigInt(total) - BigInt(paid);
    return (remaining < 0n ? 0n : remaining).toString();
  } catch { return null; }
}

function hasPositiveBaseUnits(value) {
  try { return BigInt(value ?? 0) > 0n; }
  catch { return false; }
}

function readinessGate(key) {
  return state.readiness?.checks?.find((check) => check.key === key)?.ready === true;
}

function rewardDeliveryState(rewards) {
  const releases = rewards.releases || [];
  if (releases.some(({ status }) => status === 'failed')) return { label: 'RECOVERY REVIEW', tone: 'blocked' };
  if (rewards.recorded && hasPositiveBaseUnits(rewards.allocatedBaseUnits)
      && subtractBaseUnits(rewards.allocatedBaseUnits, rewards.distributedBaseUnits || '0') === '0') {
    return { label: 'DELIVERED', tone: 'success' };
  }
  if (releases.some(({ status }) => ['paid', 'recovered'].includes(status))) return { label: 'DISTRIBUTING', tone: 'success' };
  if (releases.length) return { label: 'SCHEDULED', tone: 'pending' };
  if (rewards.recorded) return { label: 'ALLOCATION RECORDED', tone: 'pending' };
  return { label: 'NOT FINALIZED', tone: 'pending' };
}

function automaticDeliveryRail(rewards) {
  const releases = rewards.releases || [];
  const walletReady = state.profile.walletVerified;
  const allocationReady = Boolean(rewards.recorded);
  const treasuryReady = readinessGate('funding') && readinessGate('registry');
  const scheduled = releases.length > 0;
  const receiptReady = releases.some(({ transactionSignature }) => isSolanaSignature(transactionSignature));
  const steps = [
    ['Reward wallet', walletReady, walletReady ? 'Ownership verified' : 'Verification required'],
    ['Allocation', allocationReady, allocationReady ? 'Recorded by Project Q' : 'Awaiting finalized record'],
    ['Squads delivery', treasuryReady && scheduled, treasuryReady ? (scheduled ? 'Release scheduled' : 'Awaiting release record') : 'Treasury setup pending'],
    ['On-chain receipt', receiptReady, receiptReady ? 'Finalized proof available' : 'Appears after distribution'],
  ];
  return `<section class="delivery-rail command-card"><header><div><span class="label">Automatic delivery</span><h3>No claim transaction required.</h3><p>Project Q records the allocation. The founders authorize distribution through Squads, and FAWKQ arrives directly in the verified reward wallet.</p></div>${statePill(receiptReady ? 'RECEIPT READY' : 'FOUNDER CONTROLLED', receiptReady ? 'success' : 'pending')}</header><div class="delivery-steps">${steps.map(([label, complete, detail], index) => `<article class="${complete ? 'complete' : ''}"><i>${complete ? '✓' : index + 1}</i><div><b>${escapeHtml(label)}</b><small>${escapeHtml(detail)}</small></div></article>`).join('')}</div></section>`;
}

function rewardCategoryLabel(category) {
  return ({ activity: 'Activity rewards', buy_to_earn: 'Buy-to-Earn', diamond_duck: 'Diamond Duck' })[category] || 'Campaign reward';
}

function participantReleaseRow(release) {
  const status = String(release.status || 'scheduled');
  const complete = ['paid', 'recovered'].includes(status);
  const failed = status === 'failed';
  const symbol = complete ? '✓' : failed ? '!' : '○';
  const detail = `${formatBaseUnits(release.amountBaseUnits)} FAWKQ · ${formatProfileDate(release.scheduledAt)} · ${status.replaceAll('_', ' ')}`;
  const receipt = isSolanaSignature(release.transactionSignature)
    ? `<a href="https://solscan.io/tx/${encodeURIComponent(release.transactionSignature)}" target="_blank" rel="noopener noreferrer" aria-label="Open finalized Solana receipt">Receipt ↗</a>`
    : '';
  return `<article class="${complete ? 'complete' : failed ? 'failed' : ''}"><span>${Number(release.percent || 0)}%</span><div><b>${escapeHtml(rewardCategoryLabel(release.category))}${release.cycleId ? ` · Cycle ${Number(release.cycleId)}` : ''}</b><small>${escapeHtml(detail)}</small></div><div class="release-proof">${receipt}<i>${symbol}</i></div></article>`;
}


function operationLifecycleState() {
  const campaignState = String(
    state.runtime?.databaseState || state.profile?.campaignState || state.campaign?.status || 'DRAFT'
  ).toUpperCase();
  const phase = String(state.runtime?.schedule?.phase || '').toUpperCase();

  if (campaignState === 'ARCHIVED' || state.campaignRecord?.archived) {
    return { label: 'ARCHIVED', tone: 'pending' };
  }
  if (campaignState === 'TERMINATED') {
    return { label: 'TERMINATED', tone: 'blocked' };
  }
  if (campaignState === 'PAUSED') {
    return { label: 'PAUSED', tone: 'blocked' };
  }
  if (campaignState === 'COMPLETED') {
    return { label: 'COMPLETED', tone: 'success' };
  }
  if (campaignState === 'DISTRIBUTING') {
    return { label: 'DISTRIBUTING', tone: 'ready' };
  }
  if (['VERIFYING','ALLOCATIONS_FROZEN'].includes(campaignState)
      || ['HANDOFF','REVIEW','REVIEW_EXTENSION','POST_REVIEW'].includes(phase)) {
    return { label: 'REVIEWING', tone: 'pending' };
  }
  if (campaignState === 'ACTIVE' && phase === 'ACTIVE' && state.runtime?.operational) {
    return { label: 'ACTIVE', tone: 'success' };
  }
  if (phase === 'ACTIVE' && campaignState !== 'ACTIVE') {
    return { label: 'LAUNCH BLOCKED', tone: 'blocked' };
  }
  if (['DRAFT','READINESS_BLOCKED','FUNDED','SCHEDULED'].includes(campaignState)
      || phase === 'PRE_LAUNCH' || !state.runtime) {
    return { label: 'UPCOMING', tone: 'pending' };
  }
  return { label: campaignState || 'UPCOMING', tone: 'pending' };
}

function terminalOperationPill() {
  const lifecycle = operationLifecycleState();
  const phase = String(state.runtime?.schedule?.phase || '').toUpperCase();

  if (lifecycle.label === 'ACTIVE' || lifecycle.label === 'LAUNCH BLOCKED') {
    return runtimePill();
  }
  if (lifecycle.label === 'UPCOMING' && state.runtime) {
    return runtimePill();
  }
  if (lifecycle.label === 'REVIEWING' && ['HANDOFF','REVIEW','REVIEW_EXTENSION'].includes(phase)) {
    return runtimePill();
  }
  return statePill(lifecycle.label, lifecycle.tone);
}

function operationLifecycleMarkup() {
  const current = operationLifecycleState();
  const stages = ['UPCOMING','ACTIVE','REVIEWING','DISTRIBUTING','COMPLETED'];
  const currentIndex = current.label === 'ARCHIVED' ? stages.length : stages.indexOf(current.label);
  const exception = !stages.includes(current.label) && current.label !== 'ARCHIVED';
  return `<section class="operation-lifecycle ${exception ? 'exception' : ''}" aria-label="Operation lifecycle">
    <div class="operation-lifecycle-head"><span>OPERATION STATE</span>${statePill(current.label, current.tone)}</div>
    <div class="operation-lifecycle-track">
      ${stages.map((label, index) => `<div class="${currentIndex >= 0 && index < currentIndex ? 'complete' : label === current.label ? 'current' : ''}"><i></i><span>${label}</span></div>`).join('')}
    </div>
  </section>`;
}

function formatOperationDate(value) {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return 'PENDING';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: state.campaign?.schedule?.timeZone || 'America/Vancouver',
  }).toUpperCase();
}

function formatOperationTime(value, timeZone = 'America/Vancouver') {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return 'time pending';
  return `${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })} PT`;
}

function operationStartFact() {
  const schedule = state.runtime?.schedule;
  if (!schedule) return { label: 'START', date: 'PENDING' };
  if (schedule.phase === 'PRE_LAUNCH' && !schedule.targetAt) {
    const proposed = state.campaign?.schedule?.activeOpensAt;
    return Date.parse(proposed || '') > runtimeNow()
      ? { label: 'TARGET', date: formatOperationDate(proposed) }
      : { label: 'START', date: 'PENDING' };
  }
  const start = schedule.phase === 'PRE_LAUNCH' ? schedule.targetAt
    : state.campaign?.schedule?.activeOpensAt;
  return { label: 'START', date: formatOperationDate(start) };
}

function operationNumber() {
  const sequence = String(state.campaign?.sequence || '01').match(/\d+/)?.[0] || '01';
  return sequence.padStart(2, '0');
}

function operationTabs() {
  const tabs = [['overview', 'Briefing'], ['missions', 'Missions'], ['economics', 'Economics']];
  return `<div class="operation-tabs" role="tablist" aria-label="Operation sections">${tabs.map(([id, label]) => `<button class="${state.operationsView === id ? 'active' : ''}" data-operation-view="${id}" data-persist-focus="operation-${id}" role="tab" aria-selected="${state.operationsView === id}">${label}</button>`).join('')}</div>`;
}

function operationCurrentOrderMarkup() {
  const next = currentNextStep();
  return `<section class="operation-current-order" aria-label="Next step"><div><span>NEXT STEP</span><h3>${escapeHtml(next.title)}</h3><p>${escapeHtml(next.detail)}</p></div></section>`;
}

function compactPoolAmount(amount) {
  const value = Number(String(amount).replace(/,/g, ''));
  if (!Number.isFinite(value) || value < 1_000_000) return amount;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value / 1_000_000)}M`;
}

function operationPoolMarkup(c) {
  const commitments = c.campaignCommitments || {};
  const fundingGateVerified = Boolean(state.readiness?.available && state.readiness.checks?.find(({ key }) => key === 'funding')?.ready);
  const prizeRegistryVerified = Boolean(state.readiness?.available && state.readiness.checks?.find(({ key }) => key === 'registry')?.ready);
  const burnGates = ['burn-rules', 'burn-progress', 'burn-verification'];
  const burnVerified = Boolean(state.readiness?.available && burnGates.every((key) => state.readiness.checks?.find((gate) => gate.key === key)?.ready));
  const rows = [
    { amount: commitments.campaignRewards?.amountBaseUnits ? formatBaseUnits(commitments.campaignRewards.amountBaseUnits) : '—', unit: 'FAWKQ', label: 'Reward Pool', detail: fundingGateVerified ? 'Funding gate verified' : 'Planned · funding pending', poolId: 'campaignRewards' },
    { amount: commitments.diamondDuckBonus?.amountBaseUnits ? formatBaseUnits(commitments.diamondDuckBonus.amountBaseUnits) : '—', unit: 'FAWKQ', label: 'Diamond Duck', detail: fundingGateVerified ? 'Funding gate verified' : 'Planned · funding pending', poolId: 'diamondDuckBonus' },
    { amount: commitments.earnToBurn?.amountBaseUnits ? formatBaseUnits(commitments.earnToBurn.amountBaseUnits) : '—', unit: 'FAWKQ', label: 'Earn to Burn', detail: burnVerified ? 'Burn gates verified' : 'Planned · burn checks pending', poolId: 'earnToBurn' },
    { amount: commitments.topContributorPrize?.amountSol ? `${commitments.topContributorPrize.amountSol} SOL` : '—', unit: '', label: 'Top Duck Prize', detail: prizeRegistryVerified ? 'Prize registry verified' : 'Planned · prize evidence pending', poolId: 'topContributorPrize' },
  ];
  return `<div class="operation-economics operation-pool-list" aria-label="Configured campaign pools">${rows.map((row) => {
    const compact = compactPoolAmount(row.amount);
    const exact = row.amount === '—' ? 'Amount pending' : `${row.amount}${row.unit ? ` ${row.unit}` : ''}`;
    return `<button type="button" class="operation-pool-row" data-pool-id="${row.poolId}" aria-label="View ${escapeHtml(row.label)} details, ${escapeHtml(exact)}, ${escapeHtml(row.detail)}"><span class="pool-copy"><b>${escapeHtml(row.label)}</b><small>${escapeHtml(row.detail)}</small></span><span class="pool-value"><strong>${escapeHtml(compact)}</strong>${row.unit ? `<span>${escapeHtml(row.unit)}</span>` : ''}${compact !== row.amount || row.unit ? `<small>${escapeHtml(exact)}</small>` : ''}</span><span class="pool-chevron" aria-hidden="true">›</span></button>`;
  }).join('')}</div>`;
}

function operationEconomicsMarkup(c) {
  if (state.activePool) return operationPoolDetailMarkup(c, state.activePool);
  const commitments = c.campaignCommitments || {};
  const fundingGate = state.readiness?.available ? state.readiness.checks?.find(item => item.key === 'funding') : null;
  return `<section class="operation-content-panel"><div class="operation-section-head"><div><span>ECONOMICS</span><h3>Four pools. Separate purposes.</h3></div><b>OP ${operationNumber()}</b></div><p class="operation-pool-note">Configured commitments for this operation. Open a pool to inspect its rules and verification state.</p>${operationPoolMarkup(c)}
    <details class="economics-treasury"><summary>Treasury & receipts <span>⌄</span></summary><p>${commitments.squadsCommunityVault ? `${Number(commitments.squadsCommunityVault.approvalThreshold)} of ${Number(commitments.squadsCommunityVault.memberCount)} Squads members authorize treasury transfers.` : 'Treasury authorization details are pending.'} Configured pool amounts are not proof of funding or payment.</p><div class="operation-progress-line"><span>FUNDING GATE</span><strong>${fundingGate?.ready ? 'VERIFIED' : fundingGate ? 'PENDING' : 'UNAVAILABLE'}</strong></div><p>Confirmed burn transactions appear in Earn-to-Burn progress. Your allocation and delivery receipts appear in Rewards. Campaign treasury transaction receipts are not available in this public feed yet.</p></details>
  </section>`;
}

function operationPoolDetailMarkup(c, id) {
  if (id === 'earnToBurn') return burnsScreen();
  const pool = c.campaignCommitments?.[id];
  const copy = {
    campaignRewards: ['Reward Pool', 'The main operation reward pool supports verified activity and Buy-to-Earn under the published allocation rules.', 'Combined verified activity and Buy-to-Earn each use 7.5M FAWKQ of the configured 15M pool. Five 48-hour cycles select eligible winners. Previous-cycle winners have a one-cycle cooldown.'],
    diamondDuckBonus: ['Diamond Duck', 'A separate bonus allocation, with its own eligibility and verification review.', 'This 2.5M FAWKQ commitment is separate from the main reward pool. Full funding and final bonus rules must be verified before calculation.'],
    topContributorPrize: ['Top Duck Prize', 'A separate SOL prize for the top verified overall contributor.', 'Paid only after final verification. The conservation contribution made in the winner’s name is separately funded and does not reduce the winner’s SOL prize or grant additional XP.'],
  }[id];
  if (!pool || !copy) return '<section class="operation-content-panel"><button data-operation-view="economics">← ECONOMICS</button><p>Pool configuration unavailable.</p></section>';
  const exact = pool.amountBaseUnits ? `${formatBaseUnits(pool.amountBaseUnits)} FAWKQ` : `${pool.amountSol} SOL`;
  const gateKey = id === 'topContributorPrize' ? 'registry' : 'funding';
  const gate = state.readiness?.available ? state.readiness.checks?.find(item => item.key === gateKey) : null;
  return `<section class="operation-content-panel pool-detail"><button class="burn-back" data-operation-view="economics">← ECONOMICS</button><header><span>OP ${operationNumber()} // POOL DETAILS</span><h3>${copy[0]}</h3><strong>${escapeHtml(compactPoolAmount(exact))}</strong><small>${escapeHtml(exact)} · configured commitment</small></header><p>${copy[1]}</p><div class="operation-progress-line"><span>${gateKey === 'registry' ? 'PRIZE REGISTRY' : 'FUNDING GATE'}</span><strong>${gate?.ready ? 'VERIFIED' : gate ? 'PENDING' : 'UNAVAILABLE'}</strong></div><h4>Allocation rules</h4><p>${copy[2]}</p><p>Individual amounts appear in Rewards only after eligible participation is verified and an allocation is recorded.</p><button class="outline-action" data-screen="rewards">YOUR REWARDS →</button></section>`;
}

function buyPositionMarkup() {
  const position = state.profile.buyToEarn;
  return `<section class="record-panel buy-position"><div class="dossier-heading"><span>Your Buy-to-Earn position</span><b>${position?.eligible ? 'ELIGIBLE' : 'PENDING VERIFICATION'}</b></div><p>${position ? `Verified tier: ${Number(position.tier || 0)}. Final allocations remain subject to operation review.` : 'No verified position has been recorded yet. Only eligible finalized purchases through approved markets count.'}</p></section>`;
}

function missionListCopy(mission) {
  const copy = {
    'oracle-raids': ['Complete verified X activity', mission.reward, 'DAILY'],
    'website-voting': ['Vote through certified sources', mission.reward.startsWith('1 XP per accepted source') ? '1 XP / SOURCE + BONUS' : mission.reward, 'PER SOURCE'],
    'trending-bots': ['Make verified trending pushes', mission.reward.includes('20 XP daily') ? 'UP TO 20 XP / DAY' : mission.reward, 'COOLDOWN'],
    bagwork: ['Complete approved platform tasks', mission.reward, 'PER TASK'],
    'buy-to-earn': ['Build an eligible net buy position', mission.reward.includes('Weighted draw advantage') ? 'DRAW WEIGHT' : mission.reward, 'SNAPSHOT'],
    'participation-xp': ['Track your settled campaign XP', 'XP LEDGER', 'DAILY'],
    'community-pulse': ['Participate in the FAWKQ community', mission.reward, 'DAILY'],
    'verified-referrals': ['Invite qualified new contributors', mission.reward.includes('10 XP per qualified referral') ? '10 XP / REFERRAL' : mission.reward, 'PER REFERRAL'],
    'earn-to-burn': ['Track the collective burn milestones', mission.reward, 'CAMPAIGN'],
  };
  return copy[mission.id] || [mission.description, mission.reward, mission.frequency || 'CAMPAIGN'];
}

function missionListCategory(mission, telemetry) {
  const label = canonicalMissionState(mission, telemetry).label;
  if (label === 'AVAILABLE') return 'available';
  if (label === 'COMPLETE') return 'completed';
  if (['IN PROGRESS', 'VERIFYING', 'SUBMITTED', 'VERIFIED'].includes(label)) return 'active';
  return 'locked';
}

function operationMissionsMarkup(c) {
  const missions = Array.isArray(c.missions) ? c.missions : [];
    const missionRows = missions.map((mission, index) => ({ mission, index, telemetry: missionTelemetry(mission) })).filter(({ mission }) => !['participation-xp', 'earn-to-burn'].includes(mission.id));
    const availableCount = missionRows.filter(({ mission, telemetry }) => missionListCategory(mission, telemetry) === 'available').length;
    const remaining = campaignEligibilityRequirements().filter(({ complete }) => !complete).length;
    const filteredRows = missionRows.filter(({ mission, telemetry }) => state.missionFilter === 'all' || missionListCategory(mission, telemetry) === state.missionFilter);
    return `<section class="operation-content-panel" data-tour-target="mission-files">
      <div class="operation-section-head">
        <div><span>MISSION FILES</span><h3>Choose your next objective.</h3></div>
      </div>
      <div class="mission-file-stats"><span><b>${missions.length}</b> OPERATION FILES</span><span><b>${availableCount}</b> AVAILABLE</span><span><b>${remaining}</b> CLEARANCE PENDING</span></div>
      <p class="mission-catalogue-note">${missionRows.length} action missions · ${missions.length - missionRows.length} progress files. Progress tracks accepted activity; opening a file does not award XP.</p>
      <div class="mission-file-filters" role="group" aria-label="Filter mission files">${[['all','All'],['available','Available'],['active','Active'],['completed','Completed']].map(([key,label])=>`<button type="button" data-mission-filter="${key}" class="${state.missionFilter === key ? 'active' : ''}" aria-pressed="${state.missionFilter === key}">${label}</button>`).join('')}</div>
      <div class="mission-file-index">${filteredRows.length ? filteredRows.map(({ mission, index, telemetry }) => {
        const [instruction, reward, frequency] = missionListCopy(mission);
        const missionState = canonicalMissionState(mission, telemetry);
        const category = missionListCategory(mission, telemetry);
        const actionable = category === 'available' && operationLifecycleState().label === 'ACTIVE';
        return `<button type="button" class="mission-file-row mission-file-${category} ${mission.id === 'oracle-raids' ? 'oracle-file' : ''} ${mission.id === 'earn-to-burn' || mission.id === 'buy-to-earn' ? 'reward-file' : ''}" data-mission-id="${escapeHtml(mission.id)}" aria-label="${escapeHtml(`Mission file ${index + 1}: ${mission.title}. ${missionState.label}. ${actionable ? 'Start mission' : 'View requirements and details'}`)}">
          <span class="file-number">MF-${String(index + 1).padStart(2, '0')}</span><span class="mission-file-state">${statePill(missionState.label, missionState.tone)}</span>
          ${mission.image ? `<img src="${escapeHtml(mission.image)}" alt="" loading="lazy" decoding="async" />` : '<i>Q</i>'}
          <span class="mission-file-copy"><b>${escapeHtml(mission.title)}</b><small>${escapeHtml(instruction)}</small></span>
          <span class="mission-file-chips"><strong>${escapeHtml(reward)}</strong><span>${escapeHtml(frequency)}</span>${Number(telemetry?.target || 0) > 0 && Number(telemetry?.verified || 0) > 0 ? `<span>${Number(telemetry.verified)} / ${Number(telemetry.target)} VERIFIED</span>` : ''}</span>
          <span class="mission-file-cta">${actionable ? 'START MISSION' : '›'}</span>
        </button>`;
      }).join('') : '<p class="mission-filter-empty">No mission files in this state yet. Try All to see every objective.</p>'}
      </div>
      <section class="operation-progress-files" aria-label="Progress files"><header><span>PROGRESS FILES</span><small>Your activity, recorded.</small></header>${missions.map((mission,index)=>({mission,index})).filter(({mission})=>['participation-xp','earn-to-burn'].includes(mission.id)).map(({mission,index})=>`<button type="button" data-mission-id="${escapeHtml(mission.id)}"><span>MF-${String(index+1).padStart(2,'0')}</span><div><b>${escapeHtml(mission.title)}</b><small>${mission.id === 'participation-xp' ? 'Your settled XP and source history' : 'Collective milestones and confirmed burn receipts'}</small></div><strong>${mission.id === 'participation-xp' ? 'VIEW XP' : 'VIEW BURNS'} →</strong></button>`).join('')}</section>
    </section>`;
 }

function operationsScreen() {
  const c = state.campaign || fallbackCampaign;
  const startFact = operationStartFact();
  const op = operationNumber();
  // Preserve old internal links while giving every visible section one name.
  if (['progress', 'intel'].includes(state.operationsView)) state.operationsView = 'overview';
  if (state.operationsView === 'rewards') state.operationsView = 'economics';
  let content;
  if (state.operationsView === 'missions') content = operationMissionsMarkup(c);
  else if (state.operationsView === 'economics') content = operationEconomicsMarkup(c);
  else content = `<section class="operation-content-panel operation-overview-panel">
    ${operationCurrentOrderMarkup()}
    <div class="operation-progress-line"><span>OPERATION STATUS</span><strong>${escapeHtml(operationScheduleDisplayLabel(c))}${Number(state.runtime?.schedule?.currentCycle || 0) ? ` · CYCLE ${Number(state.runtime.schedule.currentCycle)} / 5` : ''}</strong></div>
    <div class="briefing-clearance"><span>CLEARANCE ${clearanceCountLabel()}</span><button data-profile-view="overview">OPEN PROFILE →</button></div>
    <div class="briefing-story"><h3>The operation</h3><p>${escapeHtml(c.description || '')}</p><p>Complete eligible Mission Files. Project Q verifies and settles accepted activity before it contributes to XP, standing and rewards.</p></div>
    <details class="briefing-rules"><summary>Rules & verification <span>⌄</span></summary><p>One Telegram identity, one X account and one verified reward wallet per participant. Founders and admins are excluded from XP and public leaderboards.</p><p>Daily caps: ${Number(c.xpCaps?.participationDaily || 0)} participation XP, ${Number(c.xpCaps?.projectQDaily || 0)} mission XP, ${Number(c.xpCaps?.trendingBotsDaily || 0)} trending XP, and ${Number(c.xpCaps?.overallDaily || 0)} XP overall. Pending or rejected evidence earns no XP.</p><p>Each 48-hour cycle selects the top two eligible participants and three weighted winners from ranks 3–15. Previous-cycle winners have a one-cycle cooldown. Final review takes 48–72 hours.</p><p>Mission-specific instructions and verification rules appear inside each Mission File.</p></details>
    <button class="operation-pool-teaser" data-operation-view="economics"><span><b>OPERATION ECONOMICS</b><strong>Four operation pools</strong><small>Rewards · Diamond Duck · Earn to Burn · Top Duck</small></span><span class="pool-teaser-action">SEE POOLS →</span></button>
    <button class="operation-overview-link" data-screen="readiness">PUBLIC LAUNCH READINESS →</button>
    <button class="q-primary-action" data-operation-view="missions">${operationLifecycleState().label === 'ACTIVE' ? 'CHOOSE A MISSION' : 'PREVIEW MISSIONS'} →</button>
  </section>`;
  const bondCover = String(c.name || '').trim().toLowerCase() === 'bond the duck';
  const coverImage = bondCover ? '/campaign-app/assets/bond-the-duck-terminal-hero-20260927.jpg' : c.banner;
  return `<div class="operations-ui operation-reference">
    ${state.operationsView === 'overview' ? `<section class="operation-cover ${bondCover ? 'bond-cover' : ''}">
      ${coverImage ? `<img src="${escapeHtml(coverImage)}" alt="${escapeHtml(bondCover ? 'Bond the Duck. 10-day verified. Small actions, bigger oceans.' : c.bannerAlt || c.name)}" />` : ''}
      <div class="operation-cover-copy">
        <div class="operation-cover-heading"><span class="operation-kicker">OPERATION ${op}</span>${statePill(operationLifecycleState().label, operationLifecycleState().tone)}</div>
        <h2>${escapeHtml(c.name || 'Bond the Duck')}</h2>
        <p>MISSION // ${escapeHtml(c.tagline || 'Small actions. Bigger oceans.')}</p>

        <div class="operation-facts">
          <div><span>${startFact.label}</span><b>${escapeHtml(startFact.date)}</b></div>
          <div><span>DURATION</span><b>10 DAYS</b></div>
          <div><span>CYCLES</span><b>5 × 48H</b></div>
          <div><span>FINAL REVIEW</span><b>48–72H</b></div>
        </div>
      </div>
    </section>` : `<section class="operation-compact-context"><div><span>OPERATION ${op}</span><h2>${escapeHtml(c.name || 'Bond the Duck')}</h2><small>${escapeHtml(operationLifecycleState().label)} · ${state.operationsView === 'missions' ? `${(c.missions || []).length} OPERATION FILES` : 'OPERATION ECONOMICS'}</small></div><button data-operation-view="overview">BRIEFING →</button></section>`}

    ${operationTabs()}
    ${state.operationsView === 'overview' ? operationLifecycleMarkup() : ''}
    ${content}
  </div>`;
}

function recordTabs() {
  const tabs = [['xp', 'XP'], ['rank', 'Standing'], ['achievements', 'Achievements']];
  return `<div class="record-tabs" role="tablist" aria-label="Record sections">${tabs.map(([id, label]) => `<button class="${state.recordView === id ? 'active' : ''}" data-record-view="${id}" role="tab" aria-selected="${state.recordView === id}">${label}</button>`).join('')}</div>`;
}

function cycleResultsMarkup() {
  const cycles = state.profile.xpByCycle || [];
  return `<section class="record-panel cycle-results"><div class="dossier-heading"><span>Your cycle results</span><b>SETTLED XP</b></div>${cycles.length ? cycles.map(row => `<div class="cycle-result-row"><b>CYCLE ${Number(row.cycleId)}</b><strong>${Number(row.xp || 0).toLocaleString()} XP</strong></div>`).join('') : '<p>No settled cycle XP yet.</p>'}<small>These are your settled XP totals. Winner and payout outcomes appear only after selection and allocation are finalized.</small></section>`;
}

function pastOperationsMarkup() {
  const finished = ['COMPLETED', 'ARCHIVED'].includes(operationLifecycleState().label)
    && Boolean(state.profile.enrolledAt || state.profile.xp > 0 || state.profile.rewards?.recorded);
  const c = state.campaign || fallbackCampaign;
  return `<section class="record-panel past-operations"><div class="dossier-heading"><span>Past operations</span><b>${finished ? '1 OPERATION' : 'NO COMPLETED OPERATIONS'}</b></div>${finished ? `<button data-screen="operations">${escapeHtml(c.name)} · ${escapeHtml(operationLifecycleState().label)} →</button>` : '<p>Completed operation history will appear here. The current operation is still in progress.</p>'}</section>`;
}

function recordScreen() {
  const c = state.campaign || fallbackCampaign;
  const p = state.profile;
  if (state.recordView === 'activity') state.recordView = 'xp';
  const content = state.recordView === 'rank' ? leaderboardScreen() : state.recordView === 'achievements'
    ? achievementsScreen() : xpScreen({ embedded: true });
  return `<div class="record-ui"><section class="record-header record-header-compact"><div><span>YOUR RECORD // ${escapeHtml(c.name)}</span><h2>${escapeHtml(p.name)}</h2><p>Settled XP, standing and operation history.</p></div><div class="record-score"><strong>${Number(p.xp || 0).toLocaleString()}</strong><span>OPERATION XP</span></div></section>${recordTabs()}${content}${pastOperationsMarkup()}</div>`;
}

function rewardsScreen() {
  const c = state.campaign || fallbackCampaign;
  const rewards = state.profile.rewards || {};
  const allocation = rewards.recorded ? formatBaseUnits(rewards.allocatedBaseUnits) : 'NOT ALLOCATED';
  const scheduled = rewards.releaseCount ? formatBaseUnits(rewards.scheduledBaseUnits) : 'NOT SCHEDULED';
  const distributed = rewards.releaseCount ? formatBaseUnits(rewards.distributedBaseUnits) : '0';
  const outstandingBaseUnits = rewards.recorded
    ? subtractBaseUnits(rewards.allocatedBaseUnits, rewards.distributedBaseUnits || '0')
    : null;
  const outstanding = outstandingBaseUnits == null ? 'PENDING' : formatBaseUnits(outstandingBaseUnits);
  const actualReleases = rewards.releases || [];
  const delivery = rewardDeliveryState(rewards);
  const walletReady = Boolean(state.profile.walletVerified && state.wallet && isSolanaAddress(state.wallet));
  const walletLabel = walletReady ? escapeHtml(short(state.wallet)) : 'Not connected';
  const failedBaseUnits = String(rewards.failedBaseUnits || '0');
  const hasFailedRelease = hasPositiveBaseUnits(failedBaseUnits)
    || actualReleases.some(({ status }) => status === 'failed');

  const hasCampaignActivity = Boolean(state.profile.completedMissions > 0 || state.profile.todayXp > 0 || state.profile.xp > 0);
  const hasVerifiedActivity = Boolean(state.profile.xp > 0 || state.profile.activity?.length);
  const hasScheduledRelease = actualReleases.length > 0;
  const hasReleased = actualReleases.some(({ status }) => ['paid','recovered'].includes(status));
  const hasConfirmed = actualReleases.some(({ status, transactionSignature }) =>
    ['paid', 'recovered'].includes(status) && isSolanaSignature(transactionSignature));
  const next = currentNextStep();

  const stages = [
    ['01', 'Participation', hasCampaignActivity, hasCampaignActivity ? 'Campaign activity recorded' : 'Complete eligible campaign activity'],
    ['02', 'Verified', hasVerifiedActivity, hasVerifiedActivity ? 'Activity verified and settled' : 'Awaiting verified Project Q record'],
    ['03', 'Allocated', Boolean(rewards.recorded), rewards.recorded ? 'Reward allocation recorded' : 'Awaiting campaign allocation'],
    ['04', 'Scheduled', hasScheduledRelease, hasScheduledRelease ? 'Release schedule created' : 'Awaiting release schedule'],
    ['05', 'Released', hasReleased, hasReleased ? 'Asset sent to verified wallet' : 'Awaiting treasury-authorized release'],
    ['06', 'Confirmed', hasConfirmed, hasConfirmed ? 'On-chain receipt confirmed' : 'Awaiting finalized transaction receipt'],
  ];

  const allocationReceipts = (rewards.allocations || []).map(item => `<article class="allocation-receipt"><header><span>ALLOCATION RECEIPT</span><b>${escapeHtml(rewardCategoryLabel(item.category))}</b></header><div class="receipt-grid"><div><span>Amount</span><b>${formatBaseUnits(item.amountBaseUnits)} FAWKQ</b></div><div><span>Cycle</span><b>${item.cycleId ? Number(item.cycleId) : 'OPERATION'}</b></div><div><span>Recorded</span><b>${escapeHtml(formatProfileDate(item.createdAt))}</b></div><div><span>Allocation ID</span><b>${escapeHtml(item.id)}</b></div></div><small>Recorded allocation · delivery requires a separate confirmed transaction receipt.</small></article>`).join('');

  const receiptReleases = actualReleases.filter(({ status, transactionSignature }) => ['paid','recovered'].includes(status) || isSolanaSignature(transactionSignature));
  const receiptCards = receiptReleases
    .map((release) => {
      const sig = isSolanaSignature(release.transactionSignature) ? release.transactionSignature : null;
      return `<article class="allocation-receipt">
        <header><span>PROJECT Q // DELIVERY RECEIPT</span><b>OP ${operationNumber()}</b></header>
        <div class="receipt-grid">
          <div><span>Operation</span><b>OP ${operationNumber()}</b></div>
          <div><span>Reason</span><b>${escapeHtml(rewardCategoryLabel(release.category))}${release.cycleId ? ` · CYCLE ${Number(release.cycleId)}` : ''}</b></div>
          <div><span>Recipient</span><b>${escapeHtml(state.profile.name)}</b></div>
          <div><span>Asset</span><b>FAWKQ</b></div>
          <div><span>Amount</span><b>${formatBaseUnits(release.amountBaseUnits)}</b></div>
          <div><span>Status</span><b>${escapeHtml(String(release.status || '').toUpperCase())}</b></div>
          <div><span>Release</span><b>${Number(release.percent || 0)}%</b></div>
          <div><span>Scheduled</span><b>${escapeHtml(formatProfileDate(release.scheduledAt))}</b></div><div><span>Confirmed</span><b>${sig && release.confirmedBlockTime ? escapeHtml(formatProfileDate(release.confirmedBlockTime)) : 'Evidence pending'}</b></div>
        </div>
        ${sig ? `<a href="https://solscan.io/tx/${encodeURIComponent(sig)}" target="_blank" rel="noopener noreferrer">TX ${escapeHtml(short(sig))} ↗</a>` : '<span class="receipt-pending">On-chain receipt pending</span>'}
      </article>`;
    }).join('');

  const releaseRows = actualReleases.map((release) => {
    const status = String(release.status || 'pending').toUpperCase();
    const failed = release.status === 'failed';
    const sig = isSolanaSignature(release.transactionSignature) ? release.transactionSignature : null;
    const confirmed = sig && release.confirmedBlockTime ? formatProfileDate(release.confirmedBlockTime) : null;
    const timing = confirmed
      ? `Confirmed ${confirmed}`
      : ['paid','recovered'].includes(release.status)
        ? `Scheduled ${formatProfileDate(release.scheduledAt)} · confirmation evidence pending`
        : `Scheduled ${formatProfileDate(release.scheduledAt)}`;
    return `<article class="release-row${failed ? ' release-failed' : ''}">
      <div><b>${escapeHtml(rewardCategoryLabel(release.category))}${release.cycleId ? ` · CYCLE ${Number(release.cycleId)}` : ''}</b><small>${escapeHtml(timing)} · ${Number(release.percent || 0)}% release</small></div>
      <div class="release-row-result"><strong>${formatBaseUnits(release.amountBaseUnits)} FAWKQ</strong><span>${escapeHtml(status)}</span></div>
    </article>`;
  }).join('');

  return `<div class="rewards-operations-ui">
    <section class="rewards-command">
      <div>
        <span>PROJECT Q REWARDS</span>
        <h2>${rewards.recorded ? escapeHtml(compactPoolAmount(allocation)) : 'Awaiting allocation'}</h2>
        <b>${rewards.recorded ? 'FAWKQ ALLOCATED' : 'CAMPAIGN REWARDS'}</b>
        ${rewards.recorded ? `<small class="reward-exact-amount">${escapeHtml(allocation)} FAWKQ recorded</small>` : ''}
        <p>${rewards.recorded ? 'Your recorded allocation moves through the release schedule.' : 'Allocation appears here after eligible participation is verified and campaign rewards are finalized.'}</p>
      </div>
      <div class="reward-status-card">
        ${statePill(delivery.label, delivery.tone)}
        <small>${walletReady ? 'Verified wallet' : 'Reward wallet needed'}</small>
        <b>${walletLabel}</b>
      </div>
    </section>

    <section class="reward-next-action"><div><span>NEXT STEP</span><b>${escapeHtml(hasFailedRelease ? 'Release recovery review' : next.title)}</b><small>${escapeHtml(hasFailedRelease ? 'A failed release remains visible until treasury-authorized recovery is finalized.' : next.detail)}</small></div></section>

    ${hasFailedRelease ? `<section class="reward-recovery-alert">
      <div>
        <span>RELEASE RECOVERY</span>
        <h3>Recovery Review Required</h3>
        <p>${hasPositiveBaseUnits(failedBaseUnits) ? `${formatBaseUnits(failedBaseUnits)} FAWKQ is recorded in failed release state. ` : ''}Project Q does not count a failed release as distributed. The record remains visible until a treasury-authorized recovery is finalized.</p>
        <small>No claim transaction or private-key action is required from the participant.</small>
      </div>
      ${statePill('RECOVERY REVIEW', 'blocked')}
      <button data-screen="operations">OPEN OPERATIONS →</button>
    </section>` : ''}

    <details class="reward-pipeline" data-persist-open="reward-pipeline">
      <summary data-persist-focus="reward-pipeline"><span>Reward Pipeline <b>${escapeHtml(delivery.label)}</b></span><em>VIEW ALL 6 STAGES <i aria-hidden="true">⌄</i></em></summary>
      <div class="pipeline-steps">
        ${stages.map(([number,label,complete,detail]) => `<article class="${complete ? 'complete' : ''}">
          <span>${number}</span>
          <div><b>${label}</b><small>${detail}</small></div>
          <i>${complete ? '✓' : '○'}</i>
        </article>`).join('')}
      </div>
    </details>

    ${rewards.recorded ? `<section class="reward-summary-grid" aria-label="Your recorded reward amounts">
      <article><span>Allocated</span><strong>${escapeHtml(compactPoolAmount(allocation))}</strong><small>${escapeHtml(allocation)} FAWKQ · recorded</small></article>
      <article><span>Scheduled</span><strong>${escapeHtml(compactPoolAmount(scheduled))}</strong><small>${rewards.releaseCount ? `${escapeHtml(scheduled)} FAWKQ · release plan` : 'No release plan yet'}</small></article>
      <article class="distributed"><span>Distributed</span><strong>${escapeHtml(compactPoolAmount(distributed))}</strong><small>${escapeHtml(distributed)} FAWKQ · on-chain</small></article>
      <article><span>Outstanding</span><strong>${escapeHtml(compactPoolAmount(outstanding))}</strong><small>${escapeHtml(outstanding)} FAWKQ · remaining</small></article>
    </section>` : '<section class="reward-awaiting"><b>No allocation recorded yet.</b><p>Your reward amounts appear after participation is verified and the campaign allocation is finalized.</p></section>'}

    <section class="reward-destination">
      <div><span>DESTINATION</span><b>${walletReady ? 'Verified Reward Wallet' : 'Reward Wallet Pending'}</b><small>${walletLabel}</small><em>No claim transaction required.</em></div>
      <button data-screen="profile" data-profile-view="wallet">OPEN WALLET →</button>
    </section>

    ${releaseRows ? `<section class="release-schedule"><div class="dossier-heading"><span>Release Schedule</span><b>${actualReleases.length} RECORD${actualReleases.length === 1 ? '' : 'S'}</b></div><div class="release-rows">${releaseRows}</div></section>` : ''}

    ${allocationReceipts ? `<section class="receipt-section"><div class="dossier-heading"><span>Your allocation receipts</span><b>${(rewards.allocations || []).length} ALLOCATIONS</b></div><div class="receipt-stack">${allocationReceipts}</div></section>` : ''}

    ${receiptCards ? `<section class="receipt-section"><div class="dossier-heading"><span>Your delivery receipts</span><b>${receiptReleases.length} RECEIPT RECORDS</b></div><div class="receipt-stack">${receiptCards}</div></section>` : rewards.recorded ? `<section class="receipt-empty"><span>YOUR RECEIPTS</span><h3>No confirmed receipt yet.</h3><p>On-chain proof appears when an approved release reaches your verified wallet.</p></section>` : ''}

    <section class="reward-transparency-link">
      <button data-operation-view="economics">SEE THE POOLS →</button>
      <button data-explainer="rewards">HOW REWARDS WORK ?</button>
    </section>
  </div>`;
}

function burnsScreen() {
  const c = state.campaign || fallbackCampaign;
  const configured = c.earnToBurn || {};
  const b = state.burns || {
    state: configured.status || 'DRAFT', decimals: 6,
    originalSupplyBaseUnits: configured.originalReferenceSupplyBaseUnits || '1000000000000000',
    currentSupplyBaseUnits: null, totalBurnedBaseUnits: '0', supplyRemovedBps: 0, burnCount: 0,
    nextMilestone: null, receipts: [], unavailable: true,
  };
  const liveMilestones = Array.isArray(b.milestones) && b.milestones.length ? b.milestones : [];
  const configuredMilestones = Array.isArray(configured.milestones) ? configured.milestones : [];
  const milestones = liveMilestones.length ? liveMilestones : configuredMilestones.map((item) => ({
    ...item, state: 'PLANNED', progressBps: 0,
  }));
  const milestone = b.nextMilestone || milestones.find(({ state: milestoneState }) =>
    !['CONFIRMED', 'CANCELLED'].includes(milestoneState)
  );
  const reserveAmount = formatBaseUnits(configured.openingBurnBaseUnits, b.decimals);
  const milestonePlan = milestones.map((item, index) => {
    const exact = formatBaseUnits(item.burnAmountBaseUnits, b.decimals);
    return `<article class="burn-plan-row ${item.state === 'CONFIRMED' ? 'complete' : ''}">
      <div class="burn-plan-row-head"><span>UNLOCK ${String(Number(item.sequence) || index + 1).padStart(2, '0')} / ${String(milestones.length).padStart(2, '0')}</span>${statePill(item.state || 'PLANNED', item.state === 'CONFIRMED' ? 'success' : 'pending')}</div>
      <div class="burn-plan-row-main"><div><b>${escapeHtml(item.label)}</b><small>${Number(item.progressTargetUnits).toLocaleString()} verified campaign XP</small></div><div class="burn-plan-amount"><strong>${escapeHtml(compactPoolAmount(exact))} <span>FAWKQ</span></strong><small>${escapeHtml(exact)} FAWKQ</small></div></div>
    </article>`;
  }).join('');
  const requested = new URLSearchParams(location.search).get('receipt');
  const receipts = (b.receipts || []).map((receipt) => {
    const selected = requested === receipt.receiptCode ? ' selected' : '';
    const explorer = `https://solscan.io/tx/${encodeURIComponent(receipt.signature)}`;
    return `<article class="burn-receipt${selected}"><div><span class="label">CONFIRMED // ${escapeHtml(receipt.receiptCode)}</span><h3>${formatBaseUnits(receipt.amountBaseUnits, b.decimals)} FAWKQ</h3><p>${escapeHtml(receipt.burnType)} · ${escapeHtml(receipt.blockTime)}</p></div><a class="outline-action" href="${explorer}" target="_blank" rel="noopener noreferrer">VIEW ON-CHAIN PROOF →</a></article>`;
  }).join('');
  const header = `<section class="burn-dossier-header"><button class="burn-back" data-operation-view="economics">← OPERATION ECONOMICS</button><div class="burn-header-content"><div><span>PROJECT Q // COLLECTIVE PROGRESS</span><h2>Earn to Burn</h2><p>${escapeHtml(configured.tagline || 'Individual activity earns rewards. Collective activity advances transparent burn milestones.')}</p></div><div class="burn-reserve"><span>CONFIGURED BURN RESERVE</span><strong>${escapeHtml(compactPoolAmount(reserveAmount))} <small>FAWKQ</small></strong><em>${escapeHtml(reserveAmount)} FAWKQ · creator wallet</em></div></div></section>`;
  const plan = `<section class="burn-plan-panel"><header><div><span>FIVE COLLECTIVE UNLOCKS</span><h3>Milestone plan</h3><p>Verified campaign XP advances each milestone. A planned burn is not a confirmed transaction.</p></div><b>${milestones.length} FILES</b></header><div class="burn-plan">${milestonePlan || '<div class="burn-empty"><b>Milestone configuration unavailable</b><p>No burn state is being inferred.</p></div>'}</div></section>`;
  const authorization = `<details class="burn-execution-note"><summary>HOW BURNS ARE AUTHORIZED <span>⌄</span></summary><p>Two founder approvals are recorded before Project Q prepares the exact burn. The creator wallet signs the irreversible transaction; Project Q never stores its private key.</p></details>`;
  if (b.unavailable) {
    return `<div class="burn-dossier burns-unavailable">${header}<section class="burn-ledger-status unavailable"><div><span>VERIFIED LEDGER // SYNCING</span><h3>Burn progress temporarily unavailable</h3><p>Confirmed burns, supply changes and receipts need the authoritative ledger. The milestones below are the configured plan only.</p></div><button data-retry-system>RETRY SYNC →</button></section>${plan}${authorization}</div>`;
  }
  const burned = formatBaseUnits(b.totalBurnedBaseUnits, b.decimals);
  const observed = formatBaseUnits(b.currentSupplyBaseUnits, b.decimals);
  const progress = milestone ? Math.max(0, Math.min(100, Number(milestone.progressBps || 0) / 100)) || 0 : 0;
  return `<div class="burn-dossier">${header}
    <section class="burn-ledger-status verified"><div><span>AUTHORITATIVE BURN LEDGER</span><h3>Verified record</h3><p>Only confirmed on-chain burns appear in the totals and receipts below.</p></div>${statePill(b.state || 'AVAILABLE', 'success')}</section>
    <section class="burn-live-summary" aria-label="Verified burn activity"><article><span>CONFIRMED BURNED</span><strong>${escapeHtml(compactPoolAmount(burned))}</strong><small>${escapeHtml(burned)} FAWKQ · ${escapeHtml(formatPercentBps(b.supplyRemovedBps))} of reference supply</small></article><article><span>ON-CHAIN RECEIPTS</span><strong>${Number(b.burnCount || 0).toLocaleString()}</strong><small>Confirmed transactions</small></article><article><span>OBSERVED SUPPLY</span><strong>${escapeHtml(compactPoolAmount(observed))}</strong><small>${escapeHtml(observed)} FAWKQ · last verified state</small></article></section>
    <section class="burn-next-milestone"><div><span>NEXT COLLECTIVE UNLOCK</span><h3>${milestone ? escapeHtml(milestone.label) : 'No next milestone recorded'}</h3><p>${milestone ? `${Number(b.progressUnits || 0).toLocaleString()} of ${Number(milestone.progressTargetUnits).toLocaleString()} verified campaign XP · ${formatBaseUnits(milestone.burnAmountBaseUnits, b.decimals)} FAWKQ planned` : 'The ledger has no further milestone to advance.'}</p></div>${milestone ? `<div class="burn-progress" role="progressbar" aria-label="Next burn milestone" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div>` : ''}</section>
    ${plan}
    <section class="burn-receipt-panel"><header><div><span>ON-CHAIN EVIDENCE</span><h3>Burn receipts</h3></div><b>${Number(b.burnCount || 0)} CONFIRMED</b></header><div class="burn-receipts">${receipts || '<div class="burn-empty"><b>No confirmed burn receipts</b><p>No Earn to Burn transaction has been executed or confirmed.</p></div>'}</div></section>
    ${authorization}
  </div>`;
}

function formatProfileDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function missionName(code, source) {
  const mission = state.campaign?.missions?.find(({ id }) => id === code);
  if (mission) return mission.title;
  if (code) return String(code).split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  return `${String(source || 'Verified').charAt(0).toUpperCase()}${String(source || 'verified').slice(1)} activity`;
}

function profileWallet() {
  const p = state.profile;
  const status = state.walletStatus || {};
  const wallet = state.wallet && isSolanaAddress(state.wallet) ? state.wallet : null;
  const tokenAccount = p.tokenAccount && isSolanaAddress(p.tokenAccount) ? p.tokenAccount : null;
  const balance = status.available ? formatBaseUnits(status.balanceBaseUnits, status.decimals) : 'SYNC PENDING';
  const observed = status.observedAt ? formatProfileDate(status.observedAt) : 'Awaiting on-chain sync';
  const allocationLocked = Boolean(p.rewards?.recorded);
  const holderReady = Boolean(p.holderEligible);
  const tokenReady = Boolean(p.tokenAccountReady);
  const walletReady = Boolean(p.walletVerified && wallet);

  return `<div class="passport-wallet-view">
    <section class="passport-wallet-hero">
      <div>
        <span>VERIFIED REWARD DESTINATION</span>
        <h3>${walletReady ? escapeHtml(short(wallet)) : 'No Verified Wallet'}</h3>
        <p>${walletReady
          ? 'This wallet is the current Project Q destination for campaign eligibility and distributions.'
          : 'Verify one reward wallet through Oracle before campaign rewards can be finalized.'}</p>
      </div>
      ${statePill(walletReady ? 'VERIFIED' : 'REQUIRED', walletReady ? 'success' : 'pending')}
    </section>

    ${walletReady ? '' : `<section class="wallet-recovery-action"><b>Wallet verification required</b><p>Open Oracle to verify one reward wallet with a signed message. No transaction or fee is required.</p><button class="gold-action compact" data-clearance-action="wallet-verify">VERIFY WALLET</button><small>Project Q will refresh automatically after Oracle verifies the signed ownership message.</small></section>`}
    <section class="passport-wallet-balance">
      <div><span>FAWKQ BALANCE</span><strong>${balance}</strong><small>Observed ${escapeHtml(observed)}</small></div>
      <button class="outline-action" id="refresh-wallet-balance" ${wallet ? '' : 'disabled'}>Refresh</button>
    </section>

    <section class="passport-wallet-records">
      <article>
        <span>Reward Wallet</span>
        <code>${wallet ? escapeHtml(wallet) : 'Not connected'}</code>
        <button class="text-action" id="copy-wallet" ${wallet ? '' : 'disabled'}>Copy</button>
      </article>
      <article>
        <span>FAWKQ Token Account</span>
        <code>${tokenAccount ? escapeHtml(tokenAccount) : tokenReady ? 'Recorded by Project Q' : 'Requirement incomplete'}</code>
        <button class="text-action" id="copy-token-account" ${tokenAccount ? '' : 'disabled'}>Copy</button>
      </article>
    </section>

    <div class="wallet-eligibility-note"><b>Holding eligibility: ${holderReady ? 'VERIFIED' : 'PENDING'}</b><small>${holderReady ? 'The latest verified holding meets the operation minimum.' : 'Eligibility remains pending until the token account and minimum holding are verified.'}</small></div>

    <section class="identity-system-note wallet-system-note">
      <div class="identity-system oracle-system"><img src="${ORACLE_LOGO}" alt="Oracle" /><span><b>Oracle Ownership</b><small>Oracle verifies the canonical reward-wallet connection.</small></span></div>
      <div class="identity-system q-system"><img src="/campaign-app/assets/project-q-mark-20260929.jpg" alt="Project Q" /><span><b>Project Q Destination</b><small>Q uses the verified wallet for eligibility, allocations and releases.</small></span></div>
    </section>

    <section class="wallet-protection-note">
      <div><span>DESTINATION PROTECTION</span><b>${allocationLocked ? 'Locked after allocation' : 'Changeable before allocation'}</b><small>${allocationLocked ? 'Any wallet recovery requires controlled review because a reward allocation already exists.' : 'A newly verified wallet becomes the campaign destination before allocations are finalized.'}</small></div>
      ${statePill(allocationLocked ? 'PROTECTED' : 'PRE-ALLOCATION', allocationLocked ? 'success' : 'pending')}
    </section>

    <section class="wallet-noncustodial-note">
      <img src="/campaign-app/assets/project-q-mark-20260929.jpg" alt="Project Q" />
      <div><b>Non-custodial by design.</b><small>Project Q cannot sign from your wallet, cannot withdraw funds, and never stores a seed phrase or private key.</small></div>
    </section>
  </div>`;
}

function referralMissionMarkup() {
  const referral = state.referrals || {};
  const counts = referral.counts || {};
  const referralLink = referral.link ? escapeHtml(referral.link) : null;
  const bonusLabel = Number.isInteger(referral.bonusXp) ? `${referral.bonusXp} XP` : 'Amount pending';
  const xInvite = state.campaign?.referrals?.xInviteBonus || {};
  const xInviteBonus = Number.isInteger(xInvite.bonusXp) ? `${xInvite.bonusXp} XP` : 'Amount pending';
  const xInviteState = state.xInvite?.verified ? (state.xInvite.bonusAwarded ? 'XP awarded' : 'Verified') : 'Readiness';
  return `<section class="command-card referral-panel"><div class="referral-head"><div class="referral-brand-copy"><img src="/campaign-app/assets/missions/v3-verified-referrals.webp" alt="" /><div><span class="label">Verified referral mission</span><h2>Invite contributors, not empty accounts.</h2><p>A referral qualifies only after the new participant verifies identity and wallet, purchases at least $${Number(referral.minimumPurchaseUsd || 2)} of FAWKQ and earns verified campaign XP.</p></div></div>${statePill(bonusLabel)}</div>
  <div class="referral-link"><code>${referralLink || 'Referral link unavailable until the campaign database is ready'}</code><button class="outline-action" id="copy-referral" ${referralLink ? '' : 'disabled'}>Copy</button></div>
  <div class="referral-funnel">${metric('Invited', Number(counts.invited || 0))}${metric('Verifying', Number(counts.verifying || 0))}${metric('$2 buy pending', Number(counts.purchasePending || 0))}${metric('Activity pending', Number(counts.participationPending || 0))}${metric('Qualified', Number(counts.qualified || 0))}${metric('Awarded', Number(counts.bonusAwarded || 0))}</div>
  <p class="referral-note">First valid attribution wins. Self-referrals, existing participants, duplicate identities, recycled wallets and unverified purchases earn nothing.</p>
  <div class="x-invite-bonus"><img src="${ORACLE_LOGO}" alt="Oracle" /><div><span class="label">One-time X invite bonus</span><h3>Bring three real people into the conversation.</h3><p>Reply once to the official pinned FAWKQ campaign post and mention exactly three distinct interested people. Oracle verifies the linked X author, reply target and mentions.</p><small>${escapeHtml(xInviteBonus)} · ${escapeHtml(xInviteState)}</small></div>${statePill(xInviteState, state.xInvite?.verified ? 'success' : 'pending')}</div></section>`;
}

function campaignPassportMarkup() {
  const p = state.profile;
  const synced = state.sessionStatus === 'verified';
  const cycle = Number(state.runtime?.schedule?.currentCycle || 0);
  const cycleXp = (p.xpByCycle || []).find(row=>Number(row.cycleId) === cycle)?.xp || 0;
  const nextRelease = (p.rewards?.releases || []).filter(row=>['scheduled','proposed','reserve'].includes(row.status) && Number.isFinite(Date.parse(row.scheduledAt || ''))).sort((a,b)=>Date.parse(a.scheduledAt)-Date.parse(b.scheduledAt))[0];
  const definitions = achievementDefinitions();
  const verifiedRecords = (p.achievementRecords || []).filter(record=>record?.achievementId && record.verificationState === 'VERIFIED');
  const verifiedIds = new Set(verifiedRecords.map(record=>record.achievementId));
  const latestRecord = [...verifiedRecords].sort((a,b)=>Date.parse(b.awardedAt || 0)-Date.parse(a.awardedAt || 0))[0] || null;
  const latestAchievement = latestRecord ? definitions.find(item=>item.id === latestRecord.achievementId) : null;
  const nextAchievement = definitions.map(definition=>({ definition, progress: achievementProgress(definition) }))
    .find(item=>!verifiedIds.has(item.definition.id) && item.progress.state !== 'classified');
  const focus = latestAchievement
    ? { definition: latestAchievement, progress: achievementProgress(latestAchievement), eyebrow: 'LATEST VERIFIED' }
    : nextAchievement
      ? { ...nextAchievement, eyebrow: 'NEXT ACHIEVEMENT' }
      : null;
  const syncedAchievements = verifiedRecords.filter(record=>record.universalProfileSync === 'DELIVERED').length;
  const queuedAchievements = Math.max(0, verifiedRecords.length - syncedAchievements);
  const universalStatus = !synced ? 'SYNC PENDING'
    : verifiedRecords.length && queuedAchievements === 0 ? 'CURRENT'
      : queuedAchievements ? 'SYNC QUEUED'
        : 'NO AWARDS YET';
  return `<section class="campaign-passport"><header><div><span>OP ${operationNumber()} // CAMPAIGN PASSPORT</span><h3>${escapeHtml(state.campaign?.name || 'Operation')}</h3></div>${statePill(operationLifecycleState().label,operationLifecycleState().tone)}</header><div class="passport-live-metrics">${[['Operation XP',synced ? Number(p.xp || 0).toLocaleString() : '—'],['Standing',synced ? p.rank && p.rank !== '—' ? p.rank : 'UNRANKED' : '—'],['Current cycle',cycle ? `${cycle} / ${(state.campaign?.schedule?.cycles || []).length || 5}` : 'PENDING'],['Cycle XP',synced && cycle ? Number(cycleXp).toLocaleString() : '—']].map(([label,value])=>`<div><span>${label}</span><strong>${escapeHtml(String(value))}</strong></div>`).join('')}</div><p>${synced ? 'Settled contribution builds your operation history.' : 'Your personal record loads after Telegram identity and Oracle synchronization.'}</p><details class="passport-contribution-detail"><summary>Contribution details <span>⌄</span></summary>${contributionBreakdownMarkup()}<small>${synced ? `${Number(p.completedMissions || 0)} mission codes with settled XP · ${(p.activity || []).length} recent ledger entries` : 'Mission progress awaiting synchronization.'}</small></details></section>
  <section class="passport-recognition"><header><span>ACHIEVEMENT IN FOCUS</span><button data-record-view="achievements">VIEW ALL →</button></header>${focus ? `<button type="button" class="passport-recognition-focus" data-achievement-id="${escapeHtml(focus.definition.id)}"><img src="${escapeHtml(focus.definition.image)}" alt="" /><div><small>${escapeHtml(focus.eyebrow)}</small><b>${escapeHtml(focus.definition.label)}</b><p>${escapeHtml(focus.progress.detail)}</p><span>${escapeHtml(focus.progress.label)}</span></div><strong aria-hidden="true">›</strong></button>` : '<p>Recognition objectives are being prepared.</p>'}</section>
  <section class="passport-outcomes"><header><span>YOUR OUTCOMES</span><b>${synced ? 'OPERATION RECORD' : 'SYNC PENDING'}</b></header><div><span>Allocated rewards</span><strong>${synced && p.rewards?.recorded ? `${escapeHtml(compactPoolAmount(formatBaseUnits(p.rewards.allocatedBaseUnits)))} FAWKQ` : synced ? 'NOT RECORDED' : 'SYNC PENDING'}</strong></div><div><span>Next scheduled release</span><strong>${synced && nextRelease ? escapeHtml(formatProfileDate(nextRelease.scheduledAt)) : synced ? 'NOT SCHEDULED' : 'SYNC PENDING'}</strong></div><button data-screen="rewards">VIEW REWARDS →</button><p>Ocean contribution receipts remain distinct from documented conservation work.</p><button data-screen="ocean">OCEAN IMPACT →</button></section>
  <section class="passport-universal"><header><div><span>UNIVERSAL RECORD</span><b>Contribution review & settlement</b></div>${statePill(universalStatus, queuedAchievements ? 'pending' : verifiedRecords.length ? 'success' : 'pending')}</header><p>Project Q records operation outcomes. Qualifying lifetime XP, rank and reputation require Oracle confirmation; no lifetime award is inferred here.</p><div class="passport-universal-stats"><span><b>${verifiedRecords.length}</b><small>VERIFIED ACHIEVEMENTS</small></span><span><b>${syncedAchievements}</b><small>PROFILE SYNCED</small></span></div><button type="button" data-achievement-view="history">VIEW VERIFIED HISTORY →</button></section>`;
}

function universalProfileHeroMarkup() {
  const p = state.profile;
  const synced = state.sessionStatus === 'verified';
  const army = synced ? p.crabArmy : null;
  const identityLabel = p.username ? `@${p.username.replace(/^@/, '')}` : (p.name || 'Oracle identity syncing');
  const definitions = achievementDefinitions();
  const universalRecords = (p.achievementRecords || [])
    .filter(record => record?.verificationState === 'VERIFIED' && record?.universalProfileSync === 'DELIVERED');
  const earned = universalRecords
    .map(record => definitions.find(item => item.id === record.achievementId))
    .filter(Boolean)
    .slice(0, 3);
  const progress = army ? Math.max(0, Math.min(100, Number(army.progressPct || 0))) : 0;
  const rankLabel = army ? `LVL ${Number(army.level)} · ${army.rankName}` : 'CRAB ARMY SYNCING';
  const nextLabel = army
    ? army.nextRankName
      ? `${Number(army.xpToNext || 0).toLocaleString()} XP to ${army.nextRankName}`
      : 'Maximum Crab Army rank reached'
    : 'Oracle progression unavailable';
  const qualifiedReferrals = Number(state.referrals?.counts?.qualified || 0);
  const photo = safeHttpsUrl(p.photoUrl) || '/campaign-app/assets/system/q-id.webp';

  return `<section class="universal-profile-hero" aria-label="Oracle Universal Profile">
    <div class="universal-profile-main">
      <div class="universal-profile-avatar">
        <img src="${escapeHtml(photo)}" alt="Your Telegram profile photo" />
        <span class="oracle-verified-mark" aria-label="Oracle verified">✓</span>
      </div>
      <div class="universal-profile-identity">
        <span>ORACLE UNIVERSAL PROFILE</span>
        <h2>${escapeHtml(identityLabel)}</h2>
        <b>CRAB ARMY</b>
        <p>${army ? escapeHtml(army.division) : 'Permanent ecosystem identity'}</p>
        <div class="universal-badge-row">
          ${earned.length ? earned.map(item => `<button type="button" data-achievement-id="${escapeHtml(item.id)}"><span>✦</span>${escapeHtml(item.label)}</button>`).join('') : '<small>Verified badges will appear here as they sync.</small>'}
        </div>
      </div>
      <div class="universal-rank-block" data-rank-asset="${escapeHtml(army?.badgeAssetKey || 'pending')}">
        <div class="universal-rank-medallion"><span>${army ? Number(army.level) : '—'}</span></div>
        <small>CRAB ARMY RANK</small>
        <strong>${escapeHtml(army?.rankName || 'SYNCING')}</strong>
      </div>
      <div class="universal-level-block">
        <small>LEVEL</small>
        <strong>${army ? Number(army.level) : '—'}</strong>
        <b>${army ? Number(army.lifetimeXp).toLocaleString() + (army.nextRankXp ? ' / ' + Number(army.nextRankXp).toLocaleString() + ' XP' : ' XP') : 'Lifetime XP syncing'}</b>
        <div class="universal-rank-progress" role="progressbar" aria-label="Crab Army rank progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div>
        <span>${army ? progress + '%' : '—'}</span>
        <em>${escapeHtml(nextLabel)}</em>
      </div>
    </div>
    <div class="universal-profile-stats">
      <div><span>LIFETIME XP</span><strong>${army ? Number(army.lifetimeXp).toLocaleString() : '—'}</strong></div>
      <div><span>OPERATION XP</span><strong>${synced ? Number(p.xp || 0).toLocaleString() : '—'}</strong></div>
      <div><span>VERIFIED BADGES</span><strong>${synced ? universalRecords.length : '—'}</strong></div>
      <div><span>QUALIFIED REFERRALS</span><strong>${synced ? qualifiedReferrals.toLocaleString() : '—'}</strong></div>
      <div><span>CLEARANCE</span><strong>${escapeHtml(clearanceCountLabel())}</strong></div>
    </div>
    <div class="universal-profile-footer">
      <div><b>${escapeHtml(rankLabel)}</b><small>Oracle owns lifetime progression · Project Q owns operation scoring.</small></div>
      <button type="button" data-explainer="universal">ABOUT YOUR PROFILE →</button>
    </div>
  </section>`;
}

function profileScreen() {
  const p = state.profile;
  const walletView = state.profileView === 'wallet';
  return `<div class="passport-ui profile-identity-ui">
    ${walletView ? '<button class="burn-back" data-profile-view="overview">← PROFILE</button>' : ''}
    ${universalProfileHeroMarkup()}
    ${walletView ? profileWallet() : `${campaignClearanceReady() ? '' : clearanceMarkup()}${campaignPassportMarkup()}${campaignClearanceReady() ? `<details class="passport-clearance-complete"><summary>Clearance ${clearanceCountLabel()} · verified <span>⌄</span></summary>${clearanceMarkup()}</details>` : ''}<button class="profile-wallet-entry outline-action" data-profile-view="wallet">OPEN WALLET →</button><div class="profile-utilities"><button class="outline-action" id="identity-refresh" ${p.telegramVerified ? '' : 'disabled'}>REFRESH VERIFICATION</button><button class="outline-action" data-replay-tour>REPLAY GUIDE →</button></div><details class="profile-settings"><summary>Profile settings <span>⌄</span></summary><p>Your display name and photo come from Telegram. X and wallet connections are managed through Oracle.</p><button class="outline-action" data-clearance-action="oracle" ${p.telegramVerified && state.runtime?.oracleBotUrl ? '' : 'disabled'}>MANAGE ORACLE CONNECTIONS ↗</button><button class="text-action" id="recover-oracle-identity" ${p.telegramVerified ? '' : 'disabled'}>RECOVER EXISTING ORACLE IDENTITY</button><small>Use recovery only if your X account belongs to an older Oracle profile you can no longer access.</small></details>`}
  </div>`;
}

function oceanImpactScreen() {
  const oceanView = ['mission', 'contribute', 'vault', 'impact', 'community'].includes(state.oceanView)
    ? state.oceanView : 'mission';
  const vault = state.oceanVault?.available && state.oceanVault?.vault === OCEAN_CONSERVATION_VAULT
    && state.oceanVault?.network === 'mainnet-beta' ? state.oceanVault : null;
  const recognition = state.oceanRecognition?.status === 'PROPOSED' ? state.oceanRecognition : null;
  const fawkq = vault?.assets?.FAWKQ;
  const usdc = vault?.assets?.USDC;
  const snapshot = vault
    ? `<div class="ocean-vault-snapshot" aria-label="Finalized vault balances">
        <div><span>SOL IN VAULT</span><strong>${escapeHtml(formatBaseUnits(vault.sol?.balanceLamports, 9))}</strong><small>Observed balance, not conservation spent</small></div>
        <div><span>FAWKQ IN VAULT</span><strong>${fawkq?.available ? escapeHtml(formatBaseUnits(fawkq.balanceBaseUnits, 6)) : 'UNAVAILABLE'}</strong><small>${fawkq?.available ? `<a href="https://solscan.io/account/${escapeHtml(fawkq.tokenAccount)}" data-external-ocean-link target="_blank" rel="noopener noreferrer">VIEW RECEIVING ACCOUNT ↗</a>` : 'Token account not verified'}</small></div>
        <div><span>USDC IN VAULT</span><strong>${usdc?.available ? escapeHtml(formatBaseUnits(usdc.balanceBaseUnits, 6)) : 'NOT READY'}</strong><small>${usdc?.available ? `<a href="https://solscan.io/account/${escapeHtml(usdc.tokenAccount)}" data-external-ocean-link target="_blank" rel="noopener noreferrer">VIEW RECEIVING ACCOUNT ↗</a>` : 'Receiving account not established'}</small></div>
      </div><small class="ocean-vault-observed">Finalized Solana slot ${Number(vault.slot)} · observed ${escapeHtml(new Date(vault.observedAt).toLocaleString('en-CA', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))} UTC. Balances can change.</small>`
    : '<div class="ocean-vault-unavailable">Live vault observation is unavailable. Check the public explorer for current account information.</div>';
  const proof = state.oceanProof;
  const savedReceipts = Array.isArray(state.oceanReceipts) ? state.oceanReceipts : [];
  const personalRecognition = state.oceanRecognitionState;
  const draftMode = state.oceanDraftMode || personalRecognition?.preference?.displayMode || 'ANONYMOUS';
  const draftAlias = state.oceanDraftAlias ?? personalRecognition?.preference?.alias ?? '';
  const contributionDays = Number(personalRecognition?.progress?.days || 0);
  const nextTier = recognition?.tiers?.find((tier) => Number(tier.days) > contributionDays);
  const proofResult = proof?.status === 'MATCHED' || proof?.status === 'RECORDED'
    ? `<div class="ocean-proof-result matched" role="status"><b>${proof.status === 'RECORDED' ? 'VERIFIED DEPOSIT RECEIPT SAVED' : 'FINALIZED TRANSFER MATCHED'}</b><p>${proof.status === 'RECORDED' ? 'Your original asset and amount are saved in Project Q, linked to your CrabStar ID. No campaign XP, badge or conservation expenditure has been issued.' : 'A transfer from your Oracle verified wallet to the conservation vault was found. Save its receipt to add it to your private record.'}</p>${proof.transfers.map((entry) => `<div class="ocean-proof-transfer"><strong>${escapeHtml(formatBaseUnits(entry.amountBaseUnits, entry.decimals))} ${escapeHtml(entry.asset)}</strong><span>Finalized slot ${Number(proof.slot)}</span></div>`).join('')}${proof.status === 'MATCHED' && location.hostname === 'project-q-dev.onrender.com' ? '<button type="button" id="ocean-save-receipt">SAVE VERIFIED RECEIPT →</button>' : ''}<a href="https://solscan.io/tx/${escapeHtml(proof.signature)}" data-external-ocean-link target="_blank" rel="noopener noreferrer">VIEW TRANSACTION ↗</a></div>`
    : proof?.status === 'NO_MATCH'
      ? '<div class="ocean-proof-result" role="status"><b>NO MATCH FOUND</b><p>No finalized supported transfer from your Oracle verified wallet to the approved vault was found in this transaction. Check the wallet, destination, network and signature.</p></div>'
      : proof?.status === 'ERROR'
        ? `<div class="ocean-proof-result" role="status"><b>CHECK UNAVAILABLE</b><p>${escapeHtml(proof.message)}</p></div>` : '';
  return `<div class="ocean-impact-ui">
    <button type="button" class="ocean-back" data-screen="home">← BACK TO TERMINAL</button>
    <button type="button" class="ocean-impact-hero" data-ocean-view="mission" aria-label="Explore the CrabStar Ocean Impact mission"><img src="/campaign-app/assets/crabstar-ocean-impact-card-20260929.jpg" alt="CrabStar Ocean Impact: cleaner oceans, brighter tomorrows, community-powered conservation" /></button>
    <header class="ocean-impact-intro">
      <div><span>CRABSTAR // OCEAN IMPACT</span><h2>One mission. A global community behind it.</h2><p>CrabStar leads the ocean conservation mission. FAWKQ opens the door; Project Q verifies the contributions.</p></div>
      <div class="ocean-intro-actions"><button type="button" data-ocean-view="contribute">CHECK A CONTRIBUTION <span aria-hidden="true">→</span></button><button type="button" data-ocean-view="vault">VERIFY THE VAULT ↗</button></div>
    </header>
    <nav class="ocean-view-nav" aria-label="Ocean Impact sections">
      ${[['mission','MISSION'],['contribute','CONTRIBUTE'],['vault','VAULT'],['impact','IMPACT'],['community','COMMUNITY']].map(([key,label]) => `<button type="button" data-ocean-view="${key}" ${oceanView === key ? 'aria-current="page"' : ''}>${label}</button>`).join('')}
    </nav>
    <section class="ocean-impact-principle" aria-label="How contribution becomes impact" ${oceanView === 'mission' ? '' : 'hidden'}>
      <div><b>01 / CONTRIBUTED</b><p>A finalized transfer to the approved vault.</p></div>
      <div><b>02 / COMMITTED</b><p>Funds assigned to a named conservation initiative.</p></div>
      <div><b>03 / DOCUMENTED</b><p>Work completed with evidence and public updates.</p></div>
    </section>
    <section class="ocean-impact-panel" id="ocean-mission" ${oceanView === 'mission' ? '' : 'hidden'}>
      <span class="ocean-section-label">01 / OUR MISSION</span>
      <h3>Community participation with a purpose.</h3>
      <p>CrabStar and FAWKQ fund the same conservation mission. A verified deposit is a contribution; commitments and completed ocean work get their own evidence.</p>
      <div class="ocean-mission-actions"><button type="button" data-ocean-view="contribute">HOW TO CONTRIBUTE →</button><button type="button" data-ocean-view="impact">FOLLOW THE WORK →</button></div>
    </section>
    <section class="ocean-impact-panel ocean-contribute" id="ocean-contribute" ${oceanView === 'contribute' ? '' : 'hidden'}>
      <div class="ocean-section-head"><span class="ocean-section-label">02 / CONTRIBUTE</span><b>TRANSFER FLOW IN REVIEW</b></div>
      <h3>A clear route to the vault.</h3>
      <p>CrabStar has confirmed the conservation Squads vault. SOL, native Solana USDC and FAWKQ transfer flows will open separately after the wallet integration, token destinations and finalization checks pass.</p>
      <div class="ocean-asset-list"><span>SOL <small>TRANSFER IN REVIEW</small></span><span>USDC <small>${usdc?.available ? 'ACCOUNT OBSERVED' : 'ACCOUNT NOT READY'}</small></span><span>FAWKQ <small>${fawkq?.available ? 'ACCOUNT OBSERVED' : 'ACCOUNT NOT VERIFIED'}</small></span></div>
      <div class="ocean-impact-notice"><b>In-app transfers are not open yet.</b><p>Use the Vault view to verify the destination. This screen does not request a wallet signature or award contribution credit.</p><button type="button" data-ocean-view="vault">VERIFY VAULT DETAILS →</button></div>
      <form class="ocean-proof-form" id="ocean-proof-form">
        <label for="ocean-transaction-signature">CHECK AN EXISTING TRANSFER</label>
        <p>Already sent SOL, native USDC or FAWKQ from your Oracle verified wallet? Check its finalized transaction against the approved vault.</p>
        <div><input id="ocean-transaction-signature" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="90" placeholder="Solana transaction signature" aria-label="Solana transaction signature" required /><button type="submit" ${state.profile.walletVerified ? '' : 'disabled'}>CHECK TRANSFER →</button></div>
        ${state.profile.walletVerified ? '' : '<div class="ocean-proof-setup"><small>Verify your wallet in Oracle to check a transfer.</small><button type="button" data-screen="profile" data-profile-view="identity">VIEW IDENTITY →</button></div>'}
        ${proofResult}
      </form>
      ${state.telegram?.initData && state.profile.walletVerified ? `<div class="ocean-receipt-history"><h4>YOUR SAVED RECEIPTS</h4>${savedReceipts.length ? savedReceipts.map((receipt) => `<div class="ocean-receipt-row"><div><strong>${escapeHtml(formatBaseUnits(receipt.amountBaseUnits, receipt.decimals))} ${escapeHtml(receipt.asset)}</strong><small>${escapeHtml(new Date(receipt.blockTime).toLocaleDateString('en-CA', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' }))} UTC · VERIFIED DEPOSIT${receipt.founderDeposit ? ' · PROJECT / FOUNDER' : ''}</small></div><a href="https://solscan.io/tx/${escapeHtml(receipt.signature)}" data-external-ocean-link target="_blank" rel="noopener noreferrer" aria-label="View saved ${escapeHtml(receipt.asset)} receipt on Solscan">VIEW PROOF ↗</a></div>`).join('') : '<p>Saved contributions will appear here after a verified receipt is recorded.</p>'}</div>` : ''}
    </section>
    <section class="ocean-impact-panel" id="ocean-vault" ${oceanView === 'vault' ? '' : 'hidden'}>
      <div class="ocean-section-head"><span class="ocean-section-label">03 / THE VAULT</span><b>MAINNET · SQUADS V4</b></div>
      <h3>CrabStar conservation vault.</h3>
      <p>Founder-confirmed destination. The public explorer identifies this vault as governed by a 2-of-3 Squads V4 multisig. The Bond the Duck reward vault is separate.</p>
      <div class="ocean-vault-address"><span>PUBLIC SOLANA VAULT ADDRESS</span><code>${OCEAN_CONSERVATION_VAULT}</code><a href="${OCEAN_CONSERVATION_EXPLORER}" data-external-ocean-link target="_blank" rel="noopener noreferrer">VERIFY ON SOLSCAN ↗</a></div>
      ${snapshot}
      <small class="ocean-vault-note">Observed vault balances are not contribution totals or documented conservation spending. No campaign XP or impact outcome follows from a balance alone.</small>
    </section>
    <section class="ocean-impact-panel" id="ocean-work" ${oceanView === 'impact' ? '' : 'hidden'}>
      <span class="ocean-section-label">04 / IMPACT IN ACTION</span>
      <h3>Follow the work, not just the balance.</h3>
      <p>Each stage has its own evidence. A vault deposit is a contribution; it does not mean conservation work has been funded or completed.</p>
      <div class="ocean-impact-evidence"><div><b>01 / RECEIVED</b><span>Vault balance observable on Solana</span><button type="button" data-ocean-view="vault">VERIFY VAULT →</button></div><div><b>02 / COMMITTED</b><span>Named initiative and allocation record pending</span></div><div><b>03 / DOCUMENTED</b><span>Spending proof and work update pending</span></div></div>
    </section>
    <section class="ocean-impact-panel" id="ocean-community" ${oceanView === 'community' ? '' : 'hidden'}>
      <span class="ocean-section-label">05 / COMMUNITY IMPACT</span>
      <h3>Every verified contributor has a place.</h3>
      <p>Participation builds an Ocean Impact record alongside Project Q campaigns. Every verified contributor counts; recognition is optional, and project or founder deposits stay separate from community rankings.</p>
      <div class="ocean-impact-notice"><b>Community recognition pending.</b><p>Verified deposit receipts can be saved on Project Q Dev. XP, badges, tiers, standings and shout-outs remain inactive until the rules are approved.</p></div>
      ${personalRecognition ? `<div class="ocean-personal-progress"><div><span>YOUR PRIVATE CONTRIBUTION PROGRESS</span><strong>${contributionDays} verified ${contributionDays === 1 ? 'day' : 'days'}</strong><small>${Number(personalRecognition.progress.contributions)} verified asset receipts · ${Number(personalRecognition.progress.founderReceipts)} founder/project receipts tracked separately</small></div><p>${recognition ? (nextTier ? `${escapeHtml(nextTier.title)} proposed threshold: ${Number(nextTier.days)} days` : 'Proposed tier day thresholds met') : 'Tier rules currently unavailable'} · No tier or badge has been awarded.</p></div>` : ''}
      ${recognition ? `<div class="ocean-recognition-head"><div><span>THE RECOGNITION PROGRAM</span><h4>Build a record across campaigns.</h4></div><em>RULES PROPOSED</em></div>
      <div class="ocean-tier-grid">${recognition.tiers.map((tier, index) => `<article class="ocean-tier"><span>0${index + 1} / OCEAN IMPACT</span><h5>${escapeHtml(tier.title)}</h5><p>${Number(tier.days)} distinct verified contribution ${Number(tier.days) === 1 ? 'day' : 'days'}</p><small>AWARD PENDING ACTIVATION</small></article>`).join('')}</div>
      <details class="ocean-program-details"><summary>VIEW PROPOSED XP, BADGES & BOARDS</summary><div class="ocean-program-grid">
        <article><span>CAMPAIGN XP // PROPOSED</span><h5>Capped, not bought.</h5><p>One qualifying contribution per day could earn ${Number(recognition.campaignXp.base)} base XP; repeat participation could earn ${Number(recognition.campaignXp.repeat)} or ${Number(recognition.campaignXp.consistent)} XP. A ${Number(recognition.campaignXp.campaignCap)} XP campaign cap protects the general leaderboard. Minimum value, pricing evidence and campaign rules still need approval.</p><small>Crab Army lifetime XP remains an Oracle record with separate settlement.</small></article>
        <article><span>OCEAN BADGES // PROPOSED</span><h5>Proof of participation.</h5><p>${recognition.badges.map((badge) => escapeHtml(badge.title)).join(' · ')}. Badges follow verified receipts, never a pasted link alone.</p><small>Milestone and top-contributor distinctions require published rules.</small></article>
        <article><span>COMMUNITY BOARDS // PROPOSED</span><h5>Participation and contribution.</h5><p>All-time and current-campaign counts would include every verified community contributor. A top-value board across SOL, USDC and FAWKQ requires recorded USD pricing at the time of each transfer.</p><small>No currency conversion or rankings are estimated from live vault balances.</small></article>
        <article><span>SHOUT-OUTS // OPT-IN</span><h5>Your identity, your choice.</h5><p>Choose public name, alias or anonymous before recognition goes live. A daily community roll-up can thank opted-in contributors; milestones can earn individual spotlights.</p><small>Nothing posts automatically while this program is in review.</small></article>
      </div></details>
      ${personalRecognition && state.telegram?.initData ? `<form id="ocean-privacy-form" class="ocean-privacy-form"><span>YOUR FUTURE DISPLAY PREFERENCE</span><p>Choose how you would appear if community recognition opens. This choice is private now; no public board or social post is active.</p><label for="ocean-display-mode">DISPLAY AS</label><select id="ocean-display-mode" name="displayMode"><option value="ANONYMOUS" ${draftMode === 'ANONYMOUS' ? 'selected' : ''}>Anonymous</option><option value="PUBLIC" ${draftMode === 'PUBLIC' ? 'selected' : ''}>Telegram display name</option><option value="ALIAS" ${draftMode === 'ALIAS' ? 'selected' : ''}>Alias</option></select>${draftMode === 'ALIAS' ? `<label for="ocean-display-alias">ALIAS</label><input id="ocean-display-alias" name="alias" maxlength="30" minlength="3" required pattern="[A-Za-z0-9_ .-]{3,30}" value="${escapeHtml(draftAlias)}" placeholder="Choose a name for future recognition" />` : ''}<button type="submit">SAVE PRIVACY CHOICE →</button>${state.oceanPreferenceError ? `<small role="alert">${escapeHtml(state.oceanPreferenceError)}</small>` : ''}<small>Shout-outs are off. This preference alone cannot publish your profile or issue XP.</small></form>` : `<div class="ocean-privacy-preview"><span>RECOGNITION CHOICES IN REVIEW</span><b>Public profile</b><b>Alias</b><b>Anonymous</b><small>Saved receipts are private by default. Display controls require a verified Telegram identity.</small></div>`}` : '<div class="ocean-vault-unavailable">Recognition rules are temporarily unavailable. No tiers, XP or public rankings are active.</div>'}
    </section>
    <footer class="ocean-impact-footer"><strong>CRABSTAR</strong><span>THE MISSION</span><i aria-hidden="true">✦</i><strong>PROJECT Q</strong><span>THE CAMPAIGN ENGINE</span></footer>
  </div>`;
}

const screens = {
  home,
  operations: operationsScreen,
  record: recordScreen,
  missions: missionsScreen,
  xp: xpScreen,
  leaderboard: leaderboardScreen,
  rewards: rewardsScreen,
  burns: burnsScreen,
  ocean: oceanImpactScreen,
  profile: profileScreen,
  readiness: readinessScreen,
};

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2800);
}

function render() {
  const c = state.campaign || fallbackCampaign;
  const navTitle = NAV.find(([id]) => id === state.screen)?.[1];
  const screenTitle = state.screen === 'home' ? 'Operations Terminal' : (navTitle || (state.screen === 'ocean' ? 'Ocean Impact' : state.screen === 'burns' ? 'Earn to Burn' : state.screen === 'readiness' ? 'Launch Readiness' : c.name));
  const nav = navMarkup();
  for (const selector of ['#desktop-nav', '#mobile-nav']) {
    const container = document.querySelector(selector);
    if (container.dataset.currentScreen !== state.screen) {
      container.innerHTML = nav;
      container.dataset.currentScreen = state.screen;
    }
  }
  const screen = document.querySelector('#screen');
  const sameScreen = screen.dataset.currentScreen === state.screen;
  const openPanels = sameScreen
    ? [...screen.querySelectorAll('details[open][data-persist-open]')].map((panel) => panel.dataset.persistOpen)
    : [];
  const focusedControl = sameScreen && screen.contains(document.activeElement)
    ? document.activeElement.getAttribute('data-persist-focus') : null;
  const markup = screens[state.screen]();
  screen.classList.add('screen-rendering');
  document.body.classList.toggle('q-terminal', state.screen === 'home');
  screen.innerHTML = state.screen === 'home' ? `${markup}${systemStatusMarkup()}` : `${systemStatusMarkup()}${markup}`;
  screen.dataset.currentScreen = state.screen;
  screen.querySelectorAll('details[data-persist-open]').forEach((panel) => {
    if (openPanels.includes(panel.dataset.persistOpen)) panel.open = true;
  });
  if (focusedControl) screen.querySelectorAll('[data-persist-focus]').forEach((control) => {
    if (control.dataset.persistFocus === focusedControl) control.focus({ preventScroll: true });
  });
  if (state.screen === 'operations') {
    const tabs = screen.querySelector('.operation-tabs');
    const activeTab = tabs?.querySelector('[aria-selected="true"]');
    if (activeTab && tabs.scrollWidth > tabs.clientWidth) {
      const tabBounds = tabs.getBoundingClientRect();
      const activeBounds = activeTab.getBoundingClientRect();
      tabs.scrollLeft += activeBounds.left - tabBounds.left - (tabBounds.width - activeBounds.width) / 2;
    }
  }
  requestAnimationFrame(() => screen.classList.remove('screen-rendering'));
  document.querySelector('#screen-title').textContent = screenTitle;
  document.querySelector('#campaign-sequence').textContent = state.screen === 'home' ? 'PROJECT Q / OPERATIONS TERMINAL' : state.screen === 'operations' ? `PROJECT Q / OP ${operationNumber()}` : state.screen === 'record' ? 'PROJECT Q / PARTICIPANT RECORD' : state.screen === 'ocean' ? 'CRABSTAR / OCEAN IMPACT' : `PROJECT Q / ${c.sequence}`;
  document.querySelector('#account-control .account-copy b').textContent = state.profile.name;
  document.querySelector('#account-name').textContent = `${clearanceCountLabel()} Clearance`;
  const accountImage = document.querySelector('#account-control img');
  if (accountImage) {
    accountImage.onerror = () => {
      accountImage.onerror = null;
      accountImage.src = '/campaign-app/assets/system/q-id.webp';
    };
    accountImage.src = safeHttpsUrl(state.profile.photoUrl) || '/campaign-app/assets/system/q-id.webp';
  }
  document.querySelector('#account-control').classList.toggle('verified', campaignClearanceReady());
  const lifecycle = state.runtime ? operationLifecycleState() : { label: 'SYNCING', tone: 'pending' };
  const railState = document.querySelector('#rail-campaign-state');
  if (railState) railState.textContent = lifecycle.label;
  const network = document.querySelector('#campaign-network-state');
  if (network) {
    network.innerHTML = `<i></i> ${escapeHtml(lifecycle.label)}`;
    network.classList.toggle('live', lifecycle.label === 'ACTIVE');
  }
  document.title = `Project Q — ${c.name}`;
  bind();
  maybeShowAchievementUnlock();
}

function syncTelegramViewport() {
  const tg = state.telegram;
  const height = Number(tg?.viewportHeight || tg?.viewportStableHeight || window.visualViewport?.height || window.innerHeight);
  if (Number.isFinite(height) && height > 0) {
    document.documentElement.style.setProperty('--tg-viewport-height', `${Math.round(height)}px`);
  }
}

function resolveScreenRoute(screen) {
  if (screen === 'missions') {
    state.operationsView = 'missions';
    return 'operations';
  }
  if (screen === 'xp') {
    state.recordView = 'xp';
    return 'record';
  }
  if (screen === 'leaderboard') {
    state.recordView = 'rank';
    return 'record';
  }
  return screen;
}

function updateTelegramBackButton() {
  const backButton = state.telegram?.BackButton;
  if (!backButton) return;
  const dialogOpen = Boolean(document.querySelector('#mission-dialog')?.open);
  const shouldShow = dialogOpen || state.screen !== 'home' || state.navigationStack.length > 1;
  if (shouldShow) backButton.show?.();
  else backButton.hide?.();
}

function navigateBack() {
  const dialog = document.querySelector('#mission-dialog');
  if (dialog?.open) {
    closeMission();
    updateTelegramBackButton();
    return;
  }

  const previous = state.navigationStack.pop();
  if (previous && screens[previous]) {
    state.screen = previous;
  } else {
    state.navigationStack = ['home'];
    state.screen = 'home';
  }
  if (state.screen === 'operations') state.operationsView = 'overview';
  if (state.screen === 'record') state.recordView = 'xp';
  if (state.screen === 'profile') state.profileView = 'overview';
  history.replaceState(null, '', `#${state.screen}`);
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
  state.telegram?.HapticFeedback?.impactOccurred('light');
}

function go(screen, { replace = false, view = null } = {}) {
  screen = resolveScreenRoute(screen);
  if (!screens[screen]) return;
  if (state.screen !== screen) {
    if (!replace) state.navigationStack.push(state.screen);
  }
  if (screen === 'operations') { state.operationsView = view || 'overview'; if (state.operationsView !== 'economics') state.activePool = null; }
  if (screen === 'record') state.recordView = view || 'xp';
  if (screen === 'profile') state.profileView = view || 'overview';
  state.screen = screen;
  history.replaceState(null, '', `#${screen}`);
  render();
  updateTelegramBackButton();
  window.scrollTo({ top: 0, behavior: 'instant' });
  state.telegram?.HapticFeedback?.impactOccurred('light');
  if (screen === 'ocean') {
    state.oceanVault = null;
    Promise.allSettled([loadOceanVaultStatus(), loadOceanRecognition(), loadOceanReceipts(), loadOceanRecognitionState()]).then(() => {
      if (state.screen === 'ocean') render();
    });
  }
}

function renderTabInPlace() {
  const scrollY = window.scrollY;
  render();
  window.scrollTo({ top: scrollY, behavior: 'instant' });
  requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' }));
}

async function postNativeConnection(path, body = {}) {
  if (!state.telegram?.initData) throw new Error('Open Project Q from Telegram to continue.');
  const response = await fetch('/campaign-app/api/connections/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ initData: state.telegram.initData, ...body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'Connection could not be completed.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function startNativeXConnection(intent = 'link') {
  try {
    const result = await postNativeConnection('x/start', { intent });
    sessionStorage.setItem('project-q:pending-verification', 'x');
    toast(intent === 'identity_recovery' ? 'Opening secure X recovery…' : 'Opening X authorization…');
    openExternal(result.authorizeUrl);
  } catch (error) {
    toast(error.message || 'X connection could not be started.');
  }
}

async function startNativeWalletConnection() {
  try {
    toast('Preparing secure wallet verification…');
    const result = await postNativeConnection('wallet/fallback');
    sessionStorage.setItem('project-q:pending-verification', 'wallet');
    openExternal(result.verificationUrl);
  } catch (error) {
    toast(error.message || 'Wallet verification could not be started.');
  }
}
function openOracle() {
  const url = state.runtime?.oracleBotUrl;
  if (!/^https:\/\/t\.me\/[a-zA-Z0-9_]{5,32}$/.test(url || '')) {
    toast('Oracle connection is not ready in this environment.');
    return;
  }
  if (typeof window.Telegram?.WebApp?.openTelegramLink === 'function') {
    window.Telegram.WebApp.openTelegramLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openExternal(url) {
  if (typeof window.Telegram?.WebApp?.openLink === 'function') {
    window.Telegram.WebApp.openLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function websiteVoteSourceState(sourceKey) {
  return state.websiteVotes?.sources?.find((source) => source.sourceKey === sourceKey) || null;
}

function websiteVoteStatusCopy(source) {
  if (!source) return 'Readiness status unavailable';
  if (source.status === 'AVAILABLE') return 'Verified flow available · 1 XP';
  if (source.status === 'IN_PROGRESS') return 'Vote attempt in progress';
  if (source.status === 'PENDING_REVIEW') return 'Proof submitted · review pending';
  if (source.status === 'ON_COOLDOWN') return `Next vote ${formatProfileDate(source.nextAvailableAt)}`;
  if (source.status === 'COMMUNITY_ONLY') return 'Community signal only · no individual XP';
  if (source.status === 'PENDING_CERTIFICATION') return 'Verification pending · no XP yet';
  return 'Individual XP unavailable';
}

const WEBSITE_SOURCE_ICONS = Object.freeze({
  'web:coinmooner': 'coinmooner.png',
  'web:gemfinder': 'gemfinder.png',
  'web:coinmun': 'coinmun.png',
  'web:top100token': 'top100token.ico',
  'web:coinsniper': 'coinsniper.ico',
  'web:coinboom': 'coinboom.png',
  'web:coinbuzzer': 'coinbuzzer.png',
});

function websiteVoteSourcesMarkup(sources, actionEnabled) {
  const cards = sources.map(({ sourceKey, name, url, verificationMode, individualXpEligible }) => {
    let safeUrl = null;
    try {
      const candidate = new URL(String(url || ''));
      if (candidate.protocol === 'https:') safeUrl = candidate.href;
    } catch {}
    const source = websiteVoteSourceState(sourceKey);
    const status = source?.status || (verificationMode === 'AGGREGATE_ONLY' ? 'COMMUNITY_ONLY' : 'UNAVAILABLE');
    const eligible = Boolean(individualXpEligible && verificationMode === 'SCREENSHOT_REVIEW');
    const canStart = Boolean(actionEnabled && safeUrl && status === 'AVAILABLE');
    const description = !source && eligible ? 'Open in Telegram to check verification status'
      : status === 'COMMUNITY_ONLY' ? 'Community signal · no individual XP'
      : status === 'PENDING_CERTIFICATION' ? 'Proof verification pending · no XP yet'
        : status === 'PENDING_REVIEW' ? 'Your proof is under review'
          : status === 'IN_PROGRESS' ? 'Your vote attempt is in progress'
            : status === 'ON_COOLDOWN' ? websiteVoteStatusCopy(source)
              : status === 'AVAILABLE' ? 'Verified vote · 1 XP after review'
                : verificationMode === 'PENDING_LIVE_TEST' ? 'Live test pending · no individual XP'
                  : 'Individual XP unavailable';
    const icon = WEBSITE_SOURCE_ICONS[sourceKey];
    const fallback = sourceKey === 'web:geckoterminal' ? 'GT'
      : sourceKey === 'web:coinscope' ? 'CS'
        : String(name || 'WEB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
    const mark = icon
      ? `<img src="/campaign-app/assets/voting-sources/${icon}" alt="" loading="lazy" decoding="async" />`
      : `<span aria-hidden="true">${fallback}</span>`;
    const card = `<article class="vote-source-card${canStart ? ' vote-source-ready' : ''}">
      <div class="vote-source-heading"><div class="vote-source-identity"><div class="vote-source-mark">${mark}</div><div><h4>${escapeHtml(name)}</h4><p>${escapeHtml(description)}</p></div></div><span class="vote-source-tag${eligible ? ' vote-source-tag-proof' : ''}">${eligible ? 'PROOF SOURCE' : 'COMMUNITY / INFO'}</span></div>
      <div class="vote-source-actions">${safeUrl ? `<a href="${escapeHtml(safeUrl)}" data-external-vote-link target="_blank" rel="noopener noreferrer" aria-label="Visit ${escapeHtml(name)} website">Visit website ↗</a>` : '<span>Website link unavailable</span>'}
      ${canStart ? `<button type="button" data-vote-source-key="${escapeHtml(sourceKey || '')}">Start verified vote →</button>` : ''}</div>
    </article>`;
    return { card, eligible };
  });
  const proofSources = cards.filter(({ eligible }) => eligible);
  const otherSources = cards.filter(({ eligible }) => !eligible);
  const locked = !actionEnabled;
  const activeFlow = Boolean(state.websiteVoteFlow?.attempt);
  return `<section class="mission-file-sources" aria-label="Website voting sources">
    <div class="mission-file-section-title">Website voting</div>
    <p class="vote-source-intro">Choose an official FAWKQ listing. Visiting a website does not earn XP; verified votes require an open mission, a certified source and accepted proof.</p>
    ${activeFlow ? websiteVoteFlowMarkup() : ''}
    <details class="vote-source-group" ${locked || activeFlow ? '' : 'open'}>
      <summary>Verified vote sources <span>${proofSources.length} sites · ${locked ? 'mission locked' : 'check status'} ⌄</span></summary>
      <div class="vote-source-grid">${proofSources.map(({ card }) => card).join('')}</div>
    </details>
    <details class="vote-source-group"><summary>Other websites <span>${otherSources.length} sites · visit anytime ⌄</span></summary>
      <div class="vote-source-grid">${otherSources.map(({ card }) => card).join('')}</div>
    </details>
  </section>`;
}

function websiteVoteFlowMarkup() {
  const flow = state.websiteVoteFlow;
  if (!flow?.attempt || !flow?.source) return '';
  const code = String(flow.challenge || '').slice(0, 12).toUpperCase();
  return `<section class="vote-proof-flow" aria-label="Website vote proof">
    <header><span><small>Active proof attempt</small><b>${escapeHtml(flow.source.name)}</b></span>${statePill('15 MINUTES', 'pending')}</header>
    <div class="vote-proof-code"><span>Project Q proof code</span><strong>${escapeHtml(code)}</strong><small>Keep this screen open. The full challenge stays only in this session.</small></div>
    <ol><li>Complete the vote on the official FAWKQ page.</li><li>Capture the post-vote or cooldown state with the source and FAWKQ visible.</li><li>Return here and submit the original screenshot.</li></ol>
    <div class="vote-proof-expiry"><span>Attempt expires</span><b data-countdown data-target-at="${escapeHtml(flow.attempt.expiresAt || '')}">${escapeHtml(formatCountdown(flow.attempt.expiresAt))}</b></div>
    <label class="vote-proof-picker"><input id="website-vote-proof-file" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" /><span><b>Select screenshot</b><small>JPG, PNG or WebP · maximum 2 MB</small></span><i>＋</i></label>
    <button id="website-vote-proof-submit" class="gold-action compact" type="button" disabled><span><b>Submit private proof</b><small>Project Q verification required before XP</small></span><i>→</i></button>
    <small class="vote-proof-privacy">Crop unrelated notifications, balances and private messages. Evidence is stored privately and is never published in the participant interface.</small>
  </section>`;
}

function storeWebsiteVoteFlow(flow) {
  try {
    if (flow) window.sessionStorage?.setItem(WEBSITE_VOTE_FLOW_SESSION_KEY, JSON.stringify(flow));
    else window.sessionStorage?.removeItem(WEBSITE_VOTE_FLOW_SESSION_KEY);
  } catch { /* tab-only recovery is optional */ }
}

function restoreWebsiteVoteFlow() {
  try {
    const flow = JSON.parse(window.sessionStorage?.getItem(WEBSITE_VOTE_FLOW_SESSION_KEY) || 'null');
    const expiresAt = new Date(flow?.attempt?.expiresAt).getTime();
    const sourceKnown = state.websiteVotes?.sources?.some(({ sourceKey }) => sourceKey === flow?.source?.sourceKey);
    if (!flow?.attempt?.id || !/^[0-9a-f]{64}$/.test(flow?.challenge || '')
      || !sourceKnown || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      storeWebsiteVoteFlow(null);
      return;
    }
    state.websiteVoteFlow = flow;
  } catch {
    storeWebsiteVoteFlow(null);
  }
}

async function refreshWebsiteVoteState() {
  const initData = state.telegram?.initData;
  if (!initData) return false;
  const response = await fetch('/campaign-app/api/votes/status', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });
  if (!response.ok) return false;
  const payload = await response.json();
  state.websiteVotes = payload.websiteVotes || state.websiteVotes;
  return true;
}

function bindMissionDialog(dialog, missionId) {
  dialog.querySelector('#copy-referral')?.addEventListener('click', async () => {
    if (!state.referrals?.link) return;
    try { await navigator.clipboard.writeText(state.referrals.link); toast('Personal referral link copied.'); }
    catch { toast('Copy is unavailable in this browser.'); }
  });

  dialog.querySelector('[data-mission-action]')?.addEventListener('click', () => executeMissionAction(missionId));
  dialog.querySelector('[data-view-requirements]')?.addEventListener('click', () => {
    const section = dialog.querySelector('.mission-clearance');
    section?.querySelector('details')?.setAttribute('open', '');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  dialog.querySelector('[data-view-sources]')?.addEventListener('click', () => dialog.querySelector('.mission-file-sources')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  dialog.querySelectorAll('[data-screen]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.profileView) state.profileView = button.dataset.profileView;
    closeMission();
    go(button.dataset.screen, { view: button.dataset.profileView || null });
  }));
  dialog.querySelectorAll('[data-vote-source-key]').forEach((button) => {
    button.addEventListener('click', () => startWebsiteVote(button.dataset.voteSourceKey));
  });
  dialog.querySelectorAll('[data-external-vote-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      openExternal(link.href);
    });
  });
  const picker = dialog.querySelector('#website-vote-proof-file');
  const submit = dialog.querySelector('#website-vote-proof-submit');
  if (picker && submit) {
    picker.addEventListener('change', () => {
      const file = picker.files?.[0];
      submit.disabled = !file;
      picker.closest('label')?.classList.toggle('selected', Boolean(file));
      if (file) picker.nextElementSibling.querySelector('b').textContent = file.name;
    });
    submit.addEventListener('click', () => submitWebsiteVoteProofFile(picker.files?.[0], submit));
  }
}

function refreshOpenMission() {
  const dialog = document.querySelector('#mission-dialog');
  const mission = state.campaign?.missions?.find(({ id }) => id === state.activeMissionId);
  if (!dialog || !mission) return;
  dialog.innerHTML = missionDetailMarkup(mission);
  bindMissionDialog(dialog, mission.id);
  updateCountdownLabels();
}

async function startWebsiteVote(sourceKey) {
  const initData = state.telegram?.initData;
  if (!initData) { toast('Open Project Q inside Telegram to start verified voting.'); return; }
  try {
    const response = await fetch('/campaign-app/api/votes/attempts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, sourceKey }),
    });
    if (!response.ok) throw new Error('attempt rejected');
    const payload = await response.json();
    state.websiteVoteFlow = {
      attempt: payload.attempt,
      challenge: payload.challenge,
      source: payload.source,
    };
    storeWebsiteVoteFlow(state.websiteVoteFlow);
    const source = websiteVoteSourceState(sourceKey);
    if (source) {
      source.status = 'IN_PROGRESS';
      source.attempt = payload.attempt;
    }
    refreshOpenMission();
    openExternal(payload.source.url);
    toast(`Vote attempt started for ${payload.source.name}. Return with the screenshot.`);
  } catch {
    await refreshWebsiteVoteState().catch(() => false);
    refreshOpenMission();
    toast('That voting source is unavailable, uncertified or still on cooldown.');
  }
}

async function submitWebsiteVoteProofFile(file, button) {
  const flow = state.websiteVoteFlow;
  const initData = state.telegram?.initData;
  if (!flow?.attempt || !flow.challenge || !initData || !file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    toast('Use an original JPG, PNG or WebP screenshot under 2 MB.');
    return;
  }
  button.disabled = true;
  button.classList.add('loading-action');
  try {
    const response = await fetch('/campaign-app/api/votes/proof', {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        'x-project-q-init-data': initData,
        'x-project-q-vote-attempt': String(flow.attempt.id),
        'x-project-q-vote-challenge': flow.challenge,
      },
      body: file,
    });
    if (!response.ok) throw new Error('proof rejected');
    state.websiteVoteFlow = null;
    storeWebsiteVoteFlow(null);
    await refreshWebsiteVoteState();
    refreshOpenMission();
    toast('Proof submitted privately. Project Q review is pending.');
  } catch {
    button.disabled = false;
    button.classList.remove('loading-action');
    toast('Proof was not accepted. Check the attempt timer and image format.');
  }
}

function missionStatusSummaryMarkup(mission, telemetry) {
  const stateInfo = canonicalMissionState(mission, telemetry);
  const verified = Number(telemetry?.verified || 0);
  const pending = Number(telemetry?.pending || 0);
  const target = Number(telemetry?.target || 0);
  const lockReason = stateInfo.label === 'LOCKED' ? missionLockReason(mission) : null;
  const order = lockReason?.title
    || (['VERIFYING', 'SUBMITTED'].includes(stateInfo.label) ? 'Your activity is under verification.'
      : stateInfo.label === 'COOLDOWN' ? 'Wait for the next eligible source window.'
      : stateInfo.label === 'COMPLETE' ? 'Mission target verified. Review your record.'
      : mission.readOnlyAction ? (mission.actionLabel || 'Review your campaign record.')
      : missionListCopy(mission)[0] + '.');
  const canAct = operationLifecycleState().label === 'ACTIVE' && mission.enabled && campaignClearanceReady();
  const viewOnly = mission.readOnlyAction && !canAct;
  const button = canAct && mission.id === 'website-voting'
    ? '<button type="button" data-view-sources>VIEW CERTIFIED SOURCES →</button>'
    : canAct || viewOnly
      ? `<button type="button" data-mission-action="${escapeHtml(mission.id)}">${escapeHtml(mission.actionLabel || 'Start Mission')} →</button>`
      : '<button type="button" data-view-requirements>VIEW REQUIREMENTS →</button>';
  return `<section class="mission-current-order">
    <span>CURRENT ORDER</span><h3>${escapeHtml(order)}</h3>
    ${target > 0 ? `<div class="mission-order-progress"><span>VERIFIED PROGRESS</span><b>${verified} / ${target} verified${pending ? ` · ${pending} pending` : ''}</b></div><div class="mission-order-track"><i style="width:${Math.min(100, Math.round(verified / target * 100))}%"></i></div>` : telemetry?.detail ? `<small>${escapeHtml(telemetry.detail)}</small>` : ''}
    ${button}
  </section>`;
}

function missionClearanceMarkup() {
  const checks = campaignEligibilityRequirements();
  const next = checks.find(item => !item.complete);
  return `<section class="mission-clearance"><div class="mission-clearance-head"><div><span>CLEARANCE</span><b>${next ? escapeHtml(next.label) + ' pending' : 'Clearance complete'}</b></div><strong>${clearanceCountLabel()}</strong></div>${next ? '<button class="outline-action" data-screen="profile">VIEW CLEARANCE →</button>' : '<p>Availability also depends on the operation and source status.</p>'}</section>`;
}

function missionDetailMarkup(mission) {
  const telemetry = missionTelemetry(mission);
  const actionEnabled = Boolean((operationLifecycleState().label === 'ACTIVE' && mission.enabled && campaignClearanceReady()) || mission.readOnlyAction);
  const requirements = Array.isArray(mission.requirements) ? mission.requirements : [];
  const sourceConfig = state.campaign?.verificationSources || {};
  const configuredSources = mission.id === 'website-voting'
    ? (Array.isArray(sourceConfig.websiteVoting) ? sourceConfig.websiteVoting : [])
    : mission.id === 'trending-bots' && Array.isArray(sourceConfig.telegramBots)
      ? sourceConfig.telegramBots.map((name) => ({
        sourceKey: `telegram:${String(name).replace(/^@/, '').toLowerCase()}`,
        name,
        url: `https://t.me/${String(name).replace(/^@/, '')}`,
        cooldownSeconds: Number(sourceConfig.telegramBotCooldownSeconds?.[name] || 0),
        cooldownCertification: sourceConfig.telegramBotCooldownCertification?.[name] || 'PENDING_EXACT',
      }))
      : [];

  const sourceList = configuredSources.length
    ? mission.id === 'website-voting' ? websiteVoteSourcesMarkup(configuredSources, actionEnabled) : `<div class="mission-source-list">${configuredSources.map(({ sourceKey, name, url, cooldownSeconds, cooldownCertification, verificationMode, individualXpEligible }) => {
      let safeUrl = null;
      try {
        const candidate = new URL(String(url || ''));
        if (candidate.protocol === 'https:') safeUrl = candidate.href;
      } catch {}
      const cooldown = cooldownCertification === 'PENDING_EXACT'
        ? 'Exact cooldown pending certification'
        : cooldownSeconds >= 3600
          ? `${cooldownSeconds / 3600}-hour cooldown`
          : 'Cooldown verified at action time';
      const websiteState = verificationMode === 'SCREENSHOT_REVIEW'
        ? 'Nonce-bound proof review'
        : verificationMode === 'AGGREGATE_ONLY'
          ? 'Community signal only · no individual XP'
          : verificationMode === 'PENDING_LIVE_TEST'
            ? 'Live certification pending · no XP'
            : verificationMode === 'SOURCE_UNAVAILABLE'
              ? 'Source not certified for individual XP'
              : null;
      const runtimeSource = sourceKey ? websiteVoteSourceState(sourceKey) : null;
      const runtimeStatus = runtimeSource?.status || null;
      const telegramSource = String(sourceKey || '').startsWith('telegram:')
        ? state.telegramTrendingSources.find((source) => source.sourceKey === sourceKey)
        : null;
      const sourceActionEnabled = actionEnabled && Boolean(safeUrl)
        && (verificationMode ? Boolean(individualXpEligible) && runtimeStatus === 'AVAILABLE'
          : telegramSource ? telegramSource.accepting : true);
      const sourceState = verificationMode
        ? (runtimeSource ? websiteVoteStatusCopy(runtimeSource) : websiteState)
        : telegramSource
          ? telegramSource.status === 'AVAILABLE'
            ? `${telegramSource.verificationMode === 'PAIRED_CONTEXT' ? 'Paired receipt' : 'Direct receipt'} · verified`
            : String(telegramSource.status || 'Readiness gated').replaceAll('_', ' ').toLowerCase()
          : (actionEnabled ? 'Official destination' : 'Readiness gated');
      const content = `<span><b>${escapeHtml(name)}</b><small>${escapeHtml(`${cooldown} · ${sourceState}`)}</small></span><i>${sourceActionEnabled ? 'START' : runtimeStatus === 'PENDING_REVIEW' ? 'PENDING' : '🔒'}</i>`;
      if (verificationMode) {
        return `<button type="button" data-vote-source-key="${escapeHtml(sourceKey || '')}" ${sourceActionEnabled ? '' : 'disabled'}>${content}</button>`;
      }
      return sourceActionEnabled && safeUrl
        ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${content}</a>`
        : `<div>${content}</div>`;
    }).join('')}</div>`
    : '';

  const evidence = telemetry && ('verified' in telemetry)
    ? `<div class="mission-detail-evidence"><div><span>Verified</span><b>${Number(telemetry.verified || 0)}</b></div>${mission.id === 'trending-bots' ? `<div><span>Pushes</span><b>${Number(telemetry.pushPoints || 0)}</b></div>` : ''}<div><span>Pending</span><b>${Number(telemetry.pending || 0)}</b></div><div><span>Rejected</span><b>${Number(telemetry.rejected || 0)}</b></div></div>`
    : `<div class="mission-personal-line"><span>Personal status</span><b>${escapeHtml(telemetry?.detail || 'No verified participant record yet')}</b></div>`;

  const oracleMission = mission.id === 'oracle-raids';
  const providerName = oracleMission ? 'Oracle' : 'Project Q';
  const providerLogo = oracleMission ? ORACLE_LOGO : '/campaign-app/assets/project-q-mark-20260929.jpg';
  const status = canonicalMissionState(mission, telemetry).label;
  const fileIndex = (state.campaign?.missions || []).findIndex(({ id }) => id === mission.id) + 1;
  const [, shortReward, shortFrequency] = missionListCopy(mission);

  return `<form method="dialog" class="mission-sheet mission-file-sheet">
    <button class="mission-sheet-close" value="close" aria-label="Close mission file">×</button>

    <header class="mission-file-header">
      <div class="mission-file-heading">
        <span>MISSION FILE // MF-${String(fileIndex).padStart(2,'0')}</span>
        <small>${escapeHtml(state.campaign?.name || 'Operation')}</small>
      </div>
      <div class="mission-file-title-row">
        <div class="mission-file-provider ${oracleMission ? 'oracle-provider' : ''}">
          <img src="${providerLogo}" alt="${escapeHtml(providerName)}" />
        </div>
        <div>
          <h2>${escapeHtml(mission.title)}</h2>
          <p>${escapeHtml(missionListCopy(mission)[0])}</p>
        </div>
      </div>
    </header>

    <section class="mission-file-facts" aria-label="Mission status, reward and frequency"><span class="mission-fact-status">${escapeHtml(status)}</span><span class="mission-fact-reward">${escapeHtml(shortReward)}</span><span>${escapeHtml(shortFrequency)}</span></section>

    ${missionStatusSummaryMarkup(mission, telemetry)}

    ${missionClearanceMarkup()}
    ${mission.readOnlyAction && operationLifecycleState().label !== 'ACTIVE' ? '<small class="mission-read-only-note">Read-only access · no new campaign credit is created from this action.</small>' : ''}

    ${mission.id === 'verified-referrals' ? referralMissionMarkup() : ''}
    ${mission.id === 'community-pulse' ? communityPulsePanel() : ''}
    ${mission.id === 'buy-to-earn' ? buyPositionMarkup() : ''}
    ${mission.id === 'website-voting' ? sourceList : sourceList ? `<details class="mission-file-disclosure"><summary>Registered Sources <span>⌄</span></summary><div class="mission-file-disclosure-body">${sourceList}</div></details>` : ''}

    <details class="mission-file-disclosure" open>
      <summary>Objective <span>⌄</span></summary>
      <div class="mission-file-disclosure-body">
        <p>${escapeHtml(mission.description)}</p><ol>${requirements.map((requirement) => `<li>${escapeHtml(requirement)}</li>`).join('')}</ol>
      </div>
    </details>

    <details class="mission-file-disclosure">
      <summary>Verification <span>⌄</span></summary>
      <div class="mission-file-disclosure-body"><p>${escapeHtml(mission.verification || 'Verification rules will be published before this mission opens.')}</p>${evidence}<p>Opening a destination alone does not create verified credit.</p></div>
    </details>

    <details class="mission-file-disclosure">
      <summary>Reward <span>⌄</span></summary>
      <div class="mission-file-disclosure-body"><p>${escapeHtml(mission.reward)} · ${escapeHtml(mission.frequency || 'Campaign')}</p><p>Accepted outcomes settle into your Project Q record, subject to the configured campaign caps.</p></div>
    </details>

    <section class="verification-provider ${oracleMission ? 'oracle-verification' : 'q-verification'}">
      <img src="${providerLogo}" alt="${escapeHtml(providerName)}" />
      <div><span>${oracleMission ? 'INTELLIGENCE / VERIFICATION PROVIDER' : 'RECORD / SETTLEMENT LAYER'}</span><b>${escapeHtml(providerName)}</b><small>${oracleMission ? 'Oracle verifies supported activity. Project Q records accepted outcomes.' : 'Project Q verifies supported campaign records and settles accepted outcomes.'}</small></div>
      ${statePill(status, status === 'VERIFIED' ? 'success' : status === 'REJECTED' ? 'blocked' : 'pending')}
    </section>
  </form>`;
}

function closeMission() {
  const dialog = document.querySelector('#mission-dialog');
  state.activeMissionId = null;
  if (dialog?.open) dialog.close();
  updateTelegramBackButton();
}

function executeMissionAction(missionId) {
  closeMission();
  if (missionId === 'oracle-raids') return openOracle();
  if (missionId === 'bagwork') return openExternal('https://fawkq.com/bagwork');
  if (missionId === 'buy-to-earn') return openMission('buy-to-earn');
  if (missionId === 'verified-referrals') return openMission('verified-referrals');
  if (missionId === 'earn-to-burn') return go('burns');
  if (missionId === 'community-pulse') return openMission('community-pulse');
  if (missionId === 'participation-xp') return go('record');
  const mission = state.campaign?.missions?.find(({ id }) => id === missionId);
  toast(`${mission?.title || 'Mission'} source launcher is not available.`);
}

function openMission(missionId) {
  if (missionId === 'participation-xp') return go('record');
  if (missionId === 'earn-to-burn') { state.activePool = 'earnToBurn'; return go('operations', { view: 'economics' }); }
  const mission = state.campaign?.missions?.find(({ id }) => id === missionId);
  const dialog = document.querySelector('#mission-dialog');
  if (!mission || !dialog) return;
  state.activeMissionId = missionId;
  dialog.innerHTML = missionDetailMarkup(mission);
  dialog.onclick = (event) => {
    if (event.target === dialog) closeMission();
  };
  dialog.onclose = () => { state.activeMissionId = null; };
  bindMissionDialog(dialog, missionId);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  updateTelegramBackButton();
}

function tourStorageKey() {
  const id = state.telegram?.initDataUnsafe?.user?.id || 'guest';
  return `project-q:app-tour:v2:${id}`;
}

function hasCompletedTour() {
  if (Number(state.preferences?.appTourVersion || 0) >= APP_TOUR_VERSION) return true;
  try { return localStorage.getItem(tourStorageKey()) === `complete:v${APP_TOUR_VERSION}`; }
  catch { return false; }
}

async function saveTourCompletion() {
  state.preferences = {
    appTourVersion: APP_TOUR_VERSION,
    appTourCompletedAt: new Date().toISOString(),
  };
  try { localStorage.setItem(tourStorageKey(), `complete:v${APP_TOUR_VERSION}`); }
  catch {}

  const initData = state.telegram?.initData;
  if (!initData) return;
  try {
    const response = await fetch('/campaign-app/api/preferences/tour', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initData, version: APP_TOUR_VERSION }),
    });
    if (!response.ok) return;
    const payload = await response.json();
    if (payload?.preferences) state.preferences = payload.preferences;
  } catch {}
}

function tourWelcomeMarkup(source = 'auto') {
  const replay = source === 'manual';
  return `<div class="tour-welcome-card" role="dialog" aria-label="Welcome to Project Q">
    <div class="tour-welcome-mark"><img src="/campaign-app/assets/project-q-mark-20260929.jpg" alt="" /></div>
    <span class="label">${replay ? 'Project Q Guide' : 'Welcome to Project Q'}</span>
    <h2>${replay ? 'Replay the Operations Tour' : 'Enter the Operation'}</h2>
    <p>${replay
      ? 'Replay the short guide to Terminal, Mission Files and your campaign Record.'
      : 'Project Q is your verified participation layer. Take a quick look at your next action, missions and campaign Record.'}</p>
    <div class="tour-welcome-path">
      <span>TERMINAL</span><i>→</i><span>OPERATIONS</span><i>→</i><span>RECORD</span>
    </div>
    <div class="tour-welcome-actions">
      <button type="button" class="tour-primary" data-tour-begin>${replay ? 'Replay Tour' : 'Begin Tour'}</button>
      <button type="button" class="tour-secondary" data-tour-dismiss>${replay ? 'Close' : 'Explore on my own'}</button>
    </div>
  </div>`;
}

function showTourWelcome(source = 'auto') {
  const tour = document.querySelector('#app-tour');
  if (!tour) return;
  clearTourTarget();
  state.tour = { active: false, step: 0, source };
  tour.hidden = false;
  tour.innerHTML = `<div class="tour-scrim tour-welcome-scrim"></div>${tourWelcomeMarkup(source)}`;
  requestAnimationFrame(() => tour.classList.add('tour-visible'));
  tour.querySelector('[data-tour-begin]')?.addEventListener('click', () => {
    tour.classList.remove('tour-visible');
    setTimeout(() => startAppTour(source), 160);
  });
  tour.querySelector('[data-tour-dismiss]')?.addEventListener('click', () => {
    tour.classList.remove('tour-visible');
    setTimeout(() => {
      tour.hidden = true;
      tour.innerHTML = '';
      if (source !== 'manual') void saveTourCompletion();
    }, 180);
  });
}

function tourFinishMarkup() {
  return `<div class="tour-card tour-finish" role="dialog" aria-label="Project Q app tour complete">
    <div class="tour-icon">✓</div>
    <span class="label">Tour complete</span>
    <h2>You’re Ready</h2>
    <p>You know where the core Project Q systems live. Explore the app and use the help icon anytime you want a deeper explanation.</p>
    <div class="tour-actions single">
      <button type="button" class="tour-primary" data-tour-finish>Explore App</button>
    </div>
  </div>`;
}

function tourCardMarkup(step, index) {
  const last = index === APP_TOUR_STEPS.length - 1;
  return `<div class="tour-card" role="dialog" aria-label="Project Q app tour">
    <div class="tour-progress"><span>${index + 1} of ${APP_TOUR_STEPS.length}</span><button type="button" data-tour-skip>Skip Guide</button></div>
    <div class="tour-icon">${escapeHtml(step.icon)}</div>
    <h2>${escapeHtml(step.title)}</h2>
    <p>${escapeHtml(step.text)}</p>
    <div class="tour-actions">
      <button type="button" class="tour-secondary" data-tour-back ${index === 0 ? 'disabled' : ''}>Back</button>
      <button type="button" class="tour-primary" data-tour-next>${last ? 'You’re Ready' : 'Next'}</button>
    </div>
  </div>`;
}

function visibleTourTarget(selector) {
  const candidates = Array.from(document.querySelectorAll(selector));
  return candidates.find((node) => {
    const style = window.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && rect.width > 0
      && rect.height > 0;
  }) || candidates[0] || null;
}

function clearTourTarget() {
  document.querySelectorAll('.tour-target-active').forEach((node) => node.classList.remove('tour-target-active'));
}

function positionTourCard(target) {
  const tour = document.querySelector('#app-tour');
  const card = tour?.querySelector('.tour-card');
  if (!tour || !card || !target) return;
  const rect = target.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const margin = 14;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  if (viewportWidth <= 860) {
    const dockHeight = document.querySelector('.mobile-dock')?.getBoundingClientRect().height || 76;
    card.style.left = '12px';
    card.style.top = 'auto';
    card.style.bottom = `${Math.round(dockHeight + 12)}px`;
    card.style.transform = 'none';
    return;
  }
  let left = Math.max(margin, Math.min(viewportWidth - cardRect.width - margin, rect.left + (rect.width - cardRect.width) / 2));
  let top = rect.bottom + margin;
  if (top + cardRect.height > viewportHeight - margin) top = Math.max(margin, rect.top - cardRect.height - margin);
  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(top)}px`;
}

function renderTourStep() {
  const tour = document.querySelector('#app-tour');
  if (!tour || !state.tour.active) return;
  const index = Math.max(0, Math.min(APP_TOUR_STEPS.length - 1, state.tour.step));
  const step = APP_TOUR_STEPS[index];

  if (step.operationsView) state.operationsView = step.operationsView;
  if (step.recordView) state.recordView = step.recordView;
  if (step.profileView) state.profileView = step.profileView;

  if (state.screen !== step.screen || step.operationsView || step.recordView || step.profileView) {
    state.screen = step.screen;
    history.replaceState(null, '', `#${step.screen}`);
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  tour.hidden = false;
  tour.classList.add('tour-visible');
  tour.classList.add('tour-step-transition');
  tour.innerHTML = `<div class="tour-scrim"></div>${tourCardMarkup(step, index)}`;
  clearTourTarget();

  requestAnimationFrame(() => {
    tour.classList.remove('tour-step-transition');
    const target = visibleTourTarget(step.target);
    if (target) {
      target.classList.add('tour-target-active');
      positionTourCard(target);
    } else {
      const card = tour.querySelector('.tour-card');
      if (card) {
        card.style.left = '50%';
        card.style.top = '50%';
        card.style.transform = 'translate(-50%, -50%)';
      }
    }

    tour.querySelector('[data-tour-back]')?.addEventListener('click', () => {
      if (state.tour.step > 0) {
        state.tour.step -= 1;
        renderTourStep();
      }
    });
    tour.querySelector('[data-tour-next]')?.addEventListener('click', () => {
      if (state.tour.step >= APP_TOUR_STEPS.length - 1) {
        clearTourTarget();
        tour.innerHTML = `<div class="tour-scrim"></div>${tourFinishMarkup()}`;
        const finishCard = tour.querySelector('.tour-finish');
        if (finishCard) {
          finishCard.style.left = '50%';
          finishCard.style.top = '50%';
          finishCard.style.transform = 'translate(-50%, -50%)';
        }
        tour.querySelector('[data-tour-finish]')?.addEventListener('click', finishAppTour);
      } else {
        state.tour.step += 1;
        renderTourStep();
      }
    });
    tour.querySelector('[data-tour-skip]')?.addEventListener('click', finishAppTour);
  });
}

function startAppTour(source = 'manual') {
  state.tour = { active: true, step: 0, source };
  const tour = document.querySelector('#app-tour');
  tour?.classList.remove('tour-visible');
  renderTourStep();
}

function finishAppTour() {
  clearTourTarget();
  const tour = document.querySelector('#app-tour');
  if (tour) {
    tour.hidden = true;
    tour.innerHTML = '';
  }
  state.tour.active = false;
  void saveTourCompletion();
  state.navigationStack = ['home'];
  state.screen = 'home';
  history.replaceState(null, '', '#home');
  render();
  updateTelegramBackButton();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Project Q guide complete.');
}

function maybeStartAppTour() {
  if (hasCompletedTour()) return;
  setTimeout(() => showTourWelcome('auto'), 800);
}

function explainerMarkup(key) {
  const item = EXPLAINERS[key];
  if (!item) return '';
  return `<form method="dialog" class="explainer-sheet">
    <div class="explainer-handle" aria-hidden="true"></div>
    <header>
      <div><span class="label">${escapeHtml(item.eyebrow)}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></div>
      <button class="explainer-close" value="close" aria-label="Close">×</button>
    </header>
    <div class="explainer-items">
      ${item.items.map(({ icon, title, text }) => `<article><i>${escapeHtml(icon)}</i><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div></article>`).join('')}
    </div>
    <button class="explainer-got-it" value="close">Got It</button>
  </form>`;
}

function bindExplainerDrag(dialog) {
  const sheet = dialog?.querySelector('.explainer-sheet');
  const handle = dialog?.querySelector('.explainer-handle');
  if (!sheet || !handle || !window.matchMedia('(max-width: 520px)').matches) return;

  let startY = null;
  let currentY = null;
  let dragging = false;

  const reset = () => {
    dragging = false;
    startY = null;
    currentY = null;
    sheet.style.transform = '';
    sheet.style.transition = '';
  };

  handle.addEventListener('pointerdown', (event) => {
    startY = event.clientY;
    currentY = startY;
    dragging = true;
    sheet.setPointerCapture?.(event.pointerId);
    sheet.style.transition = 'none';
  });

  handle.addEventListener('pointermove', (event) => {
    if (!dragging || startY == null) return;
    currentY = event.clientY;
    const delta = Math.max(0, currentY - startY);
    sheet.style.transform = `translateY(${Math.min(delta, 180)}px)`;
  });

  const finish = () => {
    if (!dragging || startY == null || currentY == null) return reset();
    const delta = currentY - startY;
    if (delta > 90) dialog.close();
    else {
      sheet.style.transition = 'transform .18s ease';
      sheet.style.transform = 'translateY(0)';
      setTimeout(reset, 190);
    }
  };

  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', reset);
}

function openExplainer(key) {
  const dialog = document.querySelector('#explainer-dialog');
  if (!dialog || !EXPLAINERS[key]) return;
  dialog.innerHTML = explainerMarkup(key);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  bindExplainerDrag(dialog);
  state.telegram?.HapticFeedback?.impactOccurred('light');
}

const supportState = { threads: [], thread: null, error: '', loading: false, requestId: null, loaded: false, owner: null };
const SUPPORT_LABELS = { identity:'Identity & clearance',mission:'Mission verification',xp:'Missing XP',rewards:'Rewards',wallet:'Wallet',technical:'Technical issue',ocean:'Ocean Impact' };

function supportPanelMarkup() {
  if (state.sessionStatus !== 'verified') return '<p>Open Project Q through Telegram to access your private support conversations.</p>';
  if (location.hostname !== 'project-q-dev.onrender.com') return '<p>Private support is available in the Dev build while testing.</p>';
  if (supportState.owner !== state.profile.profileId) { Object.assign(supportState,{threads:[],thread:null,error:'',loading:false,requestId:null,loaded:false,owner:state.profile.profileId}); }
  const thread = supportState.thread;
  const status = value => ({waiting_team:'Awaiting team reply',waiting_user:'Team replied',resolved:'Resolved'}[value] || 'Status pending');
  const messageForm = `<label>Your message<textarea id="support-body" maxlength="3000" rows="5" required placeholder="Describe what happened and what you expected. Do not include private keys or seed phrases."></textarea></label><button type="submit">${thread ? 'SEND REPLY' : 'SUBMIT REQUEST'} →</button>`;
  return `<p class="support-note">Private conversation with the Project Q team. Replies appear here; use Refresh to check. No instant response is promised.</p><p id="support-status" role="status">${escapeHtml(supportState.error || (supportState.loading ? 'Loading requests…' : ''))}</p>${thread ? `<button id="support-list-back">← MY REQUESTS</button><button id="support-refresh-thread">REFRESH CONVERSATION</button><h3>${escapeHtml(thread.subject)}</h3><small>${escapeHtml(status(thread.status))}</small><div class="support-conversation">${thread.messages.map(message=>`<article class="support-message ${message.sender==='team'?'from-team':''}"><small>${message.sender==='team'?'PROJECT Q TEAM':'YOU'} · ${escapeHtml(formatProfileDate(message.created_at))}</small><p>${escapeHtml(message.body)}</p></article>`).join('')}</div><form id="support-form">${messageForm}</form>` : `<button id="support-refresh">REFRESH REQUESTS</button><div class="support-thread-list">${supportState.threads.map(row=>`<button data-support-thread="${escapeHtml(row.id)}"><b>${escapeHtml(row.subject)}</b><small>${escapeHtml(status(row.status))}</small></button>`).join('') || `<p>${supportState.loaded ? 'No requests yet.' : 'Your request list has not loaded yet.'}</p>`}</div><details class="support-new"><summary>Start a support request</summary><form id="support-form"><label>Issue<select id="support-category">${Object.entries(SUPPORT_LABELS).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><label>Subject<input id="support-subject" minlength="5" maxlength="120" required /></label>${messageForm}<p>Only your selected issue, subject and message are submitted with your verified identity and operation. This form does not attach wallet balances, screenshots or device diagnostics.</p></form></details>`}`;
}

async function supportRequest(payload) {
  const initData=state.telegram?.initData;
  if (!initData) throw new Error('Open Project Q in Telegram to access support.');
  const response=await fetch('/campaign-app/api/support',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({...payload,initData})});
  const result=await response.json();
  if (!response.ok) throw new Error(result.error || 'Support unavailable. Please retry.');
  return result;
}

function bindSupportPanel(dialog) {
  if (state.sessionStatus !== 'verified' || location.hostname !== 'project-q-dev.onrender.com') return;
  const owner=state.profile.profileId;
  const load = async (threadId=null) => {
    supportState.loading=true; supportState.error='';
    try {
      const result=await supportRequest(threadId ? {action:'read',threadId} : {action:'list'});
      if (state.profile.profileId !== owner) return;
      supportState.requestId=null;
      if (threadId) supportState.thread=result.thread;
      else {supportState.threads=result.threads;supportState.thread=null;supportState.loaded=true;}
    } catch(error) {supportState.error=error.message;}
    supportState.loading=false;
    if (dialog.open && dialog.querySelector('#support-status')) openAccountPanel('support');
  };
  dialog.querySelector('#support-refresh-thread')?.addEventListener('click',()=>load(supportState.thread?.id));
  dialog.querySelector('#support-refresh')?.addEventListener('click',()=>load());
  dialog.querySelector('#support-list-back')?.addEventListener('click',()=>load());
  dialog.querySelectorAll('[data-support-thread]').forEach(button=>button.onclick=()=>load(button.dataset.supportThread));
  const form=dialog.querySelector('#support-form');
  if (form) form.oninput=()=>{ supportState.requestId=null; };
  if (form) form.onsubmit=async event=>{
    event.preventDefault(); const button=form.querySelector('[type="submit"]');button.disabled=true;
    const payload={action:'write',threadId:supportState.thread?.id || null,messageId:supportState.requestId || crypto.randomUUID(),category:form.querySelector('#support-category')?.value,subject:form.querySelector('#support-subject')?.value,body:form.querySelector('#support-body').value};
    supportState.requestId=payload.messageId;
    try {
      const result=await supportRequest(payload);if (state.profile.profileId !== owner) return;supportState.thread=result.thread;supportState.requestId=null;supportState.error='';
      if (dialog.open) openAccountPanel('support');
    } catch(error) {dialog.querySelector('#support-status').textContent=error.message;button.disabled=false;}
  };
  if (!supportState.loaded && !supportState.loading && !supportState.error) load();
}

const HELP_ARTICLES = [
  ['clearance', 'Why is my mission locked?', 'Open Profile and complete the five clearance requirements. Mission availability also depends on operation status and source readiness.'],
  ['identity', 'How do I connect X or change my wallet?', 'Oracle manages your verified identity and connections. Open Profile to check clearance or manage connections through Oracle.'],
  ['xp', 'Why has my XP not appeared?', 'Activity must be accepted and settled before it appears in Record. Check the mission verification details, daily caps and recent XP history. Opening a mission or submitting proof does not itself award XP.'],
  ['rewards', 'Does allocated mean paid?', 'An allocation is a recorded reward position. Delivery is separate. Check Rewards for release stages and confirmed transaction evidence.'],
  ['badges', 'Is an objective the same as an earned badge?', 'Recorded progress shows an objective was met. A badge requires an issuance record and its published rules; pending objectives are not issued badges.'],
  ['ocean', 'Does a vault contribution mean conservation work is completed?', 'A verified deposit is a contribution receipt. Funds committed and conservation work completed require separate public evidence.'],
  ['files', 'Why are there nine files but seven action missions?', 'Seven files are actions. MF-06 shows settled participation XP in Record. MF-09 shows collective Earn-to-Burn progress in Economics.'],
];

function accountPanelMarkup(view = 'menu') {
  const p = state.profile;
  const header = `<header><div><small>PROJECT Q // YOUR ACCOUNT</small><h2>${view === 'support' ? 'Support requests' : view === 'help' ? 'Help Centre' : view === 'settings' ? 'Settings' : 'Your account'}</h2></div><button aria-label="Close account menu">×</button></header>`;
  const back = '<button class="account-back" data-account-panel="menu">← ACCOUNT MENU</button>';
  if (view === 'help') return header + back + `<p>Find an answer and the right next step.</p><label class="help-search">Search help<input id="help-search" type="search" placeholder="Try XP, wallet or rewards" /></label><div id="help-results">${helpResultsMarkup('')}</div><section class="support-availability"><b>PRIVATE SUPPORT</b><p>Send a request and return here for team replies. Response times vary.</p><button data-account-panel="support">MY REQUESTS & CONTACT SUPPORT →</button><small>Never share a seed phrase or private key.</small></section>`;
  if (view === 'support') return header + back + supportPanelMarkup();
  if (view === 'settings') return header + back + `<section class="account-settings-section"><h3>Notifications</h3><p>Choose personal summaries in your Updates inbox. Preferences are currently saved on this device.</p><button data-account-action="updates">OPEN UPDATE CONTROLS →</button></section><section class="account-settings-section"><h3>Identity & privacy</h3><p>Your name and photo come from Telegram. Oracle manages your verified X and wallet connections.</p><button data-account-action="profile">PROFILE & CLEARANCE →</button><button data-account-action="ocean">OCEAN RECOGNITION & CONSENT →</button></section><section class="account-settings-section"><h3>Getting started</h3><button data-account-action="tour">REPLAY GUIDE →</button><p>Project Q Dev · Account experience v1</p></section>`;
  return header + `<section class="account-drawer-identity"><img src="${escapeHtml(safeHttpsUrl(p.photoUrl) || '/campaign-app/assets/system/q-id.webp')}" alt="" /><div><b>${escapeHtml(p.name)}</b><p>${p.username ? '@' + escapeHtml(p.username.replace(/^@/, '')) : 'Telegram identity pending'}</p><small>${clearanceCountLabel()} CLEARANCE</small></div></section><nav aria-label="Account tools"><span>YOUR IDENTITY</span><button data-account-action="profile">Campaign Profile <b>›</b></button><button data-account-action="oracle">Oracle identity & connections <b>↗</b></button><button data-account-action="wallet">Wallet <b>›</b></button><span>YOUR EXPERIENCE</span><button data-account-action="updates">Notifications <b>›</b></button><button data-account-panel="settings">Settings <b>›</b></button><span>HELP</span><button data-account-panel="help">Help Centre & support <b>›</b></button><button data-account-action="tour">Replay guide <b>›</b></button></nav><footer>PROJECT Q // ECONOMIC LAYER<br />Identity by Oracle · Impact through CrabStar</footer>`;
}

function helpResultsMarkup(query) {
  const normalized = String(query).trim().toLowerCase();
  const matches = HELP_ARTICLES.filter(row=>row.join(' ').toLowerCase().includes(normalized));
  return matches.map(([id,title,body])=>`<details class="help-article"><summary>${escapeHtml(title)}</summary><p>${escapeHtml(body)}</p></details>`).join('') || '<p role="status">No matching answer. Try a different keyword.</p>';
}

function openAccountPanel(view = 'menu') {
  const dialog = document.querySelector('#account-dialog');
  if (!dialog) return;
  dialog.classList.add('account-drawer');
  dialog.innerHTML = accountPanelMarkup(view);
  dialog.querySelector('[aria-label="Close account menu"]').onclick = () => dialog.close();
  dialog.querySelectorAll('[data-account-panel]').forEach(button=>{button.onclick=()=>openAccountPanel(button.dataset.accountPanel);});
  dialog.querySelectorAll('[data-account-action]').forEach(button=>{button.onclick=()=>{
    const action = button.dataset.accountAction; dialog.close();
    if (action === 'updates') return openCampaignUpdates();
    if (action === 'oracle') return openOracle();
    if (action === 'tour') return showTourWelcome('manual');
    if (action === 'wallet') return state.profile.walletVerified ? go('profile', {view:'wallet'}) : startNativeWalletConnection();
    go(action);
  };});
  const search = dialog.querySelector('#help-search');
  if (search) search.oninput = () => { dialog.querySelector('#help-results').innerHTML = helpResultsMarkup(search.value); };
  if (view === 'support') bindSupportPanel(dialog);
  if (!dialog.open) dialog.showModal();
}

const UPDATE_CATEGORIES = [
  ['clearance', 'Clearance & connections'], ['xp', 'Settled XP'],
  ['rewards', 'Rewards & releases'], ['achievements', 'Achievement progress'],
];

function updatePreferenceKey() {
  return `project-q:updates:${state.profile.profileId || 'preview'}`;
}

function updatePreferences() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(updatePreferenceKey()) || '{}') || {}; } catch {}
  return Object.fromEntries(UPDATE_CATEGORIES.map(([key]) => [key, stored[key] !== false]));
}

function campaignUpdateItems() {
  const items = [];
  if (state.sessionStatus !== 'verified') return items;
  if (!campaignClearanceReady()) items.push({ category: 'clearance', title: `Clearance ${clearanceCountLabel()}`, text: 'Complete your next requirement to prepare for participation.', screen: 'profile' });
  if (Number(state.profile.xp || 0) > 0) items.push({ category: 'xp', title: `${Number(state.profile.xp).toLocaleString()} operation XP settled`, text: 'Review your source breakdown and recent ledger entries.', screen: 'record', view: 'xp' });
  if (state.profile.rewards?.recorded) items.push({ category: 'rewards', title: 'Reward allocation recorded', text: 'Check your allocation, release stages and transaction evidence.', screen: 'rewards' });
  if (Number(state.profile.xp || 0) > 0) items.push({ category: 'achievements', title: 'First XP objective recorded', text: 'Your settled XP meets the first objective. Badge issuance remains pending.', screen: 'record', view: 'achievements' });
  return items;
}

function campaignUpdatesMarkup() {
  const preferences = updatePreferences();
  const items = campaignUpdateItems().filter(item => preferences[item.category]);
  const lifecycle = state.runtime ? operationLifecycleState().label : 'STATUS UNAVAILABLE';
  return `<header><button type="button" class="updates-back" aria-label="Back from updates">← BACK</button><div><small>PROJECT Q // UPDATES</small><h2>Your operation inbox</h2></div></header>
  <p class="updates-context">Current record summaries. This is not a chronological notification history.</p>
  <article class="update-status"><span>OPERATION STATUS // ${escapeHtml(lifecycle)}</span><h3>${escapeHtml(state.campaign?.name || 'Operation')}</h3><p>${escapeHtml(operationScheduleDisplayLabel())}</p></article>
  <div class="personal-update-list">${items.map((item,index)=>`<button class="personal-update" data-update-index="${index}"><span>${escapeHtml(item.category.toUpperCase())}</span><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.text)}</p><small>OPEN →</small></button>`).join('') || `<p class="updates-empty">${state.sessionStatus === 'verified' ? 'No personal summaries in your selected categories.' : 'Open Project Q in Telegram to load your personal updates.'}</p>`}</div>
  <details class="update-controls"><summary>Personal update controls <span>⌄</span></summary><p>Choose which personal summaries appear here. Saved on this device for this profile. These controls do not subscribe you to Telegram messages.</p>${UPDATE_CATEGORIES.map(([key,label])=>`<label><span>${label}</span><input class="preference-toggle" type="checkbox" role="switch" data-update-category="${key}" ${preferences[key] ? 'checked' : ''} /></label>`).join('')}<small id="update-save-status" role="status"></small></details>`;
}

function openCampaignUpdates() {
  const dialog = document.querySelector('#updates-dialog');
  if (!dialog) return;
  dialog.classList.add('updates-drawer');
  dialog.innerHTML = campaignUpdatesMarkup();
  dialog.querySelector('[aria-label="Back from updates"]').onclick = () => dialog.close();
  const items = campaignUpdateItems().filter(item => updatePreferences()[item.category]);
  dialog.querySelectorAll('[data-update-index]').forEach(button => { button.onclick = () => {
    const item = items[Number(button.dataset.updateIndex)];
    if (!item) return;
    dialog.close(); go(item.screen, { view: item.view });
  }; });
  dialog.querySelectorAll('[data-update-category]').forEach(input => { input.onchange = () => {
    const preferences = updatePreferences(); preferences[input.dataset.updateCategory] = input.checked;
    try {
      localStorage.setItem(updatePreferenceKey(), JSON.stringify(preferences));
      openCampaignUpdates(); dialog.querySelector('.update-controls').open = true;
      dialog.querySelector('#update-save-status').textContent = 'Saved on this device.';
    } catch { dialog.querySelector('#update-save-status').textContent = 'Device storage unavailable. Your preference was not saved.'; }
  }; });
  if (!dialog.open) dialog.showModal();
}

function bind() {
  document.querySelectorAll('[data-clearance-action]').forEach(element => {
    element.onclick = () => {
      if (element.dataset.clearanceAction === 'x') return startNativeXConnection();
      if (element.dataset.clearanceAction === 'wallet-verify') return startNativeWalletConnection();
      if (element.dataset.clearanceAction === 'oracle') return openOracle();
      if (element.dataset.clearanceAction === 'wallet') return go('profile', { view: 'wallet' });
      if (state.runtime?.projectQBotUrl) return openExternal(state.runtime.projectQBotUrl);
      toast('Open Project Q from the official Telegram bot to verify your identity.');
    };
  });
  document.querySelectorAll('[data-pool-id]').forEach(element => {
    element.onclick = () => { state.activePool = element.dataset.poolId; go('operations', { view: 'economics' }); };
  });
  document.querySelector('#recover-oracle-identity')?.addEventListener('click', () => startNativeXConnection('identity_recovery'));
  document.querySelector('#standing-filter')?.addEventListener('change', event => {
    state.leaderboardView = event.currentTarget.value;
    renderTabInPlace();
    document.querySelector('#standing-filter')?.focus({ preventScroll: true });
  });

  document.querySelector('#ocean-display-mode')?.addEventListener('change', (event) => {
    state.oceanDraftMode = event.currentTarget.value;
    state.oceanPreferenceError = null;
    if (state.screen === 'ocean') render();
  });
  document.querySelector('#ocean-privacy-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const displayMode = state.oceanDraftMode || state.oceanRecognitionState?.preference?.displayMode || 'ANONYMOUS';
    const alias = event.currentTarget.querySelector('#ocean-display-alias')?.value || '';
    if (!state.telegram?.initData || !state.oceanRecognitionState || button.disabled) return;
    state.oceanDraftAlias = alias;
    button.disabled = true;
    button.textContent = 'SAVING…';
    try {
      const response = await fetch('/campaign-app/api/ocean/recognition-preference', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ initData: state.telegram.initData, displayMode, alias }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Privacy choice unavailable. Try again later.');
      state.oceanRecognitionState = { preference: result.preference, progress: result.progress };
      state.oceanDraftMode = null;
      state.oceanDraftAlias = null;
      state.oceanPreferenceError = null;
      toast('Ocean Impact privacy choice saved. Public recognition remains off.');
    } catch (error) { state.oceanPreferenceError = error.message || 'Privacy choice unavailable. Try again later.'; }
    if (state.screen === 'ocean') render();
  });
  document.querySelector('#ocean-save-receipt')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const signature = state.oceanProof?.signature;
    if (!signature || state.oceanProof?.status !== 'MATCHED' || !state.telegram?.initData) return;
    button.disabled = true;
    button.textContent = 'VERIFYING & SAVING…';
    try {
      const response = await fetch('/campaign-app/api/ocean/record-transfer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ initData: state.telegram.initData, signature }),
      });
      const result = await response.json();
      state.oceanProof = response.ok ? { ...result.proof, status: 'RECORDED', receipts: result.receipts } : {
        status: 'ERROR', message: result.error || 'Receipt unavailable. Try again later.',
      };
      if (response.ok) await Promise.allSettled([loadOceanReceipts(), loadOceanRecognitionState()]);
    } catch { state.oceanProof = { status: 'ERROR', message: 'Receipt unavailable. Try again later.' }; }
    if (state.screen === 'ocean') render();
  });
  document.querySelector('#ocean-proof-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const signature = form.querySelector('input')?.value.trim();
    const button = form.querySelector('button');
    const initData = state.telegram?.initData;
    if (!signature || !initData || !state.profile.walletVerified || button.disabled) return;
    button.disabled = true;
    button.textContent = 'CHECKING…';
    try {
      const response = await fetch('/campaign-app/api/ocean/check-transfer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ initData, signature }),
      });
      const result = await response.json();
      state.oceanProof = response.ok ? { ...result.proof, status: result.status } : {
        status: 'ERROR', message: result.error || 'Transfer check unavailable. Try again later.',
      };
    } catch { state.oceanProof = { status: 'ERROR', message: 'Transfer check unavailable. Try again later.' }; }
    if (state.screen === 'ocean') render();
  });
  const passportImage = document.querySelector('.passport-photo img');
  if (passportImage) passportImage.onerror = () => {
    passportImage.onerror = null;
    passportImage.src = '/campaign-app/assets/system/q-id.webp';
  };
  document.querySelectorAll('[data-screen]').forEach((element) => {
    element.onclick = () => {
      if (element.dataset.profileView && state.screen === element.dataset.screen) state.profileView = element.dataset.profileView;
      go(element.dataset.screen, { view: element.dataset.profileView || null });
    };
  });
  document.querySelectorAll('[data-explainer]').forEach((element) => { element.onclick = () => openExplainer(element.dataset.explainer); });
  document.querySelectorAll('[data-retry-system]').forEach((element) => {
    element.onclick = async () => {
      element.disabled = true;
      await Promise.all([loadCampaign(), loadCampaignRuntime(), loadCampaignReadiness(), loadBurnSummary()]);
      render();
    };
  });
  document.querySelectorAll('[data-retry-session]').forEach((element) => {
    element.onclick = async () => {
      element.disabled = true;
      await authenticateTelegram();
      await loadWalletStatus();
      render();
    };
  });
  document.querySelectorAll('[data-replay-tour]').forEach((element) => { element.onclick = () => showTourWelcome('manual'); });
  document.querySelectorAll('[data-mission-id]').forEach((element) => { element.onclick = () => openMission(element.dataset.missionId); });
  document.querySelectorAll('[data-mission-filter]').forEach((element) => {
    element.onclick = () => { state.missionFilter = element.dataset.missionFilter; render(); };
  });
  document.querySelectorAll('[data-ocean-view]').forEach((element) => {
    element.onclick = () => {
      state.oceanView = element.dataset.oceanView;
      render();
      const nav = document.querySelector('.ocean-view-nav');
      nav?.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
      nav?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
  document.querySelectorAll('[data-external-ocean-link]').forEach((link) => {
    link.onclick = (event) => { event.preventDefault(); openExternal(link.href); };
  });
  document.querySelectorAll('[data-leaderboard-view]').forEach((element) => {
    element.onclick = () => { state.leaderboardView = element.dataset.leaderboardView; render(); };
  });
  document.querySelectorAll('[data-profile-view]').forEach((element) => {
    element.onclick = () => {
      const isTab = element.getAttribute('role') === 'tab';
      state.profileView = element.dataset.profileView;
      if (isTab && state.screen === 'profile') renderTabInPlace();
      else go('profile', { view: element.dataset.profileView });
      if (isTab) document.querySelector('.passport-tabs [aria-selected="true"]')?.focus({ preventScroll: true });
    };
  });
  document.querySelectorAll('[data-operation-view]').forEach((element) => {
    element.onclick = () => {
      state.operationsView = element.dataset.operationView;
      state.activePool = null;
      if (element.getAttribute('role') === 'tab' && state.screen === 'operations') renderTabInPlace();
      else { state.activePool = null; go('operations', { view: element.dataset.operationView }); }
      if (element.getAttribute('role') === 'tab') document.querySelector('.operation-tabs [aria-selected="true"]')?.focus({ preventScroll: true });
    };
  });
  document.querySelectorAll('[data-record-view]').forEach((element) => {
    element.onclick = () => {
      const isTab = element.getAttribute('role') === 'tab';
      state.recordView = element.dataset.recordView === 'activity' ? 'xp' : element.dataset.recordView;
      state.selectedAchievementId = null;
      if (isTab && state.screen === 'record') renderTabInPlace();
      else go('record', { view: element.dataset.recordView === 'activity' ? 'xp' : element.dataset.recordView });
      if (isTab) document.querySelector('.record-tabs [aria-selected="true"]')?.focus({ preventScroll: true });
    };
  });
  document.querySelectorAll('[data-achievement-view]').forEach((element) => {
    element.onclick = () => {
      state.achievementView = element.dataset.achievementView;
      state.selectedAchievementId = null;
      if (state.screen === 'record') renderTabInPlace();
      else go('record', { view: 'achievements' });
      document.querySelector('.achievement-tabs [aria-selected="true"]')?.focus({ preventScroll: true });
    };
    if (element.getAttribute('role') === 'tab') element.onkeydown = (event) => {
      const tabs = [...document.querySelectorAll('.achievement-tabs [role="tab"]')];
      const current = tabs.indexOf(element);
      const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (current - 1 + tabs.length) % tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (next < 0 || !tabs.length) return;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    };
  });
  document.querySelectorAll('[data-achievement-id]').forEach((element) => {
    element.onclick = () => {
      state.selectedAchievementId = element.dataset.achievementId;
      state.recordView = 'achievements';
      if (state.screen === 'record') renderTabInPlace();
      else go('record', { view: 'achievements' });
      document.querySelector('.achievement-back')?.focus({ preventScroll: true });
    };
  });
  document.querySelector('[data-achievement-back]')?.addEventListener('click', () => {
    state.selectedAchievementId = null;
    renderTabInPlace();
  });
  document.querySelectorAll('[data-share-achievement]').forEach((element) => {
    element.onclick = async () => {
      const definition = achievementDefinitions().find((item) => item.id === element.dataset.shareAchievement);
      const record = achievementRecordById().get(element.dataset.shareAchievement);
      if (!definition || !record) return;
      const message = `I earned ${definition.label} in ${state.campaign?.name || 'Project Q'} — verified by Project Q.`;
      try {
        if (navigator.share) await navigator.share({ title: `${definition.label} · Project Q`, text: message });
        else if (navigator.clipboard) { await navigator.clipboard.writeText(message); toast('Achievement text copied.'); }
        else toast('Sharing is not available in this browser.');
      } catch (error) {
        if (error?.name !== 'AbortError') toast('Could not open sharing. Try again.');
      }
    };
  });
  document.querySelector('#rail-toggle')?.addEventListener('click', toggleRail);
  applyRailPreference();
  const menu = document.querySelector('#account-menu-control');
  if (menu) menu.onclick = () => openAccountPanel();
  const updates = document.querySelector('#campaign-updates');
  if (updates) updates.onclick = openCampaignUpdates;
  document.querySelector('#profile-wallet')?.addEventListener('click', openOracle);
  document.querySelector('#identity-refresh')?.addEventListener('click', async () => {
    state.sessionStatus = 'checking';
    await authenticateTelegram();
    await loadWalletStatus();
    render();
    toast(state.profile.xVerified ? 'Oracle X identity confirmed.' : 'X identity not linked yet.');
  });
  document.querySelector('#copy-referral')?.addEventListener('click', async () => {
    if (!state.referrals?.link) return;
    try { await navigator.clipboard.writeText(state.referrals.link); toast('Personal referral link copied.'); }
    catch { toast('Copy unavailable. Press and hold the link instead.'); }
  });
  document.querySelector('#oracle-link')?.addEventListener('click', openOracle);
  document.querySelector('#oracle-home-link')?.addEventListener('click', openOracle);
  document.querySelector('#reward-profile')?.addEventListener('click', () => { state.profileView = 'rewards'; go('profile'); });
  document.querySelector('#open-wallet-profile')?.addEventListener('click', () => { state.profileView = 'wallet'; go('profile'); });
  document.querySelector('#copy-wallet')?.addEventListener('click', () => copyValue(state.wallet, 'Reward wallet copied.'));
  document.querySelector('#copy-token-account')?.addEventListener('click', () => copyValue(state.profile.tokenAccount, 'FAWKQ token account copied.'));
  document.querySelector('#refresh-wallet-balance')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    await loadWalletStatus();
    render();
    toast(state.walletStatus.available ? 'On-chain FAWKQ balance refreshed.' : 'Wallet balance is temporarily unavailable.');
  });
}

async function copyValue(value, successMessage) {
  if (!value) return;
  try { await navigator.clipboard.writeText(value); toast(successMessage); }
  catch { toast('Copy unavailable. Press and hold the value instead.'); }
}

async function loadCampaign() {
  try {
    const campaignAssetVersion = '20261001-achievements-v2';
    const registry = await fetch(`/campaign-app/campaigns/index.json?v=${campaignAssetVersion}`, { cache: 'no-store' }).then((response) => response.json());
    const requested = new URLSearchParams(location.search).get('campaign') || registry.defaultCampaign;
    const record = registry.campaigns.find((campaign) => campaign.id === requested && campaign.visible);
    if (!record) { state.campaign = fallbackCampaign; return; }
    state.campaignRecord = record;
    state.campaign = await fetch(`/campaign-app/campaigns/${record.file}?v=${campaignAssetVersion}`, { cache: 'no-store' }).then((response) => response.json());
    if (record.archived) { state.campaign.status = 'ARCHIVED'; state.campaign.statusLabel = 'CAMPAIGN ARCHIVE'; }
    if (!record.enabled && !record.archived) state.campaign.status = 'DRAFT';
  } catch { state.campaign = fallbackCampaign; }
}

async function loadCampaignRuntime() {
  try {
    const response = await fetch('/campaign-app/api/runtime', { cache: 'no-store' });
    if (!response.ok) throw new Error('runtime unavailable');
    const payload = await response.json();
    state.runtime = payload.runtime || null;
    state.runtimeLoadedAt = Date.now();
  } catch {
    state.runtime = null;
    state.runtimeLoadedAt = null;
  }
}

async function loadCampaignReadiness() {
  try {
    const response = await fetch('/campaign-app/api/readiness', { cache: 'no-store' });
    const payload = await response.json();
    state.readiness = payload.readiness || state.readiness;
  } catch {
    state.readiness = { available: false, ready: false, readyCount: 0, totalCount: 0, percent: null, checks: [] };
  }
}

async function loadBurnSummary() {
  try {
    const response = await fetch('/campaign-app/api/burns/summary');
    const payload = await response.json();
    state.burns = payload.summary || null;
  } catch { state.burns = null; }
}

async function loadOceanVaultStatus() {
  try {
    const response = await fetch('/campaign-app/api/ocean/vault-status', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || payload.status?.vault !== OCEAN_CONSERVATION_VAULT || !payload.status?.available) {
      throw new Error('ocean vault status unavailable');
    }
    state.oceanVault = payload.status;
  } catch { state.oceanVault = null; }
}

async function loadOceanRecognition() {
  try {
    const response = await fetch('/campaign-app/api/ocean/recognition-rules', { cache: 'no-store' });
    const payload = await response.json();
    state.oceanRecognition = response.ok && payload.program?.status === 'PROPOSED' ? payload.program : null;
  } catch { state.oceanRecognition = null; }
}

async function loadOceanReceipts() {
  if (!state.telegram?.initData || !state.profile.walletVerified) return;
  try {
    const response = await fetch('/campaign-app/api/ocean/my-receipts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ initData: state.telegram.initData }),
    });
    const payload = await response.json();
    state.oceanReceipts = response.ok && Array.isArray(payload.receipts) ? payload.receipts : null;
  } catch { state.oceanReceipts = null; }
}

async function loadOceanRecognitionState() {
  if (!state.telegram?.initData || !state.profile.telegramVerified) return;
  try {
    const response = await fetch('/campaign-app/api/ocean/my-recognition', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ initData: state.telegram.initData }),
    });
    const payload = await response.json();
    state.oceanRecognitionState = response.ok && payload.preference && payload.progress ? payload : null;
  } catch { state.oceanRecognitionState = null; }
}

async function loadWalletStatus() {
  const initData = state.telegram?.initData;
  if (!initData || !state.profile.walletVerified || !state.wallet) {
    state.walletStatus = {
      available: false, network: 'mainnet-beta', mint: state.campaign?.earnToBurn?.mint || null,
      tokenProgramId: state.campaign?.earnToBurn?.tokenProgramId || null,
      decimals: 6, balanceBaseUnits: null, tokenAccountCount: 0, primaryTokenAccount: null, holderEligible: false, observedAt: null,
    };
    return false;
  }
  try {
    const response = await fetch('/campaign-app/api/wallet/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }), cache: 'no-store',
    });
    const payload = await response.json();
    if (!response.ok || !payload.status?.available) throw new Error('wallet status unavailable');
    state.walletStatus = payload.status;
    state.profile.holderEligible = Boolean(payload.status.holderEligible);
    state.profile.rewardEligible = Boolean(state.profile.campaignReady && payload.status.holderEligible);
    state.profile.tokenAccountReady = Boolean(payload.status.primaryTokenAccount);
    state.profile.tokenAccount = payload.status.primaryTokenAccount || null;
    return true;
  } catch {
    state.walletStatus = {
      available: false, network: 'mainnet-beta', mint: state.campaign?.earnToBurn?.mint || null,
      tokenProgramId: state.campaign?.earnToBurn?.tokenProgramId || null,
      decimals: 6, balanceBaseUnits: null, tokenAccountCount: 0, observedAt: null,
    };
    return false;
  }
}

async function authenticateTelegram() {
  const initData = state.telegram?.initData;
  if (!initData) { state.sessionStatus = 'outside'; return false; }
  state.sessionStatus = 'checking';
  try {
    const response = await fetch('/campaign-app/api/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData }),
    });
    if (!response.ok) {
      if (response.status === 503) {
        const pending = await response.json();
        if (pending.telegramUser) {
          state.profile.name = telegramDisplayName(pending.telegramUser);
          state.profile.username = pending.telegramUser.username || null;
          state.profile.photoUrl = safeHttpsUrl(pending.telegramUser.photoUrl);
          state.profile.telegramVerified = false;
          state.profile.xVerified = false;
          state.profile.walletVerified = false;
          state.sessionStatus = 'identity-unavailable';
          return false;
        }
      }
      state.sessionStatus = 'error';
      return false;
    }
    const session = await response.json();
    state.profile.name = telegramDisplayName(session.user);
    state.profile.username = session.user.username || null;
    state.profile.profileId = session.participant?.profileId || null;
    state.profile.photoUrl = safeHttpsUrl(session.user.photoUrl);
    state.profile.crabArmy = session.identity?.crabArmy || null;
    state.profile.telegramVerified = true;
    state.profile.xVerified = Boolean(session.participant?.xVerified);
    state.profile.walletVerified = Boolean(session.participant?.walletVerified);
    state.profile.campaignReady = Boolean(session.participant?.campaignReady);
    state.profile.holderEligible = Boolean(session.participant?.holderEligible);
    state.profile.rewardEligible = Boolean(session.participant?.rewardEligible);
    state.profile.holderEligibility = session.participant?.holderEligibility || null;
    state.profile.tokenAccountReady = Boolean(session.participant?.tokenAccountReady);
    state.profile.tokenAccount = session.participant?.fawkqTokenAccount || null;
    state.walletManagedByOracle = session.capabilities?.walletManagedByOracle === true;
    state.wallet = session.participant?.rewardWallet || null;
    state.profile.xp = Number(session.participant?.totalXp || 0);
    state.profile.todayXp = Number(session.participant?.todayXp || 0);
    state.profile.todayXpByBucket = session.participant?.todayXpByBucket || state.profile.todayXpByBucket;
    state.profile.enrolledAt = session.participant?.enrolledAt || null;
    state.profile.xVerifiedAt = session.participant?.xVerifiedAt || null;
    state.profile.walletVerifiedAt = session.participant?.walletVerifiedAt || null;
    state.profile.xpByCycle = session.participant?.xpByCycle || [];
    state.profile.xpByBucket = session.participant?.xpByBucket || state.profile.xpByBucket;
    state.profile.activity = session.participant?.recentActivity || [];
    state.profile.completedMissions = Number(session.participant?.completedMissionCount || 0);
    state.profile.achievementRecords = Array.isArray(session.participant?.achievementRecords)
      ? session.participant.achievementRecords : [];
    state.profile.achievementRecordsAvailable = session.participant?.achievementRecordsAvailable === true;
    state.pendingAchievementUnlock = detectNewAchievementUnlock(
      state.profile.profileId,
      state.profile.achievementRecords
    );
    state.profile.allocation = session.participant?.allocationBaseUnits ?? null;
    state.profile.allocationByCategory = session.participant?.allocationByCategory || {};
    state.profile.rewards = session.participant?.rewards || state.profile.rewards;
    state.profile.buyToEarn = session.participant?.buyToEarn || null;
    state.profile.campaignState = session.participant?.campaignState || 'DRAFT';
    state.referrals = session.referrals || state.referrals;
    state.community = session.community || state.community;
    state.xInvite = session.xInvite || state.xInvite;
    state.missionEvidence = session.missionEvidence || state.missionEvidence;
    state.websiteVotes = session.websiteVotes || state.websiteVotes;
    state.telegramTrendingSources = session.telegramTrendingSources || state.telegramTrendingSources;
    state.preferences = session.preferences || state.preferences;
    state.websiteVoteReviewEnabled = Boolean(session.capabilities?.websiteVoteReview);
    state.leaderboardMeta = session.leaderboards || null;
    if (session.leaderboards) {
      for (const key of ['overall', '48h', 'missions', 'trending', 'community', 'burn']) {
        state.leaderboards[key] = session.leaderboards[key]?.rows || [];
      }
      const rank = session.leaderboards.overall?.participantRank;
      state.profile.rank = rank ? `#${Number(rank).toLocaleString()}` : '—';
    }
    state.sessionStatus = 'verified';
    return true;
  } catch {
    state.sessionStatus = 'error';
    return false;
  }
}

async function boot() {
  const splashMeter = document.querySelector('.splash-meter');
  const splashFill = document.getElementById('splash-meter-fill');
  const splashValue = document.getElementById('splash-meter-value');
  const markStartup = (percent) => {
    if (!splashMeter || !splashFill || !splashValue) return;
    splashMeter.setAttribute('aria-valuenow', String(percent));
    splashFill.style.width = `${percent}%`;
    splashValue.textContent = `${percent}%`;
  };
  const splashStarted = performance.now();
  markStartup(10);
  state.telegram?.ready();
  state.telegram?.expand();
  syncTelegramViewport();
  state.telegram?.setHeaderColor?.('#e9e2d3');
  state.telegram?.setBackgroundColor?.('#e9e2d3');
  state.telegram?.onEvent?.('activated', async () => {
    const pending = sessionStorage.getItem('project-q:pending-verification');
    await authenticateTelegram();
    await loadWalletStatus();
    render();
    if (pending) {
      sessionStorage.removeItem('project-q:pending-verification');
      const verified = pending === 'x' ? state.profile.xVerified : state.profile.walletVerified;
      toast(verified
        ? (pending === 'x' ? 'X connected ✓' : 'Wallet verified ✓')
        : (pending === 'x' ? 'X verification is still pending.' : 'Wallet verification is still pending.'));
    }
  });
  state.telegram?.onEvent?.('viewportChanged', syncTelegramViewport);
  state.telegram?.BackButton?.onClick?.(navigateBack);
  window.addEventListener('resize', syncTelegramViewport);

  const requestedScreen = location.hash.slice(1);
  state.screen = resolveScreenRoute(requestedScreen in screens ? requestedScreen : 'home');
  state.navigationStack = ['home'];
  if (requestedScreen && requestedScreen !== state.screen) {
    history.replaceState(null, '', `#${state.screen}`);
  }
  markStartup(25);

  // Phase 1: load campaign presentation first so the Terminal can paint quickly.
  await loadCampaign();
  markStartup(75);
  render();
  updateTelegramBackButton();
  markStartup(100);

  const splashRemaining = Math.max(0, 500 - (performance.now() - splashStarted));
  await new Promise((resolve) => setTimeout(resolve, splashRemaining));
  document.body.classList.remove('loading');

  // Phase 2: settle authoritative runtime, identity, readiness and public ledgers.
  await Promise.allSettled([
    loadCampaignRuntime(),
    loadCampaignReadiness(),
    loadBurnSummary(),
    state.screen === 'ocean' ? Promise.allSettled([loadOceanVaultStatus(), loadOceanRecognition()]) : Promise.resolve(),
    authenticateTelegram(),
  ]);
  await loadWalletStatus();
  if (state.screen === 'ocean') await Promise.allSettled([loadOceanReceipts(), loadOceanRecognitionState()]);
  restoreWebsiteVoteFlow();
  render();
  updateTelegramBackButton();

  // Only introduce onboarding after the actual participant/system state has settled.
  setTimeout(maybeStartAppTour, 450);

  setInterval(updateCountdownLabels, 1000);
  setInterval(async () => {
    await Promise.allSettled([loadCampaignRuntime(), loadCampaignReadiness()]);
    render();
  }, 60000);
}

boot();
