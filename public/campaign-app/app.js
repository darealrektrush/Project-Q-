const ORACLE_LOGO = '/campaign-app/assets/oracle-logo.jpg';

const NAV = [
  ['home', 'Home'],
  ['missions', 'Missions'],
  ['xp', 'XP'],
  ['leaderboard', 'Rank'],
  ['rewards', 'Rewards'],
];

const NAV_ICONS = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5z"/><path d="M9 21v-7h6v7"/></svg>',
  missions: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 12l2.2 2.2 4.8-5"/></svg>',
  xp: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.25"/><path d="m15.1 15.1 2.1 2.1"/></svg>',
  leaderboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V11h4v9M10 20V7h4v13M16 20V3h4v17M3 20.5h18"/></svg>',
  rewards: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v11H4zM3 6.5h18V10H3zM12 6.5V21"/><path d="M12 6.5H8.7A2.7 2.7 0 1 1 12 3.2zm0 0h3.3A2.7 2.7 0 1 0 12 3.2z"/></svg>',
};

const WEBSITE_VOTE_FLOW_SESSION_KEY = 'project-q:website-vote-flow';

const READINESS_GROUPS = [
  {
    id: 'foundation', label: 'Campaign foundation', number: '01',
    description: 'Rules, funding, registry evidence, certified sources and the locked seven-cycle schedule.',
    keys: ['rules', 'funding', 'registry', 'sources', 'dates'],
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
  activeMissionId: null,
  leaderboardView: 'overall',
  leaderboards: { overall: [], '48h': [], missions: [], trending: [], community: [], burn: [] },
  leaderboardMeta: null,
  profile: {
    name: window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Duck Recruit',
    telegramVerified: false,
    xVerified: false,
    walletVerified: false,
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
  walletVerificationEnabled: false,
  websiteVoteReviewEnabled: false,
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
function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function verifiedCount() {
  const p = state.profile;
  return [p.telegramVerified, p.xVerified, p.walletVerified].filter(Boolean).length;
}

function navMarkup() {
  return NAV.map(([id, label]) => `<button class="nav-button ${state.screen === id ? 'active' : ''}" data-screen="${id}" aria-label="${label}" title="${label}"><span class="nav-icon">${NAV_ICONS[id]}</span><span class="nav-label">${label}</span></button>`).join('');
}

function statePill(label, tone = 'pending') {
  return `<span class="state-pill ${tone}"><i></i>${escapeHtml(label)}</span>`;
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
  const completedCycles = schedule.phase === 'ACTIVE' ? Math.max(0, cycle - 1)
    : ['HANDOFF', 'REVIEW', 'REVIEW_EXTENSION', 'POST_REVIEW'].includes(schedule.phase) ? 7 : 0;
  const countdown = schedule.targetAt ? formatCountdown(schedule.targetAt) : 'Review complete';
  const detail = schedule.phase === 'ACTIVE' && !runtime.operational
    ? 'Calendar window reached · operations remain closed until every activation gate passes'
    : schedule.phase === 'ACTIVE'
      ? `Verified activity cycle ${cycle} of 7`
      : schedule.phase === 'PRE_LAUNCH'
        ? `${campaign.schedule?.activeLabel || 'September 1–15, 2026'} · 8:00 AM PT`
        : schedule.phase === 'HANDOFF'
          ? 'Campaign close reconciliation before final review'
          : ['REVIEW', 'REVIEW_EXTENSION'].includes(schedule.phase)
            ? `${campaign.schedule?.reviewLabel || 'September 16–19, 2026'} · verification in progress`
            : 'Post-review release records become the source of truth';
  const dots = Array.from({ length: 7 }, (_, index) => {
    const number = index + 1;
    const status = number <= completedCycles ? 'complete' : number === cycle ? 'current' : '';
    return `<i class="${status}" title="Cycle ${number}">${number}</i>`;
  }).join('');
  return `<section class="campaign-clock ${escapeHtml(runtime.tone || 'pending')}"><div class="clock-copy"><span>${escapeHtml(schedule.label)}</span><strong data-countdown data-target-at="${escapeHtml(schedule.targetAt || '')}">${escapeHtml(countdown)}</strong><small>${escapeHtml(detail)}</small></div><div class="cycle-rail" aria-label="Seven campaign cycles">${dots}</div></section>`;
}

function updateCountdownLabels() {
  document.querySelectorAll('[data-countdown]').forEach((element) => {
    element.textContent = formatCountdown(element.dataset.targetAt);
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
  if (!p.walletVerified) return 'Connect reward wallet';
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
    return `<article class="next-status"><img src="/campaign-app/assets/system/q-wallet.webp" alt="" /><div><span>Next status</span><b>Verify reward wallet</b><small>Sign a message only. No transaction is authorized.</small></div><button class="outline-action" data-screen="profile">Connect</button></article>`;
  }
  return `<article class="next-status"><img src="/campaign-app/assets/system/q-campaigns.webp" alt="" /><div><span>Identity ready</span><b>Choose your next mission</b><small>Every accepted action settles into one Project Q record.</small></div><button class="outline-action" data-screen="missions">Open</button></article>`;
}

function home() {
  const p = state.profile;
  const c = state.campaign || fallbackCampaign;
  const count = verifiedCount();
  const identityReady = count === 3;
  const nextScreen = identityReady ? 'missions' : 'profile';
  const allocation = p.allocation == null ? '—' : formatBaseUnits(p.allocation);
  const readiness = state.readiness?.available
    ? Math.max(0, Math.min(100, Number(state.readiness.percent || 0)))
    : null;
  const readinessLabel = readiness == null ? '—' : `${readiness}%`;
  const heroStyle = c.banner ? ` style="--campaign-art:url('${c.banner}')"` : '';
  return `<section class="command-hero"${heroStyle}>
    <div class="hero-copy">
      <div class="campaign-line"><span>${escapeHtml(c.sequence)}</span>${runtimePill()}</div>
      <h2 class="sr-only">Bond the Duck</h2>
      <p class="sr-only">${Number(c.activeDays || 14)}-day verified campaign</p>
    </div>
    <div class="readiness-block"><div><span>Campaign readiness</span><b>${readinessLabel}</b></div><div class="progress hero-progress" role="progressbar" aria-label="Campaign readiness" aria-valuemin="0" aria-valuemax="100" ${readiness == null ? '' : `aria-valuenow="${readiness}"`}><span style="width:${readiness ?? 0}%"></span></div></div>
  </section>
  ${campaignClockMarkup(c)}
  <section class="campaign-schedule" aria-label="Campaign schedule"><div><span>Active campaign</span><b>${escapeHtml(c.schedule?.activeLabel || 'September 1–15, 2026')}</b><small>7 verified 48-hour cycles</small></div><i></i><div><span>Final review</span><b>${escapeHtml(c.schedule?.reviewLabel || 'September 16–19, 2026')}</b><small>48-hour checkpoint · 72-hour maximum</small></div></section>
  ${readinessDetailsMarkup()}
  <button class="gold-action" data-screen="${nextScreen}"><span><b>${nextIdentityAction()}</b><small>${identityReady ? 'Verified campaign operations' : 'Unlock missions and rewards'}</small></span><i>→</i></button>
  <section class="status-panel"><div class="panel-label">Your status</div><div class="status-grid">${metric('ID', `${count}/3`)}${metric('XP', Number(p.xp || 0).toLocaleString())}${metric('Rank', escapeHtml(p.rank))}${metric('Rewards', allocation)}</div></section>
  ${nextStatusCard()}
  <div class="section-head compact-head"><div><span class="label">Campaign operations</span><h2>Your next actions</h2></div><button class="text-action" data-screen="missions">View all ${c.missions.length}</button></div>
  <div class="quick-actions">${c.missions.filter(({ kind }) => kind !== 'COLLECTIVE').slice(0, 3).map(missionCard).join('')}</div>
  <button class="burn-utility" data-screen="burns"><img src="/campaign-app/assets/missions/v3-earn-to-burn.webp" alt="" /><span><small>Collective mission</small><b>Earn to Burn</b><em>Public milestones and on-chain receipts</em></span><i>→</i></button>
  <section class="ecosystem-strip" aria-label="Project Q ecosystem"><div><img src="/campaign-app/assets/project-q-app-icon.webp" alt="" /><span><b>Project Q</b><small>Proves · operates · distributes</small></span></div><div class="oracle-brand"><img src="${ORACLE_LOGO}" alt="Oracle" /><span><b>Oracle</b><small>Guides · verifies · executes</small></span></div></section>
  ${c.banner ? `<details class="campaign-details"><summary>Full campaign details <span>View artwork</span></summary><figure><img src="${c.banner}" alt="${escapeHtml(c.bannerAlt || `${c.name} campaign banner`)}" /></figure></details>` : ''}`;
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

function missionCard(mission) {
  const oracle = mission.id === 'oracle-raids';
  const collective = mission.kind === 'COLLECTIVE';
  const image = mission.image;
  const visual = image
    ? `<img class="mission-art ${oracle ? 'oracle-art' : ''}" src="${image}" alt="" />`
    : `<div class="mission-icon">${escapeHtml(mission.icon || 'Q')}</div>`;
  const telemetry = missionTelemetry(mission);
  const hasAcceptedEvidence = Number(telemetry?.verified || 0) > 0;
  const hasPendingEvidence = Number(telemetry?.pending || 0) > 0;
  const status = hasAcceptedEvidence ? 'Verified' : hasPendingEvidence ? 'Pending' : collective ? 'Collective' : (mission.enabled ? 'Available' : mission.status);
  const tone = hasAcceptedEvidence ? 'success' : 'pending';
  const action = mission.enabled ? (mission.id === 'buy-to-earn' ? 'View' : 'Open') : 'Details';
  const evidenceLine = telemetry && ('verified' in telemetry)
    ? `<span class="mission-evidence"><i>${Number(telemetry.verified || 0)} verified</i>${mission.id === 'trending-bots' ? `<i>${Number(telemetry.pushPoints || 0)} pushes</i>` : ''}<i>${Number(telemetry.pending || 0)} pending</i><i class="rejected">${Number(telemetry.rejected || 0)} rejected</i></span>`
    : '';
  return `<button class="mission-card ${oracle ? 'oracle-mission' : ''} ${collective ? 'collective' : ''}" data-mission-id="${escapeHtml(mission.id)}">${visual}<span class="mission-copy"><span class="mission-title"><b>${escapeHtml(mission.title)}</b>${statePill(status, tone)}</span><small>${escapeHtml(mission.description)}</small><span class="mission-meta"><em>${escapeHtml(mission.reward)}</em><span>${escapeHtml(telemetry?.detail || mission.status)}</span></span>${evidenceLine}</span><span class="mission-action">${action}</span></button>`;
}

function missionsScreen() {
  const c = state.campaign || fallbackCampaign;
  const individual = c.missions.filter(({ kind }) => kind !== 'COLLECTIVE');
  const collective = c.missions.filter(({ kind }) => kind === 'COLLECTIVE');
  return `<section class="screen-intro operations-intro"><div><span class="label">Campaign operations</span><h2>Missions</h2><p>Eight individual lanes settle verified participation into one Project Q record.</p></div>${runtimePill()}</section>
  <section class="mission-summary"><div><span>Today</span><strong>${individual.filter(({ enabled }) => enabled).length}</strong><small>actions available</small></div><div><span>Identity</span><strong>${verifiedCount()}/3</strong><small>verified</small></div><div><span>Daily XP</span><strong>${Number(state.profile.todayXp || 0)}</strong><small>of ${Number(c.xpCaps?.overallDaily || 0)}</small></div></section>
  <div class="lane-heading"><span>Mission lanes</span><b>${individual.length} individual</b></div>
  <div class="mission-list">${individual.map(missionCard).join('')}</div>
  <div class="lane-heading collective-heading"><span>Collective mission</span><b>Separate burn reserve</b></div>
  <div class="mission-list">${collective.map(missionCard).join('')}</div>
  <section class="oracle-note"><img src="${ORACLE_LOGO}" alt="Oracle" /><div><b>Oracle verification</b><p>Oracle verifies eligible X activity and sends accepted evidence to Project Q. Project Q controls XP accounting, caps and campaign records.</p></div></section>`;
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
  return `<article class="ledger-row"><span class="ledger-icon ${oracle ? 'oracle' : ''}">${oracle ? `<img src="${ORACLE_LOGO}" alt="" />` : escapeHtml(item.icon || 'Q')}</span><div><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.timestamp)}</small></div><strong>+${Number(item.xp || 0)} XP</strong>${statePill('Verified', 'success')}</article>`;
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
  const otherCap = Math.max(0, caps.overallDaily - caps.participationDaily
    - caps.projectQDaily - caps.trendingBotsDaily);
  const today = state.profile.todayXpByBucket || {};
  const activity = state.profile.activity || [];
  return `<section class="xp-command command-card"><span class="label">Verified XP</span><strong>${Number(state.profile.xp || 0).toLocaleString()} <em>XP</em></strong><small>Today ${Number(state.profile.todayXp || 0) > 0 ? '+' : ''}${Number(state.profile.todayXp || 0)}</small><div class="xp-orbit"><img src="/campaign-app/assets/project-q-app-icon.webp" alt="Project Q" /></div></section>
  <section class="command-card progress-panel"><div class="panel-title"><span>Daily progress</span><small>Overall cap ${Number(caps.overallDaily || 0)} XP</small></div>${progressRow('Participation', today.participation, caps.participationDaily)}${progressRow('Trending bots', today.trending, caps.trendingBotsDaily)}${progressRow('Project Q missions', today.mission, caps.projectQDaily)}${progressRow('Other verified activity', today.other, otherCap)}</section>
  ${communityPulsePanel()}
  <div class="section-head compact-head"><div><span class="label">XP ledger</span><h2>Auditable participation</h2></div><span>Source · status · time</span></div>
  <section class="ledger">${activity.length ? activity.map(activityRow).join('') : '<div class="empty compact"><b>No verified activity yet</b><p>Each action appears here only after its source is verified and XP is settled.</p></div>'}</section>
  <div class="section-head"><div><span class="label">Achievements</span><h2>Campaign progression</h2></div><span>Calculated from verified records</span></div>${badgeGallery(c.xpBadges)}`;
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
  const emptyTitle = view?.available ? 'No qualifying XP yet' : 'Rankings are not live';
  const emptyDetail = view?.reason || 'No placeholder scores or identities are shown. Verified records will appear here.';
  const mode = state.leaderboardMeta?.available ? 'VERIFIED RECORDS' : 'READINESS MODE';
  return `<section class="rank-command command-card"><div><span class="label">Your rank</span><strong>${escapeHtml(state.profile.rank)}</strong><small>${change ? `${change > 0 ? '↑' : '↓'} ${Math.abs(change)} today` : rankDetail}</small></div><img src="/campaign-app/assets/system/q-signal.webp" alt="" /></section>
  <div class="tabs" role="tablist">${tabs.map(([id, label]) => `<button class="${state.leaderboardView === id ? 'active' : ''}" data-leaderboard-view="${id}" role="tab" aria-selected="${state.leaderboardView === id}">${label}</button>`).join('')}</div>
  <section class="leaderboard-list">${rows.length ? rows.map((row, index) => leaderboardRow(row, index, view?.unit || 'XP')).join('') : `<div class="empty compact"><b>${escapeHtml(emptyTitle)}</b><p>${escapeHtml(emptyDetail)}</p></div>`}</section>
  <div class="leaderboard-clock"><span>Leaderboard updates after finalized verification</span><b>${mode}</b></div>
  <div class="section-head"><div><span class="label">Rank achievements</span><h2>Performance badges</h2></div><span>Finalized standings only</span></div>${badgeGallery(c.leaderboardBadges)}`;
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

function rewardsScreen() {
  const c = state.campaign || fallbackCampaign;
  const plan = c.releases || [];
  const commitments = c.campaignCommitments || {};
  const rewards = state.profile.rewards || {};
  const allocation = rewards.recorded ? formatBaseUnits(rewards.allocatedBaseUnits) : '—';
  const scheduled = rewards.releaseCount ? formatBaseUnits(rewards.scheduledBaseUnits) : '—';
  const distributed = rewards.releaseCount ? formatBaseUnits(rewards.distributedBaseUnits) : '—';
  const outstandingBaseUnits = rewards.recorded
    ? subtractBaseUnits(rewards.allocatedBaseUnits, rewards.distributedBaseUnits || '0')
    : null;
  const outstanding = outstandingBaseUnits == null ? '—' : formatBaseUnits(outstandingBaseUnits);
  const failed = rewards.releaseCount ? BigInt(rewards.failedBaseUnits || 0) : 0n;
  const actualReleases = rewards.releases || [];
  const delivery = rewardDeliveryState(rewards);
  const walletBalance = state.walletStatus.available
    ? formatBaseUnits(state.walletStatus.balanceBaseUnits, state.walletStatus.decimals)
    : '—';
  const commitmentRows = commitments.campaignRewards ? [
    ['Campaign reward pool', `${formatBaseUnits(commitments.campaignRewards.amountBaseUnits)} FAWKQ`, 'Existing missions and campaign rewards'],
    ['Diamond Duck bonus', `${formatBaseUnits(commitments.diamondDuckBonus.amountBaseUnits)} FAWKQ`, 'Separate founder Streamflow supply after unlock'],
    ['Top Duck prize', `${escapeHtml(commitments.topContributorPrize.amountSol)} SOL`, 'Top overall Bond the Duck contributor'],
    ['Earn to Burn reserve', `${formatBaseUnits(commitments.earnToBurn.amountBaseUnits)} FAWKQ`, 'Additional creator-wallet reserve · burn only'],
  ] : [];
  const releaseTrack = actualReleases.length
    ? actualReleases.map(participantReleaseRow).join('')
    : plan.map((release) => `<article><span>${Number(release.percent)}%</span><div><b>${escapeHtml(release.label)}</b><small>${escapeHtml(release.detail)} · planned</small></div><i>○</i></article>`).join('');
  const notice = failed > 0n
    ? `<div><b>One or more releases require recovery review</b><p>${formatBaseUnits(failed.toString())} FAWKQ is recorded in failed release state. No balance is represented as distributed until recovery is recorded.</p></div>`
    : rewards.recorded
      ? '<div><b>Participant reward record loaded</b><p>Campaign rewards are delivered automatically from the founder-controlled Squads treasury. No claim transaction or private key is requested by Project Q.</p></div>'
      : '<div><b>No participant allocation exists yet</b><p>Reward balances remain blank until review and finalized allocation records exist.</p></div>';
  return `<section class="reward-vault command-card"><div><span class="label">Project Q Reward Vault</span><strong>${allocation}</strong><em>FAWKQ allocated</em>${statePill(delivery.label, delivery.tone)}</div><img src="/campaign-app/assets/system/q-vault.webp" alt="Project Q reward vault" /></section>
  <section class="wallet-quickbar"><div><img src="/campaign-app/assets/system/q-wallet.webp" alt="" /><span><small>Verified reward wallet</small><b>${state.wallet && isSolanaAddress(state.wallet) ? escapeHtml(short(state.wallet)) : 'Not connected'}</b></span></div><div><small>Current wallet balance</small><b>${walletBalance} FAWKQ</b></div><button class="text-action" id="open-wallet-profile">Open wallet →</button></section>
  <section class="reward-balances four"><div><span>Allocated</span><b>${allocation}</b></div><div><span>Scheduled</span><b>${scheduled}</b></div><div class="distributed"><span>Distributed</span><b>${distributed}</b></div><div><span>Outstanding</span><b>${outstanding}</b></div></section>
  ${automaticDeliveryRail(rewards)}
  <div class="section-head compact-head"><div><span class="label">${actualReleases.length ? 'Participant payout record' : 'Payout plan'}</span><h2>Verified campaign rewards</h2></div><span>${actualReleases.length ? `${actualReleases.length} recorded releases` : 'No releases recorded'}</span></div>
  <section class="release-track">${releaseTrack}</section>
  <button class="receipt-action" id="reward-profile"><span>Open reward profile</span><i>→</i></button>
  <div class="section-head"><div><span class="label">Campaign commitments</span><h2>Separated by purpose</h2></div><span>No overlapping allocations</span></div>
  <section class="commitment-list">${commitmentRows.map(([label, amount, detail]) => `<article><div><b>${label}</b><small>${detail}</small></div><strong>${amount}</strong></article>`).join('')}</section>
  <div class="notice-surface">${notice}<button class="outline-action" data-screen="profile">Check identity</button></div>`;
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
  const tabs = [['overview', 'Overview'], ['wallet', 'Wallet'], ['rewards', 'Rewards'], ['activity', 'Activity'], ['referrals', 'Referrals'], ['identity', 'Identity']];
  return `<div class="profile-tabs" role="tablist">${tabs.map(([id, label]) => `<button class="${state.profileView === id ? 'active' : ''}" data-profile-view="${id}" role="tab" aria-selected="${state.profileView === id}">${label}</button>`).join('')}</div>`;
}

function profileOverview() {
  const p = state.profile;
  const c = state.campaign || fallbackCampaign;
  const pulse = state.community?.today;
  const cycleRows = p.xpByCycle.length
    ? p.xpByCycle.map(({ cycleId, xp }) => `<div><span>Cycle ${Number(cycleId)}</span><b>${Number(xp).toLocaleString()} XP</b></div>`).join('')
    : '<div class="profile-empty-line"><span>48H cycles</span><b>No settled XP yet</b></div>';
  return `<section class="profile-overview-grid">
    <article class="command-card profile-card branded-card"><div class="panel-title"><span>Campaign status</span>${statePill(p.campaignState === 'ACTIVE' ? 'LIVE' : p.campaignState, p.campaignState === 'ACTIVE' ? 'success' : 'pending')}</div><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.schedule?.activeLabel || 'September 1–15, 2026')} active · ${escapeHtml(c.schedule?.reviewLabel || 'September 16–19, 2026')} review.</p><div class="profile-detail-list"><div><span>Mission progress</span><b>${Number(p.completedMissions || 0)} verified lanes</b></div><div><span>Next action</span><button class="text-action" ${verifiedCount() === 3 ? 'data-screen="missions"' : 'data-profile-view="identity"'}>${escapeHtml(nextIdentityAction())} →</button></div></div><img class="profile-card-art" src="/campaign-app/assets/system/q-campaigns.webp" alt="" /></article>
    <article class="command-card profile-card branded-card oracle-card"><div class="panel-title"><span>Community Pulse</span>${statePill(pulse?.eligible ? 'QUALIFIED' : 'PENDING', pulse?.eligible ? 'success' : 'pending')}</div><h3>${pulse ? `${Number(pulse.xp_awarded || 0)} XP today` : 'No daily score yet'}</h3><p>Daily recognition rewards meaningful participation across time—not raw message volume.</p><div class="profile-detail-list"><div><span>Qualifying days</span><b>${state.community?.history?.filter(({ eligible }) => eligible).length || 0}</b></div><div><span>Today rank</span><b>${pulse?.daily_rank ? `#${Number(pulse.daily_rank)}` : '—'}</b></div></div><img class="profile-card-art oracle-profile-art" src="${ORACLE_LOGO}" alt="Oracle" /></article>
  </section>
  <section class="command-card cycle-panel"><div class="panel-title"><span>48H XP cycles</span><small>Settled ledger totals</small></div><div class="cycle-strip">${cycleRows}</div></section>
  <section class="command-card profile-card next-profile-card"><div><span class="label">Your Project Q record</span><h3>One identity. Every verified contribution.</h3><p>Mission XP, Community Pulse, referrals, Buy-to-Earn and future reward receipts settle into this participant record.</p></div><button class="outline-action" data-profile-view="activity">Open activity</button></section>`;
}

function profileActivity() {
  const p = state.profile;
  const buckets = p.xpByBucket || {};
  const rows = p.activity || [];
  return `<section class="profile-summary profile-subsummary">${metric('Today', `${Number(p.todayXp || 0)} XP`)}${metric('Missions', `${Number(buckets.mission || 0)} XP`)}${metric('Participation', `${Number(buckets.participation || 0)} XP`)}${metric('Other', `${Number(buckets.other || 0)} XP`)}</section>
  <div class="section-head compact-head"><div><span class="label">Activity ledger</span><h2>Verified contributions</h2></div><span>Latest 25 settled records</span></div>
  <section class="profile-ledger">${rows.length ? rows.map((item) => `<article class="profile-ledger-row"><span class="ledger-icon">Q</span><div><b>${escapeHtml(missionName(item.missionCode, item.source))}</b><small>${escapeHtml(item.source || 'verified')} · Cycle ${Number(item.cycleId || 0)} · ${escapeHtml(formatProfileDate(item.awardedAt))}</small></div><strong>+${Number(item.amount || 0)} XP</strong>${statePill('Verified', 'success')}</article>`).join('') : '<div class="empty command-card"><b>No verified activity yet</b><p>Accepted actions appear here only after Project Q settles them into the append-only XP ledger.</p></div>'}</section>`;
}

function profileRewards() {
  const p = state.profile;
  const allocation = p.allocation == null ? '—' : formatBaseUnits(p.allocation);
  const buy = p.buyToEarn;
  const rewards = p.rewards || {};
  const scheduled = rewards.releaseCount ? formatBaseUnits(rewards.scheduledBaseUnits) : '—';
  const distributed = rewards.releaseCount ? formatBaseUnits(rewards.distributedBaseUnits) : '—';
  const outstanding = rewards.recorded
    ? formatBaseUnits(subtractBaseUnits(rewards.allocatedBaseUnits, rewards.distributedBaseUnits || '0'))
    : '—';
  const allocationRows = Object.entries(p.allocationByCategory || {});
  return `<section class="command-card profile-reward-card"><div><span class="label">Recorded allocation</span><strong>${allocation}</strong><small>FAWKQ</small></div>${statePill(p.allocation == null ? 'NOT FINALIZED' : 'RECORDED', p.allocation == null ? 'pending' : 'success')}<img src="/campaign-app/assets/system/q-vault.webp" alt="" /></section>
  <section class="reward-balances four profile-reward-balances"><div><span>Allocated</span><b>${allocation}</b></div><div><span>Scheduled</span><b>${scheduled}</b></div><div class="distributed"><span>Distributed</span><b>${distributed}</b></div><div><span>Outstanding</span><b>${outstanding}</b></div></section>
  <section class="profile-overview-grid">
    <article class="command-card profile-card"><div class="panel-title"><span>Reward wallet</span>${statePill(p.walletVerified ? 'VERIFIED' : 'PENDING', p.walletVerified ? 'success' : 'pending')}</div><h3>${state.wallet ? escapeHtml(short(state.wallet)) : 'No verified wallet'}</h3><p>${p.tokenAccountReady ? 'FAWKQ token-account eligibility is recorded.' : 'Token-account eligibility remains pending.'}</p><button class="text-action" data-profile-view="identity">Manage identity →</button></article>
    <article class="command-card profile-card"><div class="panel-title"><span>Buy-to-Earn</span>${statePill(buy?.eligible ? 'ELIGIBLE' : 'PENDING', buy?.eligible ? 'success' : 'pending')}</div><h3>${buy?.tier ? `Tier ${Number(buy.tier)}` : 'No finalized position'}</h3><p>${buy ? `Snapshot value ${buy.snapshot_usd == null ? 'pending' : `$${Number(buy.snapshot_usd).toFixed(2)}`}. Weight ${Number(buy.weight || 0)}.` : 'Verified purchase and snapshot data will appear here once recorded.'}</p></article>
  </section>
  <section class="command-card allocation-panel"><div class="panel-title"><span>Allocation breakdown</span><small>Finalized records only</small></div>${allocationRows.length ? allocationRows.map(([category, amount]) => `<div><span>${escapeHtml(category.replaceAll('_', ' '))}</span><b>${formatBaseUnits(amount)} FAWKQ</b></div>`).join('') : '<div class="profile-empty-line"><span>Campaign rewards</span><b>No participant allocation exists yet</b></div>'}</section>
  <div class="notice-surface"><div><b>Rewards remain evidence-bound</b><p>Allocated, scheduled and distributed totals appear only when Project Q records exist.</p></div><button class="outline-action" data-screen="rewards">Campaign commitments</button></div>`;
}

function profileWallet() {
  const p = state.profile;
  const status = state.walletStatus || {};
  const wallet = state.wallet && isSolanaAddress(state.wallet) ? state.wallet : null;
  const tokenAccount = p.tokenAccount && isSolanaAddress(p.tokenAccount) ? p.tokenAccount : null;
  const balance = status.available ? formatBaseUnits(status.balanceBaseUnits, status.decimals) : '—';
  const observed = status.observedAt ? formatProfileDate(status.observedAt) : 'Awaiting on-chain sync';
  const allocationLocked = Boolean(p.rewards?.recorded);
  const treasuryReady = readinessGate('funding') && readinessGate('registry');
  return `<section class="wallet-cockpit command-card"><header><div><span class="label">Wallet cockpit</span><h2>${balance}</h2><p>FAWKQ · Solana Mainnet · Token-2022</p></div>${statePill(status.available ? 'ON-CHAIN SYNCED' : wallet ? 'SYNC PENDING' : 'NOT CONNECTED', status.available ? 'success' : 'pending')}</header><div class="wallet-ledger">
    <article><span>Reward wallet</span><code>${wallet ? escapeHtml(wallet) : 'No verified reward wallet'}</code><button class="text-action" id="copy-wallet" ${wallet ? '' : 'disabled'}>Copy</button></article>
    <article><span>FAWKQ token account</span><code>${tokenAccount ? escapeHtml(tokenAccount) : (p.tokenAccountReady ? 'Recorded by Project Q' : 'Created at payout if required')}</code><button class="text-action" id="copy-token-account" ${tokenAccount ? '' : 'disabled'}>Copy</button></article>
    <article><span>Asset contract</span><code>${escapeHtml(status.mint || state.campaign?.earnToBurn?.mint || 'Unavailable')}</code><small>6 decimals · Token-2022</small></article>
  </div><footer><span>Observed ${escapeHtml(observed)} · ${Number(status.tokenAccountCount || 0)} matching token account${Number(status.tokenAccountCount || 0) === 1 ? '' : 's'}</span><button class="outline-action" id="refresh-wallet-balance" ${wallet ? '' : 'disabled'}>Refresh balance</button></footer></section>
  <section class="wallet-security-grid">
    <article class="command-card"><span class="label">Ownership</span><h3>${p.walletVerified ? 'Signature verified' : 'Verification pending'}</h3><p>${p.walletVerified ? `Verified ${escapeHtml(formatProfileDate(p.walletVerifiedAt))}. The signature proved ownership only and did not authorize a transaction.` : 'Connect through Project Q and sign the ownership message to activate this reward destination.'}</p><button class="text-action" data-profile-view="identity">Open identity →</button></article>
    <article class="command-card"><span class="label">Destination protection</span><h3>${allocationLocked ? 'Locked after allocation' : 'Changeable before allocation'}</h3><p>${allocationLocked ? 'Self-service wallet replacement is blocked because an allocation already exists. Any recovery requires founder review.' : 'A newly verified wallet replaces the destination and resets token-account readiness before allocations are recorded.'}</p>${statePill(allocationLocked ? 'PROTECTED' : 'PRE-ALLOCATION', allocationLocked ? 'success' : 'pending')}</article>
    <article class="command-card"><span class="label">Reward delivery</span><h3>Founder-controlled Squads</h3><p>Project Q calculates and records. Founders approve the exact manifest in Squads. The campaign treasury sends FAWKQ directly to this wallet.</p>${statePill(treasuryReady ? 'TREASURY READY' : 'SETUP PENDING', treasuryReady ? 'success' : 'pending')}</article>
  </section>
  <section class="command-card wallet-boundary"><img src="/campaign-app/assets/project-q-app-icon.webp" alt="" /><div><b>Non-custodial by design.</b><p>Project Q cannot withdraw from this wallet, cannot sign for the Squads treasury and never stores a seed phrase or private key.</p></div></section>`;
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
  const participationReady = p.telegramVerified && p.xVerified;
  const fullyVerified = participationReady && p.walletVerified;
  const walletEnabled = Boolean(participationReady && (state.walletVerificationEnabled || state.campaignRecord?.enabled));
  const telegramDetail = p.telegramVerified ? 'Signed Mini App session verified' : (state.sessionStatus === 'outside' ? 'Open from Project Q in Telegram' : 'Telegram verification required');
  const xDetail = p.xVerified ? `Oracle verified · ${formatProfileDate(p.xVerifiedAt)}` : 'Required for verified social activity';
  const walletDetail = p.walletVerified ? `Ownership verified · ${formatProfileDate(p.walletVerifiedAt)}${state.wallet ? ` · ${short(state.wallet)}` : ''}` : (walletEnabled ? 'Sign a no-transaction ownership message' : 'Unlocks after X verification');
  return `<section class="command-card onboarding-panel"><div class="panel-title"><span>Complete Project Q ID</span><small>${count}/3 VERIFIED</small></div>${identityStepper()}<div class="onboarding-steps">
    <article class="onboarding-step ${p.telegramVerified ? 'complete' : 'current'}"><span>${p.telegramVerified ? '✓' : '1'}</span><div><b>Telegram</b><p>${telegramDetail}</p></div><strong>${p.telegramVerified ? 'Verified' : 'Required'}</strong></article>
    <article class="onboarding-step oracle-step ${p.xVerified ? 'complete' : (p.telegramVerified ? 'current' : 'locked')}"><img src="${ORACLE_LOGO}" alt="Oracle" /><div><b>Oracle X</b><p>${xDetail}</p></div><button class="outline-action" id="oracle-link">${p.xVerified ? 'Open Oracle' : 'Connect X'}</button></article>
    <article class="onboarding-step ${p.walletVerified ? 'complete' : (walletEnabled ? 'current' : 'locked')}"><span>${p.walletVerified ? '✓' : '3'}</span><div><b>Reward wallet</b><p>${walletDetail}</p></div><button class="outline-action" id="profile-wallet" ${walletEnabled ? '' : 'disabled'}>${p.walletVerified ? 'Verified' : (walletEnabled ? 'Connect' : 'Locked')}</button></article>
  </div>${p.telegramVerified ? '<button class="text-action centered" id="identity-refresh">Refresh verification status</button>' : ''}${fullyVerified ? `<div class="verified-note"><span>✓</span><div><b>Campaign identity complete</b><p>Enrolled ${escapeHtml(formatProfileDate(p.enrolledAt))}. Reward eligibility still follows published rules and token-account snapshots.</p></div></div>` : ''}</section>
  <section class="command-card privacy-panel"><span class="label">Privacy & security</span><h3>Verification without custody.</h3><p>Project Q uses signed Telegram session data and wallet ownership messages. Connecting a wallet does not authorize a transaction, transfer tokens or expose a private key.</p></section>`;
}

function profileScreen() {
  const p = state.profile;
  const count = verifiedCount();
  const fullyVerified = count === 3;
  const views = { overview: profileOverview, wallet: profileWallet, activity: profileActivity, rewards: profileRewards, referrals: profileReferrals, identity: profileIdentity };
  const content = (views[state.profileView] || profileOverview)();
  return `<section class="profile-command command-card"><div><span class="label">Project Q participant</span><h2>${escapeHtml(p.name)}</h2><p>Identity, eligibility, verified activity and rewards in one Project Q record.</p>${statePill(`${count}/3 ID`, fullyVerified ? 'success' : 'pending')}</div><img src="/campaign-app/assets/system/q-id.webp" alt="Project Q identity" /></section>
  <section class="profile-summary">${metric('Verified XP', Number(p.xp || 0).toLocaleString())}${metric('Overall rank', escapeHtml(p.rank))}${metric('Missions', Number(p.completedMissions || 0))}${metric('Eligibility', p.tokenAccountReady ? 'Ready' : 'Pending')}</section>
  ${profileTabs()}${content}`;
}

const screens = {
  home,
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
  const navTitle = NAV.find(([id]) => id === state.screen)?.[2];
  const screenTitle = state.screen === 'home' ? 'Project Q' : (navTitle || (state.screen === 'profile' ? 'Profile' : state.screen === 'burns' ? 'Earn to Burn' : state.screen === 'readiness' ? 'Launch Readiness' : c.name));
  document.querySelector('#desktop-nav').innerHTML = navMarkup();
  document.querySelector('#mobile-nav').innerHTML = navMarkup();
  document.querySelector('#screen').innerHTML = screens[state.screen]();
  document.querySelector('#screen-title').textContent = screenTitle;
  document.querySelector('#campaign-sequence').textContent = state.screen === 'home' ? 'PROJECT Q' : `PROJECT Q / ${c.sequence}`;
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

function go(screen) {
  if (!screens[screen]) return;
  state.screen = screen;
  history.replaceState(null, '', `#${screen}`);
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  state.telegram?.HapticFeedback?.impactOccurred('light');
}

async function connectWallet() {
  if (!state.walletVerificationEnabled && !state.campaignRecord?.enabled) {
    toast('Wallet verification is currently disabled.');
    return;
  }
  const provider = window.phantom?.solana || window.solflare || window.backpack;
  if (!provider) {
    toast('Open in Phantom, Solflare or Backpack to connect securely.');
    window.open('https://phantom.app/', '_blank');
    return;
  }
  try {
    const result = await provider.connect();
    state.wallet = (result?.publicKey || provider.publicKey)?.toString();
    state.profile.walletVerified = false;
    render();
    const initData = state.telegram?.initData;
    if (!initData) { toast('Open through Project Q in Telegram to verify this wallet.'); return; }
    const challengeResponse = await fetch('/campaign-app/api/wallet/challenge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData }),
    });
    if (!challengeResponse.ok) throw new Error('challenge');
    const challenge = await challengeResponse.json();
    if (typeof provider.signMessage !== 'function') { toast('This wallet does not support message signing here.'); return; }
    const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
    const signature = bytesToBase64(signed.signature || signed);
    const verifyResponse = await fetch('/campaign-app/api/wallet/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, nonce: challenge.nonce, wallet: state.wallet, signature }),
    });
    if (!verifyResponse.ok) throw new Error('verify');
    state.profile.walletVerified = true;
    toast('Wallet ownership verified. No transaction was authorized.');
    await authenticateTelegram();
    await loadWalletStatus();
    render();
  } catch { toast('Wallet connection or ownership verification was cancelled.'); }
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

function missionDetailMarkup(mission) {
  const telemetry = missionTelemetry(mission);
  const actionEnabled = Boolean(mission.enabled || mission.readOnlyAction);
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
    ? `<section class="mission-rule-block"><span class="label">Registered sources</span><div class="mission-source-list">${configuredSources.map(({ sourceKey, name, url, cooldownSeconds, cooldownCertification, verificationMode, certificationStatus, individualXpEligible }) => {
      let safeUrl = null;
      try {
        const candidate = new URL(String(url || ''));
        if (candidate.protocol === 'https:') safeUrl = candidate.href;
      } catch { /* invalid targets remain visibly unavailable */ }
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
              ? `${String(certificationStatus || 'Unavailable').replaceAll('_', ' ').toLowerCase()} · no XP`
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
    }).join('')}</div></section>`
    : '';
  const evidence = telemetry && ('verified' in telemetry)
    ? `<div class="mission-detail-evidence"><div><span>Verified</span><b>${Number(telemetry.verified || 0)}</b></div>${mission.id === 'trending-bots' ? `<div><span>Pushes</span><b>${Number(telemetry.pushPoints || 0)}</b></div>` : ''}<div><span>Pending</span><b>${Number(telemetry.pending || 0)}</b></div><div><span>Rejected</span><b>${Number(telemetry.rejected || 0)}</b></div></div>`
    : `<div class="mission-personal-line"><span>Personal status</span><b>${escapeHtml(telemetry?.detail || 'No verified participant record yet')}</b></div>`;
  return `<form method="dialog" class="mission-sheet"><button class="mission-sheet-close" value="close" aria-label="Close mission details">×</button>
    <header class="mission-sheet-hero"><img src="${escapeHtml(mission.image)}" alt="" /><div><span class="label">${escapeHtml(mission.kind === 'COLLECTIVE' ? 'Collective mission' : 'Mission lane')}</span><h2>${escapeHtml(mission.title)}</h2><p>${escapeHtml(mission.description)}</p></div>${statePill(mission.enabled ? 'AVAILABLE' : mission.status)}</header>
    <section class="mission-facts"><div><span>Reward</span><b>${escapeHtml(mission.reward)}</b></div><div><span>Frequency</span><b>${escapeHtml(mission.frequency || 'Campaign')}</b></div><div><span>Your progress</span><b>${escapeHtml(telemetry?.detail || mission.status)}</b></div></section>
    ${evidence}
    <section class="mission-rule-block"><span class="label">How Project Q verifies it</span><p>${escapeHtml(mission.verification || 'Verification rules will be published before this mission opens.')}</p></section>
    ${sourceList}
    ${mission.id === 'website-voting' ? websiteVoteFlowMarkup() : ''}
    <section class="mission-rule-block"><span class="label">Requirements</span><ol>${requirements.map((requirement) => `<li>${escapeHtml(requirement)}</li>`).join('')}</ol></section>
    <footer class="mission-sheet-actions"><button type="button" class="gold-action compact" data-mission-action="${escapeHtml(mission.id)}" ${footerActionEnabled ? '' : 'disabled'}><span><b>${escapeHtml(mission.id === 'website-voting' && actionEnabled ? 'Choose a verified source above' : footerActionEnabled ? (mission.actionLabel || 'Open mission') : 'Readiness gate closed')}</b><small>${escapeHtml(mission.id === 'website-voting' && actionEnabled ? 'Each source opens through its own protected attempt' : footerActionEnabled ? 'Continue through the official verified flow' : 'No submission can be made yet')}</small></span><i>→</i></button><small>Only verified Project Q records count. Opening a destination does not guarantee XP or rewards.</small></footer>
  </form>`;
}

function closeMission() {
  const dialog = document.querySelector('#mission-dialog');
  state.activeMissionId = null;
  if (dialog?.open) dialog.close();
}

function executeMissionAction(missionId) {
  closeMission();
  if (missionId === 'oracle-raids') return openOracle();
  if (missionId === 'bagwork') return openExternal('https://fawkq.com/bagwork');
  if (missionId === 'buy-to-earn') { state.profileView = 'rewards'; return go('profile'); }
  if (missionId === 'verified-referrals') { state.profileView = 'referrals'; return go('profile'); }
  if (missionId === 'earn-to-burn') return go('burns');
  if (['community-pulse', 'participation-xp'].includes(missionId)) return go('xp');
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
}

function bind() {
  document.querySelectorAll('[data-screen]').forEach((element) => { element.onclick = () => go(element.dataset.screen); });
  document.querySelectorAll('[data-mission-id]').forEach((element) => { element.onclick = () => openMission(element.dataset.missionId); });
  document.querySelectorAll('[data-leaderboard-view]').forEach((element) => {
    element.onclick = () => { state.leaderboardView = element.dataset.leaderboardView; render(); };
  });
  document.querySelectorAll('[data-profile-view]').forEach((element) => {
    element.onclick = () => { state.profileView = element.dataset.profileView; render(); };
  });
  const account = document.querySelector('#account-control');
  if (account) account.onclick = () => go('profile');
  document.querySelector('#profile-wallet')?.addEventListener('click', connectWallet);
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
      decimals: 6, balanceBaseUnits: null, tokenAccountCount: 0, observedAt: null,
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
    state.profile.tokenAccountReady = Boolean(session.participant?.tokenAccountReady);
    state.profile.tokenAccount = session.participant?.fawkqTokenAccount || null;
    state.walletVerificationEnabled = Boolean(session.capabilities?.walletVerification);
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
  state.telegram?.setHeaderColor?.('#050505');
  state.telegram?.setBackgroundColor?.('#050505');
  state.telegram?.onEvent?.('activated', async () => { await authenticateTelegram(); await loadWalletStatus(); render(); });
  state.screen = location.hash.slice(1) in screens ? location.hash.slice(1) : 'home';
  await Promise.all([loadCampaign(), loadCampaignRuntime(), loadCampaignReadiness(), loadBurnSummary(), authenticateTelegram()]);
  await loadWalletStatus();
  restoreWebsiteVoteFlow();
  render();
  setInterval(updateCountdownLabels, 1000);
  setInterval(async () => { await Promise.all([loadCampaignRuntime(), loadCampaignReadiness()]); render(); }, 60000);
  const remaining = Math.max(0, 650 - (performance.now() - splashStarted));
  setTimeout(() => document.body.classList.remove('loading'), remaining);
}

boot();
