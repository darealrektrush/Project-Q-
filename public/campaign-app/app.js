Warning: truncated output (original token count: 59847)
Total output lines: 3506

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
  return `<section class="clearance-panel profile-clearance"><div class="clearance-head"><div><span>CLEARANCE</span><h3>${complete === checks.length ? 'Ready for eligible missions' : 'Complete your operation setup'}</h3></div><b>${complete}/${checks.length}</b></div>
    <div class="dossier-clearance-track">${checks.map(item => `<i class="${item.complete ? 'complete' : ''}"></i>`).join('')}</div>
    <div class="clearance-list">${checks.map(item => `<article class="clearance-row ${item.complete ? 'complete' : 'incomplete'}"><i>${item.complete ? '✓' : '○'}</i><div><b>${escapeHtml(item.label)}</b><small>${item.complete ? 'Verified' : escapeHtml(item.action === 'oracle' && !oracleAvailable ? 'Oracle connection is not ready in this environment yet.' : item.detail)}</small></div>${item.complete ? '' : `<button data-clearance-action="${item.action}" ${item.action === 'oracle' && !oracleAvailable ? 'disabled' : ''}>${item.action === 'oracle' ? 'CONNECT' : item.action === 'wallet' ? 'CHECK WALLET' : 'OPEN TELEGRAM'} →</button>`}</article>`).join('')}</div>
    <small class="clearance-observation">Connections come from Oracle. Token-account and holding eligibility use the latest verified wallet observation.</small>
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
  const progressMarkup = progress.progress === null ? '' : `<span class="achievement-tile-meter" style="--tile-progress:${progress.progress}%" role="progressbar" aria-label="${escapeHtml(badge.label)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.progress}">${progress.progress}%</span>`;
  const statusMarkup = record
    ? '<span class="achievement-tile-status" aria-hidden="true">✓</span>'
    : progress.state === 'classified' || progress.state === 'locked'
      ? '<span class="achievement-tile-status locked" aria-hidden="true">⌑</span>'
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
  return `<div class="achievement-tabs" role="tablist" aria-label="Achievement views">${tabs.map(([id,label]) => `<button type="button" role="tab" data-achievement-view="${id}" aria-selected="${state.achievementView === id}">${label}</button>`).join('')}</div>`;
}

function achievementCollectionMarkup(collection, definitions) {
  const items = definitions.filter((item) => item.collection === collection.id);
  if (!items.length) return `<section class="achievement-collection-row achievement-collection-empty"><header><div><b>${escapeHtml(collection.label)}</b><small>${escapeHtml(collection.description)}</small></div><span>RULES IN DEVELOPMENT</span></header><p>Verified awards will appear here when this collection’s criteria are published.</p></section>`;
  const earned = items.filter((item) => achievementProgress(item).state === 'earned').length;
  const inProgress = items.filter((item) => achievementProgress(item).state === 'in-progress').length;
  return `<section class="achievement-collection-row"><header><div><b>${escapeHtml(collection.label)}</b><small>${escapeHtml(collection.description)}</small></div><span>${earned} / ${items.length} UNLOCKED${inProgress ? ` · ${inProgress} IN PROGRESS` : ''}</span></header><div class="achievement-horizontal-rail">${items.map((item) => achievementCardMarkup(item, { compact: true })).join('')}</div></section>`;
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
  const progressBlock = progress.progress !== null && !record
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
  if (!state.profile.achievementRecordsAvailable) return `<div class="achievement-empty"><b>Achievement history is syncing</b><p>Open Project Q in Telegram. Your verified campaign records will load with your identity.</p></div>`;
  if (!records.length) return `<div class="achievement-empty"><b>No verified achievements yet</b><p>Your campaign history will grow here as Project Q verifies and records achievements.</p></div>`;
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
  if (state.achievementView === 'history') return `<section class="achievement-center">${achievementTabsMarkup()}${achievemen…29847 tokens truncated…></div>${mission.id === 'trending-bots' ? `<div><span>Pushes</span><b>${Number(telemetry.pushPoints || 0)}</b></div>` : ''}<div><span>Pending</span><b>${Number(telemetry.pending || 0)}</b></div><div><span>Rejected</span><b>${Number(telemetry.rejected || 0)}</b></div></div>`
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
  return header + `<section class="account-drawer-identity"><img src="${escapeHtml(safeHttpsUrl(p.photoUrl) || '/campaign-app/assets/system/q-id.webp')}" alt="" /><div><b>${escapeHtml(p.name)}</b><p>${p.username ? '@' + escapeHtml(p.username.replace(/^@/, '')) : 'Telegram identity pending'}</p><small>${clearanceCountLabel()} CLEARANCE</small></div></section><nav aria-label="Account tools"><span>YOUR IDENTITY</span><button data-account-action="profile">Campaign Profile <b>›</b></button><button data-account-action="oracle">Universal ID & connections <b>↗</b></button><button data-account-action="wallet">Wallet <b>›</b></button><span>YOUR EXPERIENCE</span><button data-account-action="updates">Notifications <b>›</b></button><button data-account-panel="settings">Settings <b>›</b></button><span>HELP</span><button data-account-panel="help">Help Centre & support <b>›</b></button><button data-account-action="tour">Replay guide <b>›</b></button></nav><footer>PROJECT Q // ECONOMIC LAYER<br />Identity by Oracle · Impact through CrabStar</footer>`;
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
    if (action === 'wallet') return go('profile', {view:'wallet'});
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
  return `<header><div><small>PROJECT Q // UPDATES</small><h2>Your operation inbox</h2></div><button aria-label="Close updates">×</button></header>
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
  dialog.querySelector('[aria-label="Close updates"]').onclick = () => dialog.close();
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
      if (element.dataset.clearanceAction === 'oracle') return openOracle();
      if (element.dataset.clearanceAction === 'wallet') return go('profile', { view: 'wallet' });
      if (state.runtime?.projectQBotUrl) return openExternal(state.runtime.projectQBotUrl);
      toast('Open Project Q from the official Telegram bot to verify your identity.');
    };
  });
  document.querySelectorAll('[data-pool-id]').forEach(element => {
    element.onclick = () => { state.activePool = element.dataset.poolId; go('operations', { view: 'economics' }); };
  });
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
      renderTabInPlace();
      document.querySelector('.achievement-tabs [aria-selected="true"]')?.focus({ preventScroll: true });
    };
  });
  document.querySelectorAll('[data-achievement-id]').forEach((element) => {
    element.onclick = () => {
      state.selectedAchievementId = element.dataset.achievementId;
      renderTabInPlace();
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
  state.telegram?.onEvent?.('activated', async () => { await authenticateTelegram(); await loadWalletStatus(); render(); });
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
