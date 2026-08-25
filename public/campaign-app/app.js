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

const state = {
  screen: 'home',
  telegram: window.Telegram?.WebApp,
  wallet: null,
  campaign: null,
  campaignRecord: null,
  runtime: null,
  runtimeLoadedAt: null,
  readiness: { available: false, ready: false, readyCount: 0, totalCount: 0, percent: null, checks: [] },
  burns: null,
  community: { today: null, history: [], unavailable: true },
  xInvite: { verified: false, bonusAwarded: false, unavailable: true },
  missionEvidence: { available: false, oracleRaids: null, websiteVoting: null, trendingBots: null },
  referrals: {
    code: null, link: null,
    counts: { invited: 0, qualified: 0, bonusAwarded: 0 },
    bonusXp: null, minimumPurchaseUsd: 2, unavailable: true,
  },
  profileView: 'overview',
  activeMissionId: null,
  leaderboardView: 'overall',
  leaderboards: { overall: [], '48h': [], missions: [], community: [], burn: [] },
  leaderboardMeta: null,
  profile: {
    name: window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Duck Recruit',
    telegramVerified: false,
    xVerified: false,
    walletVerified: false,
    tokenAccountReady: false,
    xp: 0,
    todayXp: 0,
    todayXpByBucket: { participation: 0, mission: 0, other: 0 },
    rank: '—',
    rankChange: null,
    percentile: 0,
    completedMissions: 0,
    allocation: null,
    allocationByCategory: {},
    rewards: { recorded: false, allocatedBaseUnits: null, scheduledBaseUnits: null,
      distributedBaseUnits: null, failedBaseUnits: null, releaseCount: 0, releases: [] },
    campaignState: 'DRAFT',
    enrolledAt: null,
    xVerifiedAt: null,
    walletVerifiedAt: null,
    xpByCycle: [],
    xpByBucket: { participation: 0, mission: 0, other: 0 },
    buyToEarn: null,
    activity: [],
    achievements: [],
  },
  sessionStatus: 'checking',
  walletVerificationEnabled: false,
};

