const ORACLE_LOGO = '/campaign-app/assets/oracle-logo.jpg';

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
      { icon: '03', title: 'Build Progress', text: 'Settled XP advances your campaign standing and rank progression.' },
    ],
  },
  ranks: {
    eyebrow: 'Rank guide', title: 'How ranks work',
    description: 'Ranks turn accumulated verified XP into visible progression.',
    items: [
      { icon: '01', title: 'Earn XP', text: 'Verified activity contributes to your cumulative progression.' },
      { icon: '02', title: 'Advance', text: 'Reach the required XP threshold to move into the next rank.' },
      { icon: '03', title: 'Keep Building', text: 'Your rank reflects long-term contribution across eligible activity.' },
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
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>',
  operations: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 12l2.2 2.2 4.8-5"/></svg>',
  record: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V9h4v11M10 20V5h4v15M15 20V12h4v8M3 20.5h18"/></svg>',
  rewards: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v11H4zM3 6.5h18V10H3zM12 6.5V21"/><path d="M12 6.5H8.7A2.7 2.7 0 1 1 12 3.2zm0 0h3.3A2.7 2.7 0 1 0 12 3.2z"/></svg>',
  profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"/></svg>',
};

const APP_TOUR_VERSION = 2;

const APP_TOUR_STEPS = [
  { screen: 'home', target: '[data-tour-target="home"]', icon: 'Q', title: 'Operations Terminal', text: 'Your command center shows the active operation, next required action and critical campaign status.' },
  { screen: 'operations', operationsView: 'overview', target: '[data-tour-target="operations"]', icon: 'OP', title: 'Operations', text: 'Open campaign dossiers, mission files, progress, rewards and operational intel.' },
  { screen: 'record', recordView: 'xp', target: '[data-tour-target="record"]', icon: 'R', title: 'Your Record', text: 'Verified XP, rank, achievements and accepted activity become your permanent Project Q record.' },
  { screen: 'rewards', target: '[data-tour-target="rewards"]', icon: '◆', title: 'Rewards', text: 'Follow allocations through authorization, on-chain delivery and final receipts.' },
  { screen: 'profile', profileView: 'overview', target: '[data-tour-target="profile"]', icon: 'ID', title: 'Participant Passport', text: 'Your identity, connections and operation history live in one persistent Project Q participant record.' },
  { screen: 'operations', operationsView: 'intel', target: '[data-tour-target="oracle"]', icon: 'O', title: 'Oracle Verification', text: 'Oracle keeps its own blue identity whenever it verifies people, evidence or supported activity.' },
  { screen: 'home', target: '[data-tour-target="home"]', icon: '✓', title: 'Enter the Operation', text: 'Participate. Verify. Build your record. Small actions. Bigger oceans.' },
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
  recordView: 'xp',
  activeMissionId: null,
  leaderboardView: 'overall',
  leaderboards: { overall: [], '48h': [], missions: [], trending: [], community: [], burn: [] },
  leaderboardMeta: null,
  profile: {
    name: window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Duck Recruit',
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

function short(value) { return `${value.slice(0, 5)}…${value.slice(-5)}`; }
function isSolanaAddress(value) { return typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value); }
function isSolanaSignature(value) { return typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(value); }
function verifiedCount() {
  const p = state.profile;
  return [p.telegramVerified, p.xVerified, p.walletVerified].filter(Boolean).length;
}

function navMarkup() {
  return NAV.map(([id, label]) => `<button class="nav-button ${state.screen === id ? 'active' : ''}" data-screen="${id}" data-tour-target="${id}" aria-label="${label}" title="${label}"><span class="nav-icon">${NAV_ICONS[id]}</span><span class="nav-label">${label}</span></button>`).join('');
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
  return statePill(state.runtime.displayLabel, state.runtime.tone || 'pending');
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
        ? `${campaign.schedule?.activeLabel || 'Final dates pending · 10 active days'} · 8:00 AM PT`
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
  return `<section class="campaign-clock ${escapeHtml(runtime.tone || 'pending')}"><div class="clock-copy"><span>${escapeHtml(awaitingTargetApproval ? 'Campaign target awaiting approval' : schedule.label)}</span><strong data-countdown data-target-at="${escapeHtml(schedule.targetAt || '')}" data-empty-label="${escapeHtml(countdown)}">${escapeHtml(countdown)}</strong><small>${escapeHtml(detail)}</small></div><div class="cycle-rail" aria-label="${cycleCount} campaign cycles">${dots}</div></section>`;
}

function updateCountdownLabels() {
  document.querySelectorAll('[data-countdown]').forEach((element) => {
    element.textContent = element.dataset.targetAt
      ? formatCountdown(element.dataset.targetAt) : element.dataset.emptyLabel || 'Schedule unavailable';
  });
}

function readinessDetailsMarkup() {
  const readiness = state.readiness;
  const available = Boolean(readiness?.available && readiness.totalCount);
  const status = available
    ? readiness.ready ? 'All launch gates verified' : `${Number(readiness.readyCount)} / ${Number(readiness.totalCount)} verified`
    : 'Readiness temporarily unavailable';
  const checks = available ? readiness.checks.map(({ key, label, ready }) =>
    `<article class="readiness-gate ${ready ? 'complete' : 'pending'}" data-readiness-key="${escapeHtml(key)}"><i>${ready ? '✓' : '○'}</i><span>${escapeHtml(label)}</span><b>${ready ? 'Verified' : 'Pending'}</b></article>`
  ).join('') : '<div class="readiness-empty"><b>No launch state is being inferred.</b><p>Project Q will retry the authoritative readiness service automatically.</p></div>';
  return `<details class="readiness-details"><summary><span><small>Public launch gates</small><b>${escapeHtml(status)}</b></span><em>${available ? 'Review gates' : 'Retrying'}</em></summary><div class="readiness-gates">${checks}</div><footer><span>Read-only readiness · no activation or treasury controls</span><button class="text-action" data-screen="readiness">Open launch status →</button></footer></details>`;
}

function readinessGroupMarkup(group, checks) {
  const groupChecks = group.keys.map((key) => checks.find((check) => check.key === key)).filter(Boolean);
  const complete = groupChecks.length > 0 && groupChecks.every(({ ready }) => ready);
  const passed = groupChecks.filter(({ ready }) => ready).length;
  return `<article class="launch-group ${complete ? 'complete' : 'pending'}"><header><span>${escapeHtml(group.number)}</span><div><small>${escapeHtml(group.id)}</small><h3>${escapeHtml(group.label)}</h3><p>${escapeHtml(group.description)}</p></div>${statePill(complete ? 'VERIFIED' : `${passed}/${groupChecks.length} READY`, complete ? 'success' : 'pending')}</header><div class="launch-gates">${groupChecks.map(({ key, label, ready }) => `<div class="${ready ? 'complete' : 'pending'}" data-readiness-key="${escapeHtml(key)}"><i>${ready ? '✓' : '○'}</i><span>${escapeHtml(label)}</span><b>${ready ? 'Verified' : 'Pending'}</b></div>`).join('')}</div></article>`;
}

function readinessCommitmentsMarkup(campaign) {
  const commitments = campaign.campaignCommitments || {};
  if (!commitments.campaignRewards) return '';
  const rows = [
    ['Campaign pool', `${formatBaseUnits(commitments.campaignRewards.amountBaseUnits)} FAWKQ`, 'Funded before launch'],
    ['Diamond Duck', `${formatBaseUnits(commitments.diamondDuckBonus.amountBaseUnits)} FAWKQ`, 'Separate post-unlock bonus'],
    ['Top Duck', `${escapeHtml(commitments.topContributorPrize.amountSol)} SOL`, 'Top overall contributor'],
    ['Earn to Burn', `${formatBaseUnits(commitments.earnToBurn.amountBaseUnits)} FAWKQ`, 'Separate creator-wallet reserve'],
  ];
  return `<section class="launch-commitments">${rows.map(([label, amount, detail]) => `<article><span>${label}</span><strong>${amount}</strong><small>${detail}</small></article>`).join('')}</section>`;
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
  return `<section class="launch-command command-card"><div><span class="label">Campaign 01 · Launch control</span><h2>${launchState}</h2><p>${available ? `${Number(readiness.readyCount)} of ${Number(readiness.totalCount)} public gates are verified.` : 'The readiness service is unavailable.'} The campaign cannot open from this screen.</p>${statePill(launchState, launchTone)}</div><img src="/campaign-app/assets/system/q-campaigns.webp" alt="Project Q campaigns" /></section>
  <section class="launch-progress command-card"><div><span>Public readiness</span><strong>${available ? `${percent}%` : '—'}</strong></div><div class="progress" role="progressbar" aria-label="Public launch readiness" aria-valuemin="0" aria-valuemax="100" ${available ? `aria-valuenow="${percent}"` : ''}><span style="width:${percent}%"></span></div><small>${readiness.ready ? 'All public gates verified. Two founder approvals are still required for activation.' : 'Fail-closed until every required gate passes.'}</small></section>
  <div class="section-head compact-head"><div><span class="label">Launch sequence</span><h2>Three controlled layers</h2></div><span>Evidence-bound</span></div>
  <section class="launch-groups">${groups}</section>
  <div class="section-head"><div><span class="label">Campaign commitments</span><h2>Separated by purpose</h2></div><span>No overlapping allocations</span></div>
  ${readinessCommitmentsMarkup(c)}
  <section class="readiness-fingerprint command-card"><div><span class="label">Readiness fingerprint</span><h3>${reportHash ? 'Exact reviewed state' : 'Report unavailable'}</h3><p>${reportHash ? 'This SHA-256 fingerprint changes whenever the readiness evidence or an operational gate changes.' : 'A fingerprint appears only when Project Q can build the authoritative readiness report.'}</p></div><code>${reportHash || 'No report hash available'}</code><small>${escapeHtml(readiness.reportVersion || 'readiness report pending')}</small></section>
  <section class="launch-safety"><img src="/campaign-app/assets/project-q-app-icon.webp" alt="" /><div><b>Founder approval remains outside this public screen.</b><p>Project Q may calculate, verify and publish status. It cannot activate the campaign, hold a treasury signer or execute a transfer from this interface.</p></div></section>
  <button class="outline-action launch-back" data-screen="home">← Back to campaign home</button>`;
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
  if (!p.telegramVerified) return 'Verify Telegram';
  if (!p.xVerified) return 'Connect Oracle X';
  if (!p.walletVerified) return 'Connect wallet in Oracle';
  return 'Open missions';
}

function nextStatusCard() {
  const p = state.profile;
  if (!p.telegramVerified) {
    return `<article class="next-status"><img src="/campaign-app/assets/identity/telegram-verified.webp" alt="" /><div><span>Next status</span><b>Verify Telegram</b><small>Open Project Q from the official bot.</small></div><button class="outline-action" data-screen="profile">Review</button></article>`;
  }
  if (!p.xVerified) {
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
  const count = verifiedCount();
  const op = operationNumber();
  const identityReady = count === 3;

  let nextMove = {
    label: 'Next Step',
    title: 'Verify Telegram',
    detail: 'Open Project Q from the official Telegram bot to establish your participant identity.',
    action: 'OPEN',
    screen: 'profile',
    profileView: 'identity',
    brand: 'q',
  };
  if (p.telegramVerified && !p.xVerified) {
    nextMove = {
      label: 'Next Step',
      title: 'Connect Oracle X',
      detail: 'Verify your X identity to unlock missions.',
      action: 'CONNECT',
      screen: 'profile',
      profileView: 'identity',
      brand: 'oracle',
    };
  } else if (p.telegramVerified && p.xVerified && !p.walletVerified) {
    nextMove = {
      label: 'Next Step',
      title: 'Verify Reward Wallet',
      detail: 'Connect the wallet used for eligibility and distributions.',
      action: 'VERIFY',
      screen: 'profile',
      profileView: 'identity',
      brand: 'oracle',
    };
  } else if (identityReady) {
    const lifecycle = operationLifecycleState();
    if (lifecycle.label === 'ACTIVE') {
      nextMove = {
        label: 'Next Step',
        title: 'Enter Mission Files',
        detail: 'The operation is active. Choose your next eligible mission.',
        action: 'ENTER',
        screen: 'operations',
        operationsView: 'missions',
        brand: 'q',
      };
    } else if (lifecycle.label === 'REVIEWING') {
      nextMove = {
        label: 'Operation Status',
        title: 'Final Review in Progress',
        detail: 'Verified activity is being reconciled before final allocations and release records.',
        action: 'FOLLOW',
        screen: 'operations',
        operationsView: 'progress',
        brand: 'q',
      };
    } else if (lifecycle.label === 'DISTRIBUTING') {
      nextMove = {
        label: 'Reward Status',
        title: 'Track Reward Delivery',
        detail: 'Follow scheduled releases through on-chain delivery and confirmed receipts.',
        action: 'TRACK',
        screen: 'rewards',
        brand: 'q',
      };
    } else if (['COMPLETED','ARCHIVED'].includes(lifecycle.label)) {
      nextMove = {
        label: 'Operation Complete',
        title: 'View Your Permanent Record',
        detail: 'Review your verified participation, XP, outcomes and campaign history.',
        action: 'VIEW',
        screen: 'record',
        brand: 'q',
      };
    } else {
      nextMove = {
        label: 'Next Step',
        title: 'Prepare for Operation 01',
        detail: 'Your identity is ready. Review the operation dossier and mission requirements before launch.',
        action: 'REVIEW',
        screen: 'operations',
        operationsView: 'overview',
        brand: 'q',
      };
    }
  }

  const actionAttrs = nextMove.screen === 'operations'
    ? `data-operation-view="${nextMove.operationsView}"`
    : nextMove.profileView
      ? `data-screen="${nextMove.screen}" data-profile-view="${nextMove.profileView}"`
      : `data-screen="${nextMove.screen}"`;

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

  return `<div class="terminal-ui terminal-mobile-reference">
    <section class="terminal-campaign-card">
      <div class="terminal-campaign-meta">
        <span>CAMPAIGN ${op}</span>
        ${terminalOperationPill()}
      </div>

      ${c.banner ? `<figure class="terminal-campaign-art"><img src="${c.banner}" alt="${escapeHtml(c.bannerAlt || c.name)}" /></figure>` : ''}

      ${countdownState
        ? `<div class="terminal-countdown-state"><span>CAMPAIGN TIMELINE</span><strong>${escapeHtml(countdownState)}</strong><small>${escapeHtml(schedule?.label || 'Waiting for authoritative Project Q state')}</small></div>`
        : `<div class="terminal-countdown-strip" aria-label="Campaign countdown">
            <div><strong>${String(days).padStart(2,'0')}</strong><span>DAYS</span></div>
            <div><strong>${String(hours).padStart(2,'0')}</strong><span>HOURS</span></div>
            <div><strong>${String(minutes).padStart(2,'0')}</strong><span>MINS</span></div>
            <div><strong>${String(seconds).padStart(2,'0')}</strong><span>SECS</span></div>
          </div>`}

      <div class="terminal-impact-tags">COMMUNITY × DEFI × CONSERVATION × GLOBAL IMPACT</div>
    </section>

    <section class="terminal-next-step ${nextMove.brand === 'oracle' ? 'oracle-next' : ''}">
      <div class="terminal-next-icon">
        ${nextMove.brand === 'oracle' ? `<img src="${ORACLE_LOGO}" alt="Oracle" />` : '<span>Q</span>'}
      </div>
      <div>
        <span>${escapeHtml(nextMove.label)}</span>
        <b>${escapeHtml(nextMove.title)}</b>
        <small>${escapeHtml(nextMove.detail)}</small>
      </div>
      <button ${actionAttrs}>${escapeHtml(nextMove.action)} →</button>
    </section>

    <section class="terminal-actions">
      <button data-operation-view="missions">
        <span class="terminal-action-icon">⌖</span>
        <div><b>Missions</b><small>Complete tasks, earn XP & rewards</small></div>
      </button>
      <button data-record-view="rank">
        <span class="terminal-action-icon">♜</span>
        <div><b>Rankings</b><small>See your progress and standing</small></div>
      </button>
      <button data-screen="rewards">
        <span class="terminal-action-icon">◆</span>
        <div><b>Rewards</b><small>Allocations, wallet and receipts</small></div>
      </button>
      <button data-operation-view="intel">
        <span class="terminal-action-icon">▤</span>
        <div><b>Intel</b><small>Updates, verification and operation info</small></div>
      </button>
    </section>

    <section class="terminal-impact">
      <div>
        <span>PROJECT Q // IMPACT LAYER</span>
        <h2>Real community.<br />Real impact.</h2>
        <p>Verified participation powers campaign economics, contribution records and transparent ecosystem impact.</p>
      </div>
      <button data-operation-view="overview" aria-label="Open active operation">→</button>
    </section>
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
  const c = state.campaign || fallbackCampaign;
  const p = state.profile;
  const minimumUsd = Number(c.eligibility?.minimumFawkqUsd || state.referrals?.minimumPurchaseUsd || 2);
  return [
    {
      key: 'telegram',
      label: 'Telegram identity',
      complete: Boolean(p.telegramVerified),
      detail: p.telegramVerified ? 'Telegram Mini App identity verified.' : 'Open Project Q from the official Telegram bot.',
      action: p.telegramVerified ? null : { label: 'Open Profile', screen: 'profile', profileView: 'identity' },
      provider: 'q',
    },
    {
      key: 'x',
      label: 'X linked through Oracle',
      complete: Boolean(p.xVerified),
      detail: p.xVerified ? 'Oracle X identity verified.' : 'Connect the X account used for eligible campaign activity.',
      action: p.xVerified ? null : { label: 'Connect X', screen: 'profile', profileView: 'identity' },
      provider: 'oracle',
    },
    {
      key: 'wallet',
      label: 'Reward wallet',
      complete: Boolean(p.walletVerified),
      detail: p.walletVerified ? 'Verified reward wallet connected.' : 'Connect the wallet used for campaign eligibility and distributions.',
      action: p.walletVerified ? null : { label: 'Verify Wallet', screen: 'profile', profileView: 'identity' },
      provider: 'oracle',
    },
    {
      key: 'token-account',
      label: 'FAWKQ token account',
      complete: Boolean(p.tokenAccountReady),
      detail: p.tokenAccountReady ? 'FAWKQ token account detected.' : 'A FAWKQ token account must be available on the verified reward wallet.',
      action: p.tokenAccountReady ? null : { label: 'Check Wallet', screen: 'profile', profileView: 'wallet' },
      provider: 'q',
    },
    {
      key: 'holder',
      label: `Minimum $${minimumUsd} FAWKQ`,
      complete: Boolean(p.holderEligible),
      detail: p.holderEligible
        ? `Verified FAWKQ holding meets the $${minimumUsd} minimum.`
        : `Hold at least $${minimumUsd} of FAWKQ in the verified reward wallet.`,
      action: p.holderEligible ? null : { label: 'Check Eligibility', screen: 'profile', profileView: 'wallet' },
      provider: 'q',
    },
  ];
}

function campaignClearanceReady() {
  return campaignEligibilityRequirements().every(({ complete }) => complete);
}

function clearanceMarkup({ compact = false } = {}) {
  const requirements = campaignEligibilityRequirements();
  const completeCount = requirements.filter(({ complete }) => complete).length;
  const next = requirements.find(({ complete }) => !complete);
  return `<section class="clearance-panel ${compact ? 'compact' : ''}">
    <div class="clearance-head">
      <div><span>CAMPAIGN CLEARANCE</span><h3>${completeCount === requirements.length ? 'Clearance Complete' : `Complete ${requirements.length - completeCount} Requirement${requirements.length - completeCount === 1 ? '' : 's'}`}</h3></div>
      <b>${completeCount}/${requirements.length}</b>
    </div>
    <div class="clearance-list">
      ${requirements.map((item) => `<article class="clearance-row ${item.complete ? 'complete' : 'incomplete'}">
        <i>${item.complete ? '✓' : '○'}</i>
        <div><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.detail)}</small></div>
        ${item.provider === 'oracle' ? `<img src="${ORACLE_LOGO}" alt="Oracle" />` : ''}
        ${item.action ? `<button data-screen="${item.action.screen}" data-profile-view="${item.action.profileView}">${escapeHtml(item.action.label)} →</button>` : ''}
      </article>`).join('')}
    </div>
    ${next ? `<div class="clearance-next"><span>NEXT REQUIRED</span><b>${escapeHtml(next.label)}</b></div>` : '<div class="clearance-next complete"><span>STATUS</span><b>READY FOR ELIGIBLE MISSIONS</b></div>'}
  </section>`;
}

function missionLockReason(mission) {
  if (!mission.enabled) {
    const campaignState = String(state.profile?.campaignState || state.campaign?.status || 'DRAFT').toUpperCase();
    if (['DRAFT','PRE_LAUNCH'].includes(campaignState)) {
      return {
        title: 'Operation has not opened this mission yet',
        action: 'Wait for operation activation',
        remains: 'Mission readiness gate',
      };
    }
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

  if (verified > 0) return { label: 'VERIFIED', tone: 'success' };
  if (pending > 0) return { label: 'VERIFYING', tone: 'pending' };
  if (rejected > 0 && verified === 0 && pending === 0) return { label: 'REJECTED', tone: 'blocked' };
  if (mission.kind === 'COLLECTIVE') return { label: 'COLLECTIVE', tone: 'pending' };
  if (mission.enabled && campaignClearanceReady()) return { label: 'AVAILABLE', tone: 'ready' };
  return { label: 'LOCKED', tone: 'pending' };
}

function missionCard(mission) {
  const oracle = mission.id === 'oracle-raids';
  const collective = mission.kind === 'COLLECTIVE';
  const image = mission.image;
  const visual = image
    ? `<img class="mission-art ${oracle ? 'oracle-art' : ''}" src="${image}" alt="" />`
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
  const c = state.campaign || fallbackCampaign;
  const missions = Array.isArray(c.missions) ? c.missions : [];
  const individual = missions.filter(({ kind }) => kind !== 'COLLECTIVE');
  const collective = missions.filter(({ kind }) => kind === 'COLLECTIVE');
  const available = individual.filter(({ enabled }) => enabled).length;
  const verified = individual.reduce((total, mission) => total + Number(missionTelemetry(mission)?.verified || 0), 0);

  return `<div class="missions-v2">
    <section class="screen-intro operations-intro missions-hero">
      <div>
        <span class="label">Campaign operations</span>
        <h2>Missions</h2>
        <p>Choose an eligible action, complete it, and let Project Q record verified campaign participation.</p>
      </div>
      <div class="section-actions">
        <button class="info-action" data-explainer="campaign" aria-label="How campaigns work">?</button>
        ${runtimePill()}
      </div>
    </section>

    <section class="missions-snapshot">
      <article><span>Available now</span><strong>${available}</strong><small>mission lanes</small></article>
      <article><span>Verified today</span><strong>${verified}</strong><small>accepted actions</small></article>
      <article><span>Daily XP</span><strong>${Number(state.profile.todayXp || 0)}</strong><small>of ${Number(c.xpCaps?.overallDaily || 0)}</small></article>
      <article><span>Identity</span><strong>${verifiedCount()}/3</strong><small>${verifiedCount() === 3 ? 'campaign ready' : 'finish setup'}</small></article>
    </section>

    <section class="missions-primary">
      <div class="section-head">
        <div><span class="label">For you</span><h2>Individual missions</h2></div>
        <span>${individual.length} campaign lanes</span>
      </div>
      <div class="mission-list mission-list-v2">${individual.map(missionCard).join('')}</div>
    </section>

    ${collective.length ? `<section class="missions-collective">
      <div class="section-head">
        <div><span class="label">Collective objective</span><h2>Ecosystem missions</h2></div>
        <span>Shared progress</span>
      </div>
      <div class="mission-list mission-list-v2 collective-list">${collective.map(missionCard).join('')}</div>
    </section>` : ''}

    <section class="oracle-note missions-oracle" data-tour-target="oracle">
      <img src="${ORACLE_LOGO}" alt="Oracle" />
      <div><b>Verified with Oracle</b><p>Oracle verifies supported identity and activity signals. Project Q remains the source of truth for XP, caps, eligibility and campaign records.</p></div>
      <button class="info-action" data-explainer="oracle" aria-label="What Oracle does">?</button>
    </section>
  </div>`;
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

function badgeGallery(badges = []) {
  return `<div class="badge-gallery">${badges.map((badge) => {
    const unlocked = state.profile.achievements.includes(badge.id);
    return `<article class="achievement ${unlocked ? 'unlocked' : 'locked'}"><img src="${badge.image}" alt="" /><div><b>${escapeHtml(badge.label)}</b><p>${escapeHtml(badge.description || 'Earn through verified campaign activity')}</p></div><span>${unlocked ? 'Unlocked' : 'Locked'}</span></article>`;
  }).join('')}</div>`;
}

function xpScreen() {
  const c = state.campaign || fallbackCampaign;
  const caps = c.xpCaps || fallbackCampaign.xpCaps;
  const otherCap = Math.max(0, caps.overallDaily - caps.participationDaily - caps.projectQDaily - caps.trendingBotsDaily);
  const today = state.profile.todayXpByBucket || {};
  const activity = state.profile.activity || [];
  const totalXp = Number(state.profile.xp || 0);
  const todayXp = Number(state.profile.todayXp || 0);
  const rank = state.profile.rank && state.profile.rank !== '—' ? state.profile.rank : 'UNRANKED';

  return `<div class="xp-v2">
    <section class="progression-hero command-card">
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
    </section>

    <section class="xp-daily command-card">
      <div class="panel-title"><span>Today’s XP</span><small>Overall cap ${Number(caps.overallDaily || 0)} XP</small></div>
      <div class="xp-progress-list">
        ${progressRow('Participation', today.participation, caps.participationDaily)}
        ${progressRow('Trending activity', today.trending, caps.trendingBotsDaily)}
        ${progressRow('Project Q missions', today.mission, caps.projectQDaily)}
        ${progressRow('Other verified activity', today.other, otherCap)}
      </div>
    </section>

    ${communityPulsePanel()}

    <section class="xp-ledger-section">
      <div class="section-head compact-head">
        <div><span class="label">Verified activity</span><h2>XP ledger</h2></div>
        <span>Source · status · time</span>
      </div>
      <section class="ledger xp-ledger">${activity.length ? activity.map(activityRow).join('') : '<div class="empty compact"><b>Awaiting verified activity</b><p>XP entries appear here after eligible activity is verified and settled by Project Q.</p></div>'}</section>
    </section>

    <section class="xp-achievement-section">
      <div class="section-head">
        <div><span class="label">Progression</span><h2>Achievements</h2></div>
        <button class="info-action" data-explainer="ranks" aria-label="How ranks work">?</button>
      </div>
      ${badgeGallery(c.xpBadges)}
    </section>
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
  const rankDetail = view?.available ? `${Number(view.participantCount || 0).toLocaleString()} verified participants` : 'Finalized verified standings';
  const emptyTitle = view?.available ? 'No ranked activity yet' : 'Rankings open with verified activity';
  const emptyDetail = view?.reason || 'No placeholder scores or identities are shown. Verified records will appear here.';
  const mode = state.leaderboardMeta?.available ? 'VERIFIED RECORDS' : 'READINESS MODE';

  return `<div class="leaderboard-v2">
    <section class="rank-hero command-card">
      <div>
        <span class="label">Your standing</span>
        <strong>${escapeHtml(state.profile.rank)}</strong>
        <p>${change ? `${change > 0 ? '↑' : '↓'} ${Math.abs(change)} positions today` : escapeHtml(rankDetail)}</p>
      </div>
      <div class="progression-actions">
        <button class="info-action" data-explainer="leaderboard" aria-label="How leaderboards work">?</button>
        <button class="outline-action" data-explainer="ranks">How ranks work</button>
      </div>
    </section>

    <div class="tabs rank-tabs" role="tablist">
      ${tabs.map(([id, label]) => `<button class="${state.leaderboardView === id ? 'active' : ''}" data-leaderboard-view="${id}" role="tab" aria-selected="${state.leaderboardView === id}">${label}</button>`).join('')}
    </div>

    <section class="leaderboard-list rank-list">
      ${rows.length ? rows.map((row, index) => leaderboardRow(row, index, view?.unit || 'XP')).join('') : `<div class="empty compact"><b>${escapeHtml(emptyTitle)}</b><p>${escapeHtml(emptyDetail)}</p></div>`}
    </section>

    <div class="leaderboard-clock rank-verification-note">
      <span>Standings update after finalized verification</span><b>${mode}</b>
    </div>

    <section class="rank-achievements">
      <div class="section-head">
        <div><span class="label">Rank progression</span><h2>Performance badges</h2></div>
        <span>Verified standings only</span>
      </div>
      ${badgeGallery(c.leaderboardBadges)}
    </section>
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

function operationPhaseBriefMarkup() {
  const lifecycle = operationLifecycleState();
  const copy = {
    UPCOMING: {
      title: 'Prepare for launch',
      detail: 'Review clearance, mission requirements and operation economics before eligible participation opens.',
      next: 'Complete clearance and review Mission Files.',
    },
    ACTIVE: {
      title: 'Operation active',
      detail: 'Eligible Mission Files are open. Verified activity contributes to campaign progress, scoring and economic outcomes.',
      next: 'Complete an eligible mission and confirm it reaches your Record.',
    },
    REVIEWING: {
      title: 'Final review in progress',
      detail: 'Project Q is reconciling verified activity, outcomes and final allocation inputs. New campaign scoring is closed.',
      next: 'Follow review status and wait for finalized allocations.',
    },
    DISTRIBUTING: {
      title: 'Reward distribution in progress',
      detail: 'Finalized allocations are moving through scheduled treasury-authorized releases and on-chain confirmation.',
      next: 'Track each release until a confirmed receipt appears.',
    },
    COMPLETED: {
      title: 'Operation complete',
      detail: 'Campaign participation and economic outcomes are finalized. Your verified history remains in your Project Q Record.',
      next: 'Review your permanent operation record and receipts.',
    },
    ARCHIVED: {
      title: 'Operation archived',
      detail: 'This operation is read-only. Historical participation, outcomes and receipts remain available for audit.',
      next: 'Review archived records.',
    },
    'LAUNCH BLOCKED': {
      title: 'Launch gates are not cleared',
      detail: 'The campaign window may have arrived, but Project Q remains fail-closed until authoritative activation requirements pass.',
      next: 'Review Operation Intel and wait for launch clearance.',
    },
    PAUSED: {
      title: 'Operation paused',
      detail: 'Campaign participation is temporarily paused by authoritative operation state.',
      next: 'Wait for Project Q to resume or publish the next operation status.',
    },
    TERMINATED: {
      title: 'Operation terminated',
      detail: 'Campaign participation has been terminated. Existing verified records remain available for audit.',
      next: 'Review your Record and finalized receipts.',
    },
  }[lifecycle.label] || {
    title: 'Operation status',
    detail: 'Project Q is synchronizing authoritative operation state.',
    next: 'Wait for the current state to settle.',
  };

  return `<section class="operation-phase-brief">
    <div><span>NOW</span><b>${escapeHtml(copy.title)}</b><small>${escapeHtml(copy.detail)}</small></div>
    <div><span>NEXT</span><b>${escapeHtml(copy.next)}</b></div>
  </section>`;
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

function operationNumber() {
  const sequence = String(state.campaign?.sequence || '01').match(/\d+/)?.[0] || '01';
  return sequence.padStart(2, '0');
}

function operationTabs() {
  const tabs = [
    ['overview', 'Overview'],
    ['missions', 'Mission Files'],
    ['progress', 'Progress'],
    ['rewards', 'Rewards'],
    ['intel', 'Intel'],
  ];
  return `<div class="operation-tabs" role="tablist">${tabs.map(([id, label]) => `<button class="${state.operationsView === id ? 'active' : ''}" data-operation-view="${id}" role="tab" aria-selected="${state.operationsView === id}">${label}</button>`).join('')}</div>`;
}

function operationsScreen() {
  const c = state.campaign || fallbackCampaign;
  const missions = Array.isArray(c.missions) ? c.missions : [];
  const op = operationNumber();
  const commitments = c.campaignCommitments || {};
  const rewardPool = commitments.campaignRewards ? formatBaseUnits(commitments.campaignRewards.amountBaseUnits) : '15M';
  const duckBonus = commitments.diamondDuckBonus ? formatBaseUnits(commitments.diamondDuckBonus.amountBaseUnits) : '2.5M';
  const burnReserve = commitments.earnToBurn ? formatBaseUnits(commitments.earnToBurn.amountBaseUnits) : '15M';
  const topPrize = commitments.topContributorPrize?.amountSol ? `${commitments.topContributorPrize.amountSol} SOL` : '1 SOL';
  const readinessAvailable = Boolean(state.readiness?.available);
  const readiness = readinessAvailable ? Math.max(0, Math.min(100, Number(state.readiness.percent || 0))) : null;
  const readinessLabel = readiness == null ? 'SYNCING' : `${readiness}%`;
  const readinessWidth = readiness == null ? 0 : readiness;

  let content = '';

  if (state.operationsView === 'missions') {
    content = `<section class="operation-content-panel">
      <div class="operation-section-head">
        <div><span>MISSION FILES</span><h3>Choose your next objective.</h3></div>
        <b>${missions.length} FILES</b>
      </div>
      <div class="mission-file-index">${missions.map((mission, index) => `
        <button class="mission-file-row" data-mission-id="${escapeHtml(mission.id)}">
          <span class="file-number">MF ${String(index + 1).padStart(2, '0')}</span>
          ${mission.image ? `<img src="${mission.image}" alt="" />` : '<i>Q</i>'}
          <div><b>${escapeHtml(mission.title)}</b><small>${escapeHtml(mission.reward)} · ${escapeHtml(canonicalMissionState(mission, missionTelemetry(mission)).label)}</small></div>
          <em>OPEN →</em>
        </button>`).join('')}
      </div>
    </section>`;
  } else if (state.operationsView === 'progress') {
    content = `<section class="operation-content-panel">
      <div class="operation-section-head"><div><span>OPERATION PROGRESS</span><h3>Verified campaign movement.</h3></div><b>${escapeHtml(readinessLabel)}</b></div>
      <div class="operation-progress-line"><span>Campaign Progress</span><strong>${escapeHtml(readinessLabel)}</strong></div>
      <div class="operation-progress-bar"><i style="width:${readinessWidth}%"></i></div>
      <div class="operation-cycle-summary"><span>5 × 48H CYCLES</span><b>${escapeHtml(state.runtime?.schedule?.label || 'Readiness mode')}</b></div>
      <button class="operation-burn-link" data-screen="burns">Earn to Burn <span>Collective progress & public receipts →</span></button>
    </section>`;
  } else if (state.operationsView === 'rewards') {
    content = `<section class="operation-content-panel">
      <div class="operation-section-head"><div><span>OPERATION ECONOMICS</span><h3>Campaign commitments.</h3></div><b>OP ${op}</b></div>
      <div class="operation-economics">
        <article><strong>${rewardPool}</strong><span>FAWKQ</span><small>Reward Pool</small></article>
        <article><strong>${duckBonus}</strong><span>FAWKQ</span><small>Diamond Duck</small></article>
        <article><strong>${burnReserve}</strong><span>FAWKQ</span><small>Earn to Burn</small></article>
        <article><strong>${topPrize}</strong><span></span><small>Top Duck Prize</small></article>
      </div>
      <button class="q-primary-action" data-screen="rewards">OPEN REWARD PIPELINE →</button>
    </section>`;
  } else if (state.operationsView === 'intel') {
    content = `<section class="operation-content-panel">
      <div class="operation-section-head"><div><span>OPERATIONAL INTEL</span><h3>Verification & readiness.</h3></div><b>LIVE SOURCES</b></div>
      <article class="brand-service oracle-service" data-tour-target="oracle">
        <img src="${ORACLE_LOGO}" alt="Oracle" />
        <div><span>INTELLIGENCE / VERIFICATION PROVIDER</span><b>Oracle</b><p>Identity and supported activity verification retain Oracle's native blue identity inside Project Q.</p></div>
        <button class="info-action" data-explainer="oracle">?</button>
      </article>
      ${readinessDetailsMarkup()}
    </section>`;
  } else {
    content = `<section class="operation-content-panel operation-overview-panel">
      <div class="operation-progress-line"><span>CAMPAIGN PROGRESS</span><strong>${escapeHtml(readinessLabel)}</strong></div>
      <div class="operation-progress-bar"><i style="width:${readinessWidth}%"></i></div>

      ${clearanceMarkup({ compact: true })}

      <div class="operation-economics">
        <article><strong>${rewardPool}</strong><span>FAWKQ</span><small>Reward Pool</small></article>
        <article><strong>${duckBonus}</strong><span>FAWKQ</span><small>Diamond Duck</small></article>
        <article><strong>${burnReserve}</strong><span>FAWKQ</span><small>Earn to Burn</small></article>
        <article><strong>${topPrize}</strong><span></span><small>Top Duck Prize</small></article>
      </div>

      <div class="operation-impact-note">
        <div class="impact-globe">◎</div>
        <div><b>A cleaner ocean. A brighter tomorrow.</b><span>Powered by community.</span></div>
      </div>

      <button class="q-primary-action" data-operation-view="missions">VIEW MISSION FILES →</button>
    </section>`;
  }

  return `<div class="operations-ui operation-reference">
    <section class="operation-cover">
      <div class="operation-cover-copy">
        <span class="operation-kicker">OPERATION ${op}</span>
        <h2>${escapeHtml(c.name || 'Bond the Duck')}</h2>
        <p>MISSION // ${escapeHtml(c.tagline || 'Small actions. Bigger oceans.')}</p>

        <div class="operation-facts">
          <div><span>START</span><b>${escapeHtml(formatOperationDate(c.schedule?.activeOpensAt))}</b></div>
          <div><span>DURATION</span><b>10 DAYS</b></div>
          <div><span>CYCLES</span><b>5 × 48H</b></div>
          <div><span>FINAL REVIEW</span><b>48–72H</b></div>
        </div>
      </div>
      ${c.banner ? `<img src="${c.banner}" alt="${escapeHtml(c.bannerAlt || c.name)}" />` : ''}
      <span class="operation-stamp">OP ${op}</span>
    </section>

    ${operationTabs()}
    ${operationLifecycleMarkup()}
    ${operationPhaseBriefMarkup()}
    ${content}
  </div>`;
}

function recordTabs() {
  const tabs = [['xp', 'XP'], ['rank', 'Rank'], ['achievements', 'Achievements'], ['activity', 'Activity']];
  return `<div class="record-tabs" role="tablist">${tabs.map(([id, label]) => `<button class="${state.recordView === id ? 'active' : ''}" data-record-view="${id}" role="tab" aria-selected="${state.recordView === id}">${label}</button>`).join('')}</div>`;
}

function recordScreen() {
  const c = state.campaign || fallbackCampaign;
  const p = state.profile;
  let content = '';
  if (state.recordView === 'rank') {
    content = leaderboardScreen();
  } else if (state.recordView === 'achievements') {
    content = `<section class="record-panel">
      <div class="dossier-heading"><span>Achievements</span><b>VERIFIED PERFORMANCE</b></div>
      ${badgeGallery([...(c.xpBadges || []), ...(c.leaderboardBadges || [])])}
    </section>`;
  } else if (state.recordView === 'activity') {
    content = `<section class="record-panel">
      <div class="dossier-heading"><span>Verified Activity</span><b>AUDITABLE RECORD</b></div>
      <section class="ledger">${p.activity?.length ? p.activity.map(activityRow).join('') : '<div class="empty compact"><b>Awaiting verified activity</b><p>Your permanent activity record begins when Project Q accepts and settles eligible participation.</p></div>'}</section>
    </section>`;
  } else {
    content = xpScreen();
  }

  return `<div class="record-ui">
    <section class="record-header">
      <div><span>PROJECT Q RECORD</span><h2>${escapeHtml(p.name)}</h2><p>Verified campaign participation becomes an auditable operation record.</p></div>
      <div class="record-score"><strong>${Number(p.xp || 0).toLocaleString()}</strong><span>CAMPAIGN XP</span><small>RANK ${escapeHtml(p.rank && p.rank !== '—' ? p.rank : 'UNRANKED')}</small></div>
    </section>
    ${recordTabs()}
    ${content}
  </div>`;
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
  const walletLabel = state.wallet && isSolanaAddress(state.wallet) ? escapeHtml(short(state.wallet)) : 'Not connected';

  const hasEarnedActivity = Boolean(state.profile.completedMissions > 0 || state.profile.todayXp > 0 || state.profile.xp > 0);
  const hasVerifiedActivity = Boolean(state.profile.xp > 0 || state.profile.activity?.length);
  const hasScheduledRelease = actualReleases.length > 0;
  const hasReleased = actualReleases.some(({ status }) => ['paid','recovered'].includes(status));
  const hasConfirmed = actualReleases.some(({ transactionSignature }) => isSolanaSignature(transactionSignature));

  const stages = [
    ['01', 'Earned', hasEarnedActivity, hasEarnedActivity ? 'Eligible participation recorded' : 'Complete eligible campaign activity'],
    ['02', 'Verified', hasVerifiedActivity, hasVerifiedActivity ? 'Activity verified and settled' : 'Awaiting verified Project Q record'],
    ['03', 'Allocated', Boolean(rewards.recorded), rewards.recorded ? 'Reward allocation recorded' : 'Awaiting campaign allocation'],
    ['04', 'Scheduled', hasScheduledRelease, hasScheduledRelease ? 'Release schedule created' : 'Awaiting release schedule'],
    ['05', 'Released', hasReleased, hasReleased ? 'Asset sent to verified wallet' : 'Awaiting treasury-authorized release'],
    ['06', 'Confirmed', hasConfirmed, hasConfirmed ? 'On-chain receipt confirmed' : 'Awaiting finalized transaction receipt'],
  ];

  const receiptCards = actualReleases
    .filter(({ status, transactionSignature }) => ['paid','recovered'].includes(status) || isSolanaSignature(transactionSignature))
    .map((release) => {
      const sig = isSolanaSignature(release.transactionSignature) ? release.transactionSignature : null;
      return `<article class="allocation-receipt">
        <header><span>PROJECT Q // ALLOCATION RECEIPT</span><b>OP ${operationNumber()}</b></header>
        <div class="receipt-grid">
          <div><span>Operation</span><b>OP ${operationNumber()}</b></div>
          <div><span>Reason</span><b>${escapeHtml(rewardCategoryLabel(release.category))}${release.cycleId ? ` · CYCLE ${Number(release.cycleId)}` : ''}</b></div>
          <div><span>Recipient</span><b>${escapeHtml(state.profile.name)}</b></div>
          <div><span>Asset</span><b>FAWKQ</b></div>
          <div><span>Amount</span><b>${formatBaseUnits(release.amountBaseUnits)}</b></div>
          <div><span>Status</span><b>${escapeHtml(String(release.status || '').toUpperCase())}</b></div>
          <div><span>Release</span><b>${Number(release.percent || 0)}%</b></div>
          <div><span>Verified</span><b>${escapeHtml(formatProfileDate(release.scheduledAt))}</b></div>
        </div>
        ${sig ? `<a href="https://solscan.io/tx/${encodeURIComponent(sig)}" target="_blank" rel="noopener noreferrer">TX ${escapeHtml(short(sig))} ↗</a>` : '<span class="receipt-pending">On-chain receipt pending</span>'}
      </article>`;
    }).join('');

  return `<div class="rewards-operations-ui">
    <section class="rewards-command">
      <div>
        <span>PROJECT Q REWARDS</span>
        <h2>${allocation}</h2>
        <b>FAWKQ ALLOCATED</b>
        <p>Verified participation moves through a transparent allocation and delivery pipeline.</p>
      </div>
      <div class="reward-status-card">
        ${statePill(delivery.label, delivery.tone)}
        <small>Verified wallet</small>
        <b>${walletLabel}</b>
      </div>
    </section>

    <section class="reward-pipeline">
      <div class="dossier-heading"><span>Reward Pipeline</span><b>EARNED → CONFIRMED</b></div>
      <div class="pipeline-steps">
        ${stages.map(([number,label,complete,detail]) => `<article class="${complete ? 'complete' : ''}">
          <span>${number}</span>
          <div><b>${label}</b><small>${detail}</small></div>
          <i>${complete ? '✓' : '○'}</i>
        </article>`).join('')}
      </div>
    </section>

    <section class="reward-summary-grid">
      <article><span>Allocated</span><strong>${allocation}</strong><small>recorded total</small></article>
      <article><span>Scheduled</span><strong>${scheduled}</strong><small>release plan</small></article>
      <article class="distributed"><span>Distributed</span><strong>${distributed}</strong><small>on-chain</small></article>
      <article><span>Outstanding</span><strong>${outstanding}</strong><small>remaining</small></article>
    </section>

    <section class="reward-destination">
      <div><span>DESTINATION</span><b>Verified Reward Wallet</b><small>${walletLabel}</small><em>No claim transaction required.</em></div>
      <button data-screen="profile" data-profile-view="wallet">OPEN WALLET →</button>
    </section>

    ${receiptCards ? `<section class="receipt-section"><div class="dossier-heading"><span>Allocation Receipts</span><b>${actualReleases.length} RELEASE RECORDS</b></div><div class="receipt-stack">${receiptCards}</div></section>` : `<section class="receipt-empty"><span>ALLOCATION RECEIPTS</span><h3>No allocation receipt yet.</h3><p>Your receipt appears after Project Q finalizes an allocation and the release reaches verified on-chain delivery.</p></section>`}

    <section class="reward-transparency-link">
      <button data-operation-view="rewards">VIEW OPERATION ECONOMICS →</button>
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
  const milestonePlan = milestones.map((item) => `<article class="burn-plan-row ${item.state === 'CONFIRMED' ? 'complete' : ''}">
    <span>${Number(item.sequence)}</span><div><b>${escapeHtml(item.label)}</b><small>${Number(item.progressTargetUnits).toLocaleString()} verified XP</small></div>
    <strong>${formatBaseUnits(item.burnAmountBaseUnits, b.decimals)} FAWKQ</strong>${statePill(item.state || 'PLANNED', item.state === 'CONFIRMED' ? 'success' : 'pending')}
  </article>`).join('');
  const requested = new URLSearchParams(location.search).get('receipt');
  const receipts = (b.receipts || []).map((receipt) => {
    const selected = requested === receipt.receiptCode ? ' selected' : '';
    const explorer = `https://solscan.io/tx/${encodeURIComponent(receipt.signature)}`;
    return `<article class="burn-receipt${selected}"><div><span class="label">${escapeHtml(receipt.receiptCode)}</span><h3>${formatBaseUnits(receipt.amountBaseUnits, b.decimals)} FAWKQ</h3><p>${escapeHtml(receipt.burnType)} · ${escapeHtml(receipt.blockTime)}</p></div><a class="outline-action" href="${explorer}" target="_blank" rel="noopener noreferrer">On-chain proof</a></article>`;
  }).join('');
  if (b.unavailable) {
    return `<div class="burns-unavailable">
      <section class="screen-intro"><div><span class="label">Collective mission</span><h2>Earn to Burn</h2><p>${escapeHtml(configured.tagline || 'Individual activity earns rewards. Collective activity advances transparent burn milestones.')}</p></div>${statePill('SYNCING', 'pending')}</section>
      <section class="system-status-banner syncing"><div><span>BURN LEDGER</span><b>Verified burn state is temporarily unavailable</b><small>Project Q is not inferring supply, burned totals, milestone completion or receipt counts while the authoritative ledger is unavailable.</small></div><button data-retry-system>Retry</button></section>
      <section class="record-panel"><div class="dossier-heading"><span>Configured Plan</span><b>READ-ONLY</b></div><div class="burn-plan">${milestonePlan || '<div class="empty compact"><b>Milestone configuration unavailable</b><p>No burn state is being inferred.</p></div>'}</div></section>
    </div>`;
  }

  return `<section class="screen-intro"><div><span class="label">Collective mission</span><h2>Earn to Burn</h2><p>${escapeHtml(configured.tagline || 'Individual activity earns rewards. Collective activity advances transparent burn milestones.')}</p></div>${statePill(b.state)}</section>
  <section class="burn-grid">${metric('Reference supply', formatBaseUnits(b.originalSupplyBaseUnits, b.decimals), 'FAWKQ')}${metric('Confirmed burned', formatBaseUnits(b.totalBurnedBaseUnits, b.decimals), `${formatPercentBps(b.supplyRemovedBps)} removed`)}${metric('Observed supply', formatBaseUnits(b.currentSupplyBaseUnits, b.decimals), 'Last verified state')}${metric('Receipts', Number(b.burnCount || 0), 'On-chain confirmed')}</section>
  <section class="command-card burn-milestone"><div class="panel-title"><span>Opening commitment</span><small>${escapeHtml(configured.openingBurnStatus || 'PLANNED')}</small></div><strong>${formatBaseUnits(configured.openingBurnBaseUnits, b.decimals)} FAWKQ</strong><p>Additional 1.5% from the FAWKQ creator wallet. It does not reduce the campaign reward pool, Diamond Duck bonus or 1 SOL prize.</p></section>
  <section class="command-card burn-milestone"><div class="panel-title"><span>Next collective milestone</span><small>${milestone ? escapeHtml(milestone.state) : 'NOT CONFIGURED'}</small></div>${milestone ? `<strong>${escapeHtml(milestone.label)}</strong><div class="progress"><span style="width:${Math.min(100, Number(milestone.progressBps || 0) / 100)}%"></span></div><p>${Number(milestone.progressTargetUnits).toLocaleString()} verified campaign XP unlocks a ${formatBaseUnits(milestone.burnAmountBaseUnits, b.decimals)} FAWKQ burn. Two founder approvals and one creator-wallet execution signature are required.</p>` : '<div class="empty compact">The live burn program has not been provisioned.</div>'}</section>
  <div class="section-head compact-head"><div><span class="label">Locked milestone plan</span><h2>Five verified unlocks</h2></div><span>15,000,000 FAWKQ total</span></div>
  <section class="burn-plan">${milestonePlan || '<div class="empty compact">The milestone plan is unavailable.</div>'}</section>
  <div class="section-head"><div><span class="label">Burn receipts</span><h2>Immutable evidence</h2></div></div><div class="burn-receipts">${receipts || '<div class="empty command-card"><b>No confirmed burn receipts</b><p>No Earn to Burn transaction has been executed or confirmed.</p></div>'}</div>
  <section class="oracle-note"><img src="/campaign-app/assets/project-q-app-icon.webp" alt="Project Q" /><div><b>Founder-authorized execution</b><p>The locked execution flow records both founder approvals before Project Q prepares the exact burn. The creator wallet signs the irreversible transaction; Project Q never stores its private key.</p></div></section>`;
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

function profileTabs() {
  const tabs = [['overview', 'Overview'], ['wallet', 'Wallet'], ['rewards', 'Rewards'], ['activity', 'Activity']];
  return `<div class="profile-tabs passport-tabs" role="tablist">${tabs.map(([id, label]) => `<button class="${state.profileView === id ? 'active' : ''}" data-profile-view="${id}" role="tab" aria-selected="${state.profileView === id}">${label}</button>`).join('')}</div>`;
}

function profileOverview() {
  const p = state.profile;
  const c = state.campaign || fallbackCampaign;
  const pulse = state.community?.today;
  const count = verifiedCount();

  return `<div class="passport-overview">
    <section class="passport-overview-grid">
      <article class="passport-overview-card">
        <span>ACTIVE OPERATION</span>
        <h3>${escapeHtml(c.name || 'Bond the Duck')}</h3>
        <p>${Number(p.completedMissions || 0)} verified missions · ${Number(p.xp || 0).toLocaleString()} XP</p>
        <button data-screen="operations">OPEN OP ${operationNumber()} →</button>
      </article>

      <article class="passport-overview-card oracle-passport-card">
        <span>IDENTITY</span>
        <h3>${count}/3 Verified</h3>
        <p>Telegram, Oracle X and reward wallet form your Project Q identity.</p>
        <button data-profile-view="identity">MANAGE IDENTITY →</button>
      </article>
    </section>

    <section class="passport-secondary-actions">
      <button data-profile-view="identity"><span>Identity & Verification</span><b>${count}/3</b></button>
      <button data-profile-view="referrals"><span>Verified Referrals</span><b>${Number(state.referrals?.counts?.qualified || 0)}</b></button>
      <button data-replay-tour><span>Project Q Guide</span><b>REPLAY</b></button>
    </section>

    <section class="passport-achievements-preview">
      <div class="dossier-heading"><span>Achievements</span><button data-record-view="achievements">VIEW ALL →</button></div>
      ${badgeGallery((c.xpBadges || []).slice(0,4))}
    </section>

    <section class="passport-impact-stamp">
      <span>SMALL ACTIONS.</span>
      <b>BIGGER OCEANS.</b>
      <small>Every verified contribution becomes part of your permanent Project Q record.</small>
    </section>
  </div>`;
}

function profileActivity() {
  const p = state.profile;
  const rows = p.activity || [];
  return `<div class="passport-activity-view">
    <section class="passport-activity-summary">
      <div><span>TODAY</span><b>${Number(p.todayXp || 0)} XP</b></div>
      <div><span>TOTAL</span><b>${Number(p.xp || 0).toLocaleString()} XP</b></div>
      <div><span>RECORDS</span><b>${rows.length}</b></div>
    </section>

    <section class="record-panel">
      <div class="dossier-heading"><span>Verified Contributions</span><b>PROJECT Q XP RECORDS</b></div>
      <section class="ledger">${rows.length
        ? rows.map((item) => activityRow({
            label: missionName(item.missionCode, item.source),
            timestamp: `${item.source || 'verified'} · Cycle ${Number(item.cycleId || 0)} · ${formatProfileDate(item.awardedAt)}`,
            xp: Number(item.amount || 0),
            icon: 'Q',
          })).join('')
        : '<div class="empty compact"><b>Awaiting verified activity</b><p>Accepted actions appear here only after Project Q settles them into the append-only XP ledger.</p></div>'}</section>
    </section>
  </div>`;
}

function profileRewards() {
  const p = state.profile;
  const rewards = p.rewards || {};
  const allocation = p.allocation == null ? 'NOT ALLOCATED' : formatBaseUnits(p.allocation);
  const scheduled = rewards.releaseCount ? formatBaseUnits(rewards.scheduledBaseUnits) : 'NOT SCHEDULED';
  const distributed = rewards.releaseCount ? formatBaseUnits(rewards.distributedBaseUnits) : '0';
  const receiptCount = Number(rewards.receiptCount || 0);

  return `<div class="passport-rewards-view">
    <section class="passport-economic-summary">
      <div><span>ALLOCATION</span><strong>${allocation}</strong><small>FAWKQ</small></div>
      ${statePill(p.allocation == null ? 'PENDING' : 'RECORDED', p.allocation == null ? 'pending' : 'success')}
    </section>

    <section class="passport-economic-grid">
      <article><span>Scheduled</span><b>${scheduled}</b></article>
      <article><span>Distributed</span><b>${distributed}</b></article>
      <article><span>Receipts</span><b>${receiptCount}</b></article>
      <article><span>Wallet</span><b>${p.walletVerified ? 'VERIFIED' : 'REQUIRED'}</b></article>
    </section>

    <section class="passport-economic-note">
      <span>ECONOMIC RECORD</span>
      <h3>No reward should disappear into a backend process.</h3>
      <p>The full Rewards system shows where each eligible reward sits from earned activity through allocation, release and confirmed receipt.</p>
      <button data-screen="rewards">OPEN REWARD PIPELINE →</button>
    </section>
  </div>`;
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

    <section class="wallet-requirement-strip">
      <div class="${walletReady ? 'complete' : ''}"><span>01</span><b>Wallet</b><small>${walletReady ? 'Verified' : 'Required'}</small></div>
      <div class="${tokenReady ? 'complete' : ''}"><span>02</span><b>Token Account</b><small>${tokenReady ? 'Ready' : 'Pending'}</small></div>
      <div class="${holderReady ? 'complete' : ''}"><span>03</span><b>FAWKQ Holding</b><small>${holderReady ? 'Eligible' : 'Incomplete'}</small></div>
    </section>

    <section class="identity-system-note wallet-system-note">
      <div class="identity-system oracle-system"><img src="${ORACLE_LOGO}" alt="Oracle" /><span><b>Oracle Ownership</b><small>Oracle verifies the canonical reward-wallet connection.</small></span></div>
      <div class="identity-system q-system"><img src="/campaign-app/assets/project-q-app-icon.webp" alt="Project Q" /><span><b>Project Q Destination</b><small>Q uses the verified wallet for eligibility, allocations and releases.</small></span></div>
    </section>

    <section class="wallet-protection-note">
      <div><span>DESTINATION PROTECTION</span><b>${allocationLocked ? 'Locked after allocation' : 'Changeable before allocation'}</b><small>${allocationLocked ? 'Any wallet recovery requires controlled review because a reward allocation already exists.' : 'A newly verified wallet becomes the campaign destination before allocations are finalized.'}</small></div>
      ${statePill(allocationLocked ? 'PROTECTED' : 'PRE-ALLOCATION', allocationLocked ? 'success' : 'pending')}
    </section>

    <section class="wallet-noncustodial-note">
      <img src="/campaign-app/assets/project-q-app-icon.webp" alt="Project Q" />
      <div><b>Non-custodial by design.</b><small>Project Q cannot sign from your wallet, cannot withdraw funds, and never stores a seed phrase or private key.</small></div>
    </section>
  </div>`;
}

function profileReferrals() {
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

function profileIdentity() {
  const p = state.profile;
  const count = verifiedCount();
  const fullyVerified = count === 3;

  const steps = [
    {
      label: 'Telegram',
      complete: p.telegramVerified,
      locked: false,
      detail: p.telegramVerified ? 'Telegram Mini App session verified.' : 'Open Project Q from the official Telegram bot.',
      action: p.telegramVerified ? null : 'Open Telegram',
      actionId: null,
      provider: 'q',
    },
    {
      label: 'X Identity',
      complete: p.xVerified,
      locked: !p.telegramVerified,
      detail: p.xVerified ? `Oracle verified · ${formatProfileDate(p.xVerifiedAt)}` : 'Connect the X account used for eligible social activity.',
      action: p.xVerified ? 'Open Oracle' : 'Connect X',
      actionId: 'oracle-link',
      provider: 'oracle',
    },
    {
      label: 'Reward Wallet',
      complete: p.walletVerified,
      locked: !p.telegramVerified,
      detail: p.walletVerified ? `Oracle verified · ${formatProfileDate(p.walletVerifiedAt)}${state.wallet ? ` · ${short(state.wallet)}` : ''}` : 'Verify the one wallet used for eligibility and distributions.',
      action: p.walletVerified ? 'Open Oracle' : 'Connect Wallet',
      actionId: 'profile-wallet',
      provider: 'oracle',
    },
  ];

  const nextIndex = steps.findIndex((step) => !step.complete);
  const nextLabel = nextIndex >= 0 ? steps[nextIndex].label : 'Complete';

  return `<div class="identity-passport-view">
    <section class="identity-status-card">
      <div>
        <span>PROJECT Q IDENTITY</span>
        <h3>${fullyVerified ? 'Identity Complete' : `Next: ${escapeHtml(nextLabel)}`}</h3>
        <p>${fullyVerified
          ? 'Your Telegram, X identity and reward wallet are connected to one Project Q participant record.'
          : 'Complete each connection once. Project Q then uses the verified identity for missions, eligibility and rewards.'}</p>
      </div>
      <div class="identity-status-score"><strong>${count}/3</strong><span>VERIFIED</span></div>
    </section>

    <section class="identity-step-list">
      ${steps.map((step, index) => `<article class="identity-passport-step ${step.complete ? 'complete' : index === nextIndex ? 'current' : step.locked ? 'locked' : ''}">
        <div class="identity-step-number">${step.complete ? '✓' : String(index + 1).padStart(2,'0')}</div>
        <div class="identity-step-provider ${step.provider === 'oracle' ? 'oracle-provider' : ''}">
          ${step.provider === 'oracle'
            ? `<img src="${ORACLE_LOGO}" alt="Oracle" />`
            : '<img src="/campaign-app/assets/project-q-app-icon.webp" alt="Project Q" />'}
        </div>
        <div class="identity-step-copy">
          <div><b>${escapeHtml(step.label)}</b>${statePill(step.complete ? 'VERIFIED' : step.locked ? 'LOCKED' : 'NEXT', step.complete ? 'success' : 'pending')}</div>
          <p>${escapeHtml(step.detail)}</p>
        </div>
        ${step.actionId ? `<button class="outline-action" id="${step.actionId}" ${step.locked ? 'disabled' : ''}>${escapeHtml(step.action)}</button>` : ''}
      </article>`).join('')}
    </section>

    <section class="identity-system-note">
      <div class="identity-system q-system"><img src="/campaign-app/assets/project-q-app-icon.webp" alt="" /><span><b>Project Q</b><small>Records identity state and campaign eligibility.</small></span></div>
      <div class="identity-system oracle-system"><img src="${ORACLE_LOGO}" alt="Oracle" /><span><b>Oracle</b><small>Verifies canonical X and reward-wallet connections.</small></span></div>
    </section>

    ${p.telegramVerified ? '<button class="identity-refresh outline-action" id="identity-refresh">Refresh Verification Status</button>' : ''}
  </div>`;
}

function profileScreen() {
  const p = state.profile;
  const c = state.campaign || fallbackCampaign;
  const count = verifiedCount();
  const fullyVerified = count === 3;
  const op = operationNumber();
  const eligibility = p.rewardEligible ? 'Reward Ready' : p.campaignReady ? 'Holder Check' : 'Pending';
  const views = { overview: profileOverview, wallet: profileWallet, activity: profileActivity, rewards: profileRewards, referrals: profileReferrals, identity: profileIdentity };
  const content = (views[state.profileView] || profileOverview)();

  return `<div class="passport-ui">
    <section class="participant-passport">
      <div class="passport-copy">
        <span class="passport-kicker">CRAB ARMY PARTICIPANT</span>
        <h2>${escapeHtml(p.name)}</h2>
        <div class="passport-id-line"><span>ID</span><b>${count}/3</b>${statePill(fullyVerified ? 'VERIFIED' : 'PENDING', fullyVerified ? 'success' : 'pending')}</div>
        <p>Persistent Project Q identity and verified participation history.</p>
      </div>
      <div class="passport-photo">
        <img src="/campaign-app/assets/system/q-id.webp" alt="Project Q participant identity" />
        <span class="${fullyVerified ? 'verified' : ''}">${fullyVerified ? 'VERIFIED' : 'PENDING'}</span>
      </div>
      <div class="passport-motto">PEOPLE<br />COMMUNITY<br />DEFI<br />OCEAN IMPACT</div>
    </section>

    <section class="passport-stats">
      <article><span>OP Rank</span><strong>${escapeHtml(p.rank && p.rank !== '—' ? p.rank : 'UNRANKED')}</strong></article>
      <article><span>OP XP</span><strong>${Number(p.xp || 0).toLocaleString()}</strong></article>
      <article><span>Missions</span><strong>${Number(p.completedMissions || 0)}</strong></article>
      <article><span>Eligibility</span><strong>${escapeHtml(eligibility)}</strong></article>
    </section>

    <section class="passport-records">
      <div class="dossier-heading"><span>Campaign Records</span><b>1 OPERATION</b></div>
      <button class="passport-operation-record" data-screen="operations">
        <span class="passport-op">OP<br /><b>${op}</b></span>
        <div class="passport-record-copy">
          <small>${escapeHtml(c.shortName || 'Operation')}</small>
          <b>${escapeHtml(c.name || 'Bond the Duck')}</b>
          <span>${escapeHtml(c.schedule?.activeLabel || 'Campaign schedule pending')}</span>
        </div>
        ${c.banner ? `<img src="${c.banner}" alt="" />` : ''}
        <em>${escapeHtml(operationLifecycleState().label)}</em>
      </button>
      <div class="passport-record-metrics">
        <div><span>OP XP</span><b>${Number(p.xp || 0).toLocaleString()}</b></div>
        <div><span>Campaign Rank</span><b>${escapeHtml(p.rank && p.rank !== '—' ? p.rank : 'UNRANKED')}</b></div>
        <div><span>Missions</span><b>${Number(p.completedMissions || 0)}</b></div>
        <div><span>Rewards</span><b>${p.allocation == null ? 'NOT ALLOCATED' : formatBaseUnits(p.allocation)}</b></div>
      </div>
    </section>

    ${profileTabs()}
    ${content}
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
  const screenTitle = state.screen === 'home' ? 'Operations Terminal' : (navTitle || (state.screen === 'burns' ? 'Earn to Burn' : state.screen === 'readiness' ? 'Launch Readiness' : c.name));
  document.querySelector('#desktop-nav').innerHTML = navMarkup();
  document.querySelector('#mobile-nav').innerHTML = navMarkup();
  const screen = document.querySelector('#screen');
  const markup = screens[state.screen]();
  screen.classList.add('screen-rendering');
  screen.innerHTML = `${systemStatusMarkup()}${markup}`;
  requestAnimationFrame(() => screen.classList.remove('screen-rendering'));
  document.querySelector('#screen-title').textContent = screenTitle;
  document.querySelector('#campaign-sequence').textContent = state.screen === 'home' ? 'PROJECT Q / OPERATIONS TERMINAL' : state.screen === 'operations' ? `PROJECT Q / OP ${operationNumber()}` : state.screen === 'record' ? 'PROJECT Q / PARTICIPANT RECORD' : `PROJECT Q / ${c.sequence}`;
  document.querySelector('#account-name').textContent = state.profile.telegramVerified ? state.profile.name : `${verifiedCount()}/3 ID`;
  document.querySelector('#account-control').classList.toggle('verified', verifiedCount() === 3);
  const railState = document.querySelector('#rail-campaign-state');
  if (railState) railState.textContent = state.runtime?.displayLabel || 'SYNCING';
  const network = document.querySelector('#campaign-network-state');
  if (network) {
    network.innerHTML = `<i></i> ${escapeHtml(state.runtime?.displayLabel || 'SYNCING')}`;
    network.classList.toggle('live', Boolean(state.runtime?.operational));
  }
  document.title = `Project Q — ${c.name}`;
  bind();
}

function syncTelegramViewport() {
  const tg = state.telegram;
  const height = Number(tg?.viewportStableHeight || tg?.viewportHeight || window.innerHeight);
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
  history.replaceState(null, '', `#${state.screen}`);
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  state.telegram?.HapticFeedback?.impactOccurred('light');
}

function go(screen, { replace = false } = {}) {
  screen = resolveScreenRoute(screen);
  if (!screens[screen]) return;
  if (!replace && state.screen !== screen) state.navigationStack.push(state.screen);
  state.screen = screen;
  history.replaceState(null, '', `#${screen}`);
  render();
  updateTelegramBackButton();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  state.telegram?.HapticFeedback?.impactOccurred('light');
}

function openOracle() {
  if (typeof window.Telegram?.WebApp?.openTelegramLink === 'function') {
    window.Telegram.WebApp.openTelegramLink('https://t.me/crabstar_oracle_bot');
    return;
  }
  window.open('https://t.me/crabstar_oracle_bot', '_blank', 'noopener,noreferrer');
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
  if (source.status === 'PENDING_CERTIFICATION') return 'Source certification pending · no XP';
  return 'Source unavailable · no XP';
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
  dialog.querySelector('[data-mission-action]')?.addEventListener('click', () => executeMissionAction(missionId));
  dialog.querySelectorAll('[data-vote-source-key]').forEach((button) => {
    button.addEventListener('click', () => startWebsiteVote(button.dataset.voteSourceKey));
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
  const rejected = Number(telemetry?.rejected || 0);
  const target = Number(telemetry?.target || 0);

  let counted = 'No verified activity yet';
  if (verified > 0) counted = `${verified} verified`;
  else if (pending > 0) counted = `${pending} verifying`;
  else if (rejected > 0) counted = `${rejected} rejected`;

  const lockReason = stateInfo.label === 'LOCKED' ? missionLockReason(mission) : null;

  let remains = 'Complete an eligible action';
  if (stateInfo.label === 'LOCKED') remains = lockReason?.remains || 'Mission requirements';
  else if (target > 0) remains = `${Math.max(0, target - verified)} of ${target} remaining`;
  else if (stateInfo.label === 'VERIFIED') remains = 'Verified activity recorded';

  let nextWindow = mission.frequency || 'Campaign';
  if (mission.id === 'website-voting') {
    const cooldowns = (state.websiteVotes?.sources || [])
      .filter(({ status, nextAvailableAt }) => status === 'ON_COOLDOWN' && nextAvailableAt)
      .map(({ nextAvailableAt }) => new Date(nextAvailableAt).getTime())
      .filter(Number.isFinite);
    if (cooldowns.length) nextWindow = `Next source ${formatProfileDate(new Date(Math.min(...cooldowns)).toISOString())}`;
    else nextWindow = 'Per verified source cooldown';
  } else if (mission.id === 'trending-bots') {
    nextWindow = 'Whenever a certified bot cooldown resets';
  }

  const instruction = stateInfo.label === 'LOCKED'
    ? (lockReason?.action || 'Review mission requirements')
    : stateInfo.label === 'VERIFYING' || stateInfo.label === 'SUBMITTED'
      ? 'Wait for verification'
      : stateInfo.label === 'VERIFIED'
        ? 'Review your verified record'
        : stateInfo.label === 'COOLDOWN'
          ? 'Wait for the next eligible window'
          : mission.actionLabel || (mission.readOnlyAction ? 'Review your verified record' : 'Complete the mission through its official flow');

  return `<section class="mission-status-summary">
    <div><span>WHAT DO I DO?</span><b>${escapeHtml(instruction)}</b></div>
    <div><span>WHAT DOES IT EARN?</span><b>${escapeHtml(mission.reward)}</b></div>
    <div><span>DID IT COUNT?</span><b>${escapeHtml(counted)}</b></div>
    <div><span>WHEN AGAIN?</span><b>${escapeHtml(nextWindow)}</b></div>
    <div><span>WHAT REMAINS?</span><b>${escapeHtml(remains)}</b></div>
  </section>`;
}

function missionDetailMarkup(mission) {
  const telemetry = missionTelemetry(mission);
  const actionEnabled = Boolean((mission.enabled && campaignClearanceReady()) || mission.readOnlyAction);
  const footerActionEnabled = actionEnabled && mission.id !== 'website-voting';
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
    ? `<div class="mission-source-list">${configuredSources.map(({ sourceKey, name, url, cooldownSeconds, cooldownCertification, verificationMode, individualXpEligible }) => {
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
  const providerLogo = oracleMission ? ORACLE_LOGO : '/campaign-app/assets/project-q-app-icon.webp';
  const status = canonicalMissionState(mission, telemetry).label;

  return `<form method="dialog" class="mission-sheet mission-file-sheet">
    <button class="mission-sheet-close" value="close" aria-label="Close mission file">×</button>

    <header class="mission-file-header">
      <div class="mission-file-heading">
        <span>MISSION FILE</span>
        <small>${escapeHtml(state.campaign?.name || 'Operation')} › ${escapeHtml(mission.title)}</small>
      </div>
      <div class="mission-file-title-row">
        <div class="mission-file-provider ${oracleMission ? 'oracle-provider' : ''}">
          <img src="${providerLogo}" alt="${escapeHtml(providerName)}" />
        </div>
        <div>
          <h2>${escapeHtml(mission.title)}</h2>
          <p>${escapeHtml(mission.description)}</p>
        </div>
      </div>
    </header>

    <section class="mission-file-facts">
      <div><span>Reward</span><b>${escapeHtml(mission.reward)}</b></div>
      <div><span>Status</span><b>${escapeHtml(status)}</b></div>
      <div><span>Progress</span><b>${escapeHtml(telemetry?.detail || mission.status)}</b></div>
    </section>

    ${missionStatusSummaryMarkup(mission, telemetry)}

    ${clearanceMarkup({ compact: true })}

    ${mission.id !== 'website-voting' ? `<button type="button" class="mission-start-action" data-mission-action="${escapeHtml(mission.id)}" ${footerActionEnabled ? '' : 'disabled'}>${escapeHtml(footerActionEnabled ? (mission.actionLabel || 'Start Mission') : (missionLockReason(mission)?.title || 'Mission Locked'))} <span>→</span></button>` : ''}

    ${mission.id === 'website-voting' ? `<section class="mission-file-sources"><div class="mission-file-section-title">Choose a verified source</div>${sourceList}${websiteVoteFlowMarkup()}</section>` : sourceList ? `<details class="mission-file-disclosure"><summary>Registered Sources <span>⌄</span></summary><div class="mission-file-disclosure-body">${sourceList}</div></details>` : ''}

    <details class="mission-file-disclosure" open>
      <summary>Mission Details <span>⌄</span></summary>
      <div class="mission-file-disclosure-body">
        <p>${escapeHtml(mission.verification || 'Verification rules will be published before this mission opens.')}</p>
      </div>
    </details>

    <details class="mission-file-disclosure">
      <summary>Accepted Activity <span>⌄</span></summary>
      <div class="mission-file-disclosure-body">${evidence}</div>
    </details>

    <details class="mission-file-disclosure">
      <summary>Rules & Guidelines <span>⌄</span></summary>
      <div class="mission-file-disclosure-body"><ol>${requirements.map((requirement) => `<li>${escapeHtml(requirement)}</li>`).join('')}</ol></div>
    </details>

    <details class="mission-file-disclosure">
      <summary>Proof & Verification <span>⌄</span></summary>
      <div class="mission-file-disclosure-body">
        <p>Only verified Project Q records count toward XP, rank or campaign rewards. Finalized Project Q settlement remains the source of truth; opening a destination alone never guarantees credit.</p>
      </div>
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
  if (missionId === 'buy-to-earn') { state.profileView = 'rewards'; return go('profile'); }
  if (missionId === 'verified-referrals') { state.profileView = 'referrals'; return go('profile'); }
  if (missionId === 'earn-to-burn') return go('burns');
  if (['community-pulse', 'participation-xp'].includes(missionId)) { state.recordView = 'xp'; return go('record'); }
  const mission = state.campaign?.missions?.find(({ id }) => id === missionId);
  toast(`${mission?.title || 'Mission'} source launcher is not available.`);
}

function openMission(missionId) {
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
    <div class="tour-welcome-mark"><img src="/campaign-app/assets/project-q-app-icon.webp" alt="" /></div>
    <span class="label">${replay ? 'Project Q Guide' : 'Welcome to Project Q'}</span>
    <h2>${replay ? 'Replay the Operations Tour' : 'Enter the Operation'}</h2>
    <p>${replay
      ? 'Run through Terminal, Operations, Record, Rewards and your Participant Passport again.'
      : 'Project Q is your verified participation layer. Learn where to operate, how missions work and where your permanent record is built.'}</p>
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
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setTimeout(() => positionTourCard(target), 220);
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

function bind() {
  document.querySelectorAll('[data-screen]').forEach((element) => {
    element.onclick = () => {
      if (element.dataset.profileView) state.profileView = element.dataset.profileView;
      go(element.dataset.screen);
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
  document.querySelectorAll('[data-leaderboard-view]').forEach((element) => {
    element.onclick = () => { state.leaderboardView = element.dataset.leaderboardView; render(); };
  });
  document.querySelectorAll('[data-profile-view]').forEach((element) => {
    element.onclick = () => { state.profileView = element.dataset.profileView; render(); };
  });
  document.querySelectorAll('[data-operation-view]').forEach((element) => {
    element.onclick = () => { state.operationsView = element.dataset.operationView; go('operations'); };
  });
  document.querySelectorAll('[data-record-view]').forEach((element) => {
    element.onclick = () => { state.recordView = element.dataset.recordView; go('record'); };
  });
  document.querySelector('#rail-toggle')?.addEventListener('click', toggleRail);
  applyRailPreference();
  const account = document.querySelector('#account-control');
  if (account) account.onclick = () => go('profile');
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
    const registry = await fetch('/campaign-app/campaigns/index.json').then((response) => response.json());
    const requested = new URLSearchParams(location.search).get('campaign') || registry.defaultCampaign;
    const record = registry.campaigns.find((campaign) => campaign.id === requested && campaign.visible);
    if (!record) { state.campaign = fallbackCampaign; return; }
    state.campaignRecord = record;
    state.campaign = await fetch(`/campaign-app/campaigns/${record.file}`).then((response) => response.json());
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
    if (payload.status.primaryTokenAccount) {
      state.profile.tokenAccountReady = true;
      state.profile.tokenAccount = payload.status.primaryTokenAccount;
    }
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
    if (!response.ok) { state.sessionStatus = 'error'; return false; }
    const session = await response.json();
    state.profile.name = session.user.firstName || session.user.username || 'Duck Recruit';
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
  const splashStarted = performance.now();
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
  await Promise.all([loadCampaign(), loadCampaignRuntime(), loadCampaignReadiness(), loadBurnSummary(), authenticateTelegram()]);
  await loadWalletStatus();
  restoreWebsiteVoteFlow();
  render();
  updateTelegramBackButton();
  setInterval(updateCountdownLabels, 1000);
  setInterval(async () => { await Promise.all([loadCampaignRuntime(), loadCampaignReadiness()]); render(); }, 60000);
  const remaining = Math.max(0, 650 - (performance.now() - splashStarted));
  setTimeout(() => { document.body.classList.remove('loading'); maybeStartAppTour(); }, remaining);
}

boot();