const fallbackCampaign = {
  id: 'unavailable', name: 'Campaign Hub', shortName: 'Campaign', sequence: 'CAMPAIGN HUB',
  status: 'DISABLED', statusLabel: 'NO ACTIVE CAMPAIGN', tagline: 'Campaign data unavailable.',
  description: 'Project Q campaign records remain safely closed.',
  xpCaps: { overallDaily: 0, participationDaily: 0, projectQDaily: 0 },
  releases: [], missions: [],
  stateArtwork: { DISABLED: '/campaign-app/assets/states/empty.webp' },
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function short(value) { return `${value.slice(0, 5)}…${value.slice(-5)}`; }
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
  return `<details class="readiness-details"><summary><span><small>Public launch gates</small><b>${escapeHtml(status)}</b></span><em>${available ? 'Review gates' : 'Retrying'}</em></summary><div class="readiness-gates">${checks}</div><footer>Read-only readiness · no activation or treasury controls</footer></details>`;
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
    return {
      detail: target ? `${Number(lane.verified || 0)} / ${target} verified` : `${Number(lane.verified || 0)} verified`,
      verified: Number(lane.verified || 0),
      pending: Number(lane.pending || 0),
      rejected: Number(lane.rejected || 0),
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
    ? `<span class="mission-evidence"><i>${Number(telemetry.verified || 0)} verified</i><i>${Number(telemetry.pending || 0)} pending</i><i class="rejected">${Number(telemetry.rejected || 0)} rejected</i></span>`
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
  const otherCap = Math.max(0, caps.overallDaily - caps.participationDaily - caps.projectQDaily);
  const today = state.profile.todayXpByBucket || {};
  const activity = state.profile.activity || [];
  return `<section class="xp-command command-card"><span class="label">Verified XP</span><strong>${Number(state.profile.xp || 0).toLocaleString()} <em>XP</em></strong><small>Today ${Number(state.profile.todayXp || 0) > 0 ? '+' : ''}${Number(state.profile.todayXp || 0)}</small><div class="xp-orbit"><img src="/campaign-app/assets/project-q-app-icon.webp" alt="Project Q" /></div></section>
  <section class="command-card progress-panel"><div class="panel-title"><span>Daily progress</span><small>Overall cap ${Number(caps.overallDaily || 0)} XP</small></div>${progressRow('Participation', today.participation, caps.participationDaily)}${progressRow('Project Q missions', today.mission, caps.projectQDaily)}${progressRow('Other verified activity', today.other, otherCap)}</section>
  ${communityPulsePanel()}
  <div class="section-head compact-head"><div><span class="label">XP ledger</span><h2>Auditable participation</h2></div><span>Source · status · time</span></div>
  <section class="ledger">${activity.length ? activity.map(activityRow).join('') : '<div class="empty compact"><b>No verified activity yet</b><p>Each action appears here only after its source is verified and XP is settled.</p></div>'}</section>
  <div class="section-head"><div><span class="label">Achievements</span><h2>Campaign progression</h2></div><span>Calculated from verified records</span></div>${badgeGallery(c.xpBadges)}`;
}

function leaderboardRow(row, index) {
  const isUser = Boolean(row.isUser) || String(row.name) === String(state.profile.name);
  return `<article class="leaderboard-row ${isUser ? 'you' : ''}"><span>${String(row.rank || index + 1).padStart(2, '0')}</span><div><b>${isUser ? 'YOU' : escapeHtml(row.name)}</b><small>${escapeHtml(row.detail || 'Verified participant')}</small></div><strong>${Number(row.xp || 0).toLocaleString()} XP</strong></article>`;
}

function leaderboardScreen() {
  const c = state.campaign || fallbackCampaign;
  const rows = state.leaderboards[state.leaderboardView] || [];
  const tabs = [['overall', 'Overall'], ['48h', '48H'], ['missions', 'Missions'], ['community', 'Community'], ['burn', 'Earn-to-Burn']];
  const view = state.leaderboardMeta?.[state.leaderboardView];
  const change = Number(state.profile.rankChange || 0);
  const rankDetail = view?.available ? `${Number(view.participantCount || 0).toLocaleString()} verified participants` : 'Finalized verified standings';
  const emptyTitle = view?.available ? 'No qualifying XP yet' : 'Rankings are not live';
  const emptyDetail = view?.reason || 'No placeholder scores or identities are shown. Verified records will appear here.';
  const mode = state.leaderboardMeta?.available ? 'VERIFIED RECORDS' : 'READINESS MODE';
  return `<section class="rank-command command-card"><div><span class="label">Your rank</span><strong>${escapeHtml(state.profile.rank)}</strong><small>${change ? `${change > 0 ? '↑' : '↓'} ${Math.abs(change)} today` : rankDetail}</small></div><img src="/campaign-app/assets/system/q-signal.webp" alt="" /></section>
  <div class="tabs" role="tablist">${tabs.map(([id, label]) => `<button class="${state.leaderboardView === id ? 'active' : ''}" data-leaderboard-view="${id}" role="tab" aria-selected="${state.leaderboardView === id}">${label}</button>`).join('')}</div>
  <section class="leaderboard-list">${rows.length ? rows.map(leaderboardRow).join('') : `<div class="empty compact"><b>${escapeHtml(emptyTitle)}</b><p>${escapeHtml(emptyDetail)}</p></div>`}</section>
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

function rewardCategoryLabel(category) {
  return ({ activity: 'Activity rewards', buy_to_earn: 'Buy-to-Earn', diamond_duck: 'Diamond Duck' })[category] || 'Campaign reward';
}

function participantReleaseRow(release) {
  const status = String(release.status || 'scheduled');
  const complete = ['paid', 'recovered'].includes(status);
  const failed = status === 'failed';
  const symbol = complete ? '✓' : failed ? '!' : '○';
  const detail = `${formatBaseUnits(release.amountBaseUnits)} FAWKQ · ${formatProfileDate(release.scheduledAt)} · ${status.replaceAll('_', ' ')}`;
  return `<article class="${complete ? 'complete' : failed ? 'failed' : ''}"><span>${Number(release.percent || 0)}%</span><div><b>${escapeHtml(rewardCategoryLabel(release.category))}${release.cycleId ? ` · Cycle ${Number(release.cycleId)}` : ''}</b><small>${escapeHtml(detail)}</small></div><i>${symbol}</i></article>`;
}

function rewardsScreen() {
  const c = state.campaign || fallbackCampaign;
  const plan = c.releases || [];
  const commitments = c.campaignCommitments || {};
  const rewards = state.profile.rewards || {};
  const allocation = rewards.recorded ? formatBaseUnits(rewards.allocatedBaseUnits) : '—';
  const scheduled = rewards.releaseCount ? formatBaseUnits(rewards.scheduledBaseUnits) : '—';
  const distributed = rewards.releaseCount ? formatBaseUnits(rewards.distributedBaseUnits) : '—';
  const failed = rewards.releaseCount ? BigInt(rewards.failedBaseUnits || 0) : 0n;
  const actualReleases = rewards.releases || [];
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
      ? '<div><b>Participant reward record loaded</b><p>Allocation and release totals come from Project Q records. This interface cannot claim, sign or transfer funds.</p></div>'
      : '<div><b>No participant allocation exists yet</b><p>Reward balances remain blank until review and finalized allocation records exist.</p></div>';
  return `<section class="reward-vault command-card"><div><span class="label">Recorded allocation</span><strong>${allocation}</strong><em>FAWKQ</em>${statePill(rewards.recorded ? 'RECORDED' : 'NOT FINALIZED', rewards.recorded ? 'success' : 'pending')}</div><img src="/campaign-app/assets/system/q-vault.webp" alt="Project Q reward vault" /></section>
  <section class="reward-balances"><div><span>Allocated</span><b>${allocation}</b></div><div><span>Scheduled</span><b>${scheduled}</b></div><div class="distributed"><span>Distributed</span><b>${distributed}</b></div></section>
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
  const milestone = b.nextMilestone;
  const requested = new URLSearchParams(location.search).get('receipt');
  const receipts = (b.receipts || []).map((receipt) => {
    const selected = requested === receipt.receiptCode ? ' selected' : '';
    const explorer = `https://solscan.io/tx/${encodeURIComponent(receipt.signature)}`;
    return `<article class="burn-receipt${selected}"><div><span class="label">${escapeHtml(receipt.receiptCode)}</span><h3>${formatBaseUnits(receipt.amountBaseUnits, b.decimals)} FAWKQ</h3><p>${escapeHtml(receipt.burnType)} · ${escapeHtml(receipt.blockTime)}</p></div><a class="outline-action" href="${explorer}" target="_blank" rel="noopener noreferrer">On-chain proof</a></article>`;
  }).join('');
  return `<section class="screen-intro"><div><span class="label">Collective mission</span><h2>Earn to Burn</h2><p>${escapeHtml(configured.tagline || 'Individual activity earns rewards. Collective activity advances transparent burn milestones.')}</p></div>${statePill(b.state)}</section>
  <section class="burn-grid">${metric('Reference supply', formatBaseUnits(b.originalSupplyBaseUnits, b.decimals), 'FAWKQ')}${metric('Confirmed burned', formatBaseUnits(b.totalBurnedBaseUnits, b.decimals), `${formatPercentBps(b.supplyRemovedBps)} removed`)}${metric('Observed supply', formatBaseUnits(b.currentSupplyBaseUnits, b.decimals), 'Last verified state')}${metric('Receipts', Number(b.burnCount || 0), 'On-chain confirmed')}</section>
  <section class="command-card burn-milestone"><div class="panel-title"><span>Opening commitment</span><small>${escapeHtml(configured.openingBurnStatus || 'PLANNED')}</small></div><strong>${formatBaseUnits(configured.openingBurnBaseUnits, b.decimals)} FAWKQ</strong><p>Additional 1.5% from the FAWKQ creator wallet. It does not reduce the campaign reward pool, Diamond Duck bonus or 1 SOL prize.</p></section>
  <section class="command-card burn-milestone"><div class="panel-title"><span>Next collective milestone</span><small>${milestone ? escapeHtml(milestone.state) : 'NOT CONFIGURED'}</small></div>${milestone ? `<strong>${escapeHtml(milestone.label)}</strong><div class="progress"><span style="width:${Math.min(100, Number(milestone.progressBps || 0) / 100)}%"></span></div><p>Proposed burn: ${formatBaseUnits(milestone.burnAmountBaseUnits, b.decimals)} FAWKQ. Founder approval and an external signer remain required.</p>` : '<div class="empty compact">Post-launch milestone thresholds and burn amounts remain unset.</div>'}</section>
  <div class="section-head"><div><span class="label">Burn receipts</span><h2>Immutable evidence</h2></div></div><div class="burn-receipts">${receipts || '<div class="empty command-card"><b>No confirmed burn receipts</b><p>No Earn to Burn transaction has been executed or confirmed.</p></div>'}</div>
  <section class="oracle-note"><img src="/campaign-app/assets/project-q-app-icon.webp" alt="Project Q" /><div><b>Verification without custody</b><p>Project Q never holds a treasury signer. It verifies completed transactions, records supply deltas and prepares publication drafts.</p></div></section>`;
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
  const tabs = [['overview', 'Overview'], ['activity', 'Activity'], ['rewards', 'Rewards'], ['referrals', 'Referrals'], ['identity', 'Identity']];
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
  const allocationRows = Object.entries(p.allocationByCategory || {});
  return `<section class="command-card profile-reward-card"><div><span class="label">Recorded allocation</span><strong>${allocation}</strong><small>FAWKQ</small></div>${statePill(p.allocation == null ? 'NOT FINALIZED' : 'RECORDED', p.allocation == null ? 'pending' : 'success')}<img src="/campaign-app/assets/system/q-vault.webp" alt="" /></section>
  <section class="reward-balances profile-reward-balances"><div><span>Allocated</span><b>${allocation}</b></div><div><span>Scheduled</span><b>${scheduled}</b></div><div class="distributed"><span>Distributed</span><b>${distributed}</b></div></section>
  <section class="profile-overview-grid">
    <article class="command-card profile-card"><div class="panel-title"><span>Reward wallet</span>${statePill(p.walletVerified ? 'VERIFIED' : 'PENDING', p.walletVerified ? 'success' : 'pending')}</div><h3>${state.wallet ? escapeHtml(short(state.wallet)) : 'No verified wallet'}</h3><p>${p.tokenAccountReady ? 'FAWKQ token-account eligibility is recorded.' : 'Token-account eligibility remains pending.'}</p><button class="text-action" data-profile-view="identity">Manage identity →</button></article>
    <article class="command-card profile-card"><div class="panel-title"><span>Buy-to-Earn</span>${statePill(buy?.eligible ? 'ELIGIBLE' : 'PENDING', buy?.eligible ? 'success' : 'pending')}</div><h3>${buy?.tier ? `Tier ${Number(buy.tier)}` : 'No finalized position'}</h3><p>${buy ? `Snapshot value ${buy.snapshot_usd == null ? 'pending' : `$${Number(buy.snapshot_usd).toFixed(2)}`}. Weight ${Number(buy.weight || 0)}.` : 'Verified purchase and snapshot data will appear here once recorded.'}</p></article>
  </section>
  <section class="command-card allocation-panel"><div class="panel-title"><span>Allocation breakdown</span><small>Finalized records only</small></div>${allocationRows.length ? allocationRows.map(([category, amount]) => `<div><span>${escapeHtml(category.replaceAll('_', ' '))}</span><b>${formatBaseUnits(amount)} FAWKQ</b></div>`).join('') : '<div class="profile-empty-line"><span>Campaign rewards</span><b>No participant allocation exists yet</b></div>'}</section>
  <div class="notice-surface"><div><b>Rewards remain evidence-bound</b><p>Allocated, scheduled and distributed totals appear only when Project Q records exist.</p></div><button class="outline-action" data-screen="rewards">Campaign commitments</button></div>`;
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
  const views = { overview: profileOverview, activity: profileActivity, rewards: profileRewards, referrals: profileReferrals, identity: profileIdentity };
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
  const screenTitle = state.screen === 'home' ? 'Project Q' : (navTitle || (state.screen === 'profile' ? 'Profile' : state.screen === 'burns' ? 'Earn to Burn' : c.name));
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

function missionDetailMarkup(mission) {
  const telemetry = missionTelemetry(mission);
  const actionEnabled = Boolean(mission.enabled || mission.readOnlyAction);
  const requirements = Array.isArray(mission.requirements) ? mission.requirements : [];
  const evidence = telemetry && ('verified' in telemetry)
    ? `<div class="mission-detail-evidence"><div><span>Verified</span><b>${Number(telemetry.verified || 0)}</b></div><div><span>Pending</span><b>${Number(telemetry.pending || 0)}</b></div><div><span>Rejected</span><b>${Number(telemetry.rejected || 0)}</b></div></div>`
    : `<div class="mission-personal-line"><span>Personal status</span><b>${escapeHtml(telemetry?.detail || 'No verified participant record yet')}</b></div>`;
  return `<form method="dialog" class="mission-sheet"><button class="mission-sheet-close" value="close" aria-label="Close mission details">×</button>
    <header class="mission-sheet-hero"><img src="${escapeHtml(mission.image)}" alt="" /><div><span class="label">${escapeHtml(mission.kind === 'COLLECTIVE' ? 'Collective mission' : 'Mission lane')}</span><h2>${escapeHtml(mission.title)}</h2><p>${escapeHtml(mission.description)}</p></div>${statePill(mission.enabled ? 'AVAILABLE' : mission.status)}</header>
    <section class="mission-facts"><div><span>Reward</span><b>${escapeHtml(mission.reward)}</b></div><div><span>Frequency</span><b>${escapeHtml(mission.frequency || 'Campaign')}</b></div><div><span>Your progress</span><b>${escapeHtml(telemetry?.detail || mission.status)}</b></div></section>
    ${evidence}
    <section class="mission-rule-block"><span class="label">How Project Q verifies it</span><p>${escapeHtml(mission.verification || 'Verification rules will be published before this mission opens.')}</p></section>
    <section class="mission-rule-block"><span class="label">Requirements</span><ol>${requirements.map((requirement) => `<li>${escapeHtml(requirement)}</li>`).join('')}</ol></section>
    <footer class="mission-sheet-actions"><button type="button" class="gold-action compact" data-mission-action="${escapeHtml(mission.id)}" ${actionEnabled ? '' : 'disabled'}><span><b>${escapeHtml(actionEnabled ? (mission.actionLabel || 'Open mission') : 'Readiness gate closed')}</b><small>${escapeHtml(actionEnabled ? 'Continue through the official verified flow' : 'No submission can be made yet')}</small></span><i>→</i></button><small>Only verified Project Q records count. Opening a destination does not guarantee XP or rewards.</small></footer>
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
  dialog.querySelector('[data-mission-action]')?.addEventListener('click', () => executeMissionAction(missionId));
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
    state.leaderboardMeta = session.leaderboards || null;
    if (session.leaderboards) {
      for (const key of ['overall', '48h', 'missions', 'community', 'burn']) {
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
  state.telegram?.onEvent?.('activated', async () => { await authenticateTelegram(); render(); });
  state.screen = location.hash.slice(1) in screens ? location.hash.slice(1) : 'home';
  await Promise.all([loadCampaign(), loadCampaignRuntime(), loadCampaignReadiness(), loadBurnSummary(), authenticateTelegram()]);
  render();
  setInterval(updateCountdownLabels, 1000);
  setInterval(async () => { await Promise.all([loadCampaignRuntime(), loadCampaignReadiness()]); render(); }, 60000);
  const remaining = Math.max(0, 650 - (performance.now() - splashStarted));
  setTimeout(() => document.body.classList.remove('loading'), remaining);
}

boot();
