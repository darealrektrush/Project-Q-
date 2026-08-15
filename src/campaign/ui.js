export const CAMPAIGN_CALLBACK_PREFIX = 'menu:campaign:bond';

export function buildCampaignsMenu() {
  return {
    inline_keyboard: [
      [{ text: '🦆 Bond the Duck', callback_data: CAMPAIGN_CALLBACK_PREFIX }],
      [{ text: '⬅️ Back to Home', callback_data: 'menu:campaigns:back' }],
    ],
  };
}

export function buildBondTheDuckMenu() {
  return {
    inline_keyboard: [
      [
        { text: '🦆 Overview', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:overview` },
        { text: '✅ Enroll', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:enroll` },
      ],
      [
        { text: '📈 My Status', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:status` },
        { text: '⚡ My XP', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:xp` },
      ],
      [
        { text: '🏆 Leaderboard', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:leaderboard` },
        { text: '🎯 Missions & Voting', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:missions` },
      ],
      [
        { text: '📊 Buy-to-Earn', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:buy` },
        { text: '🏁 Cycle Results', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:cycles` },
      ],
      [
        { text: '🎁 Rewards', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:rewards` },
        { text: '📜 Rules', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:rules` },
      ],
      [{ text: '🧾 Treasury & Receipts', callback_data: `${CAMPAIGN_CALLBACK_PREFIX}:treasury` }],
      [{ text: '⬅️ Back to Campaigns', callback_data: 'menu:campaigns' }],
    ],
  };
}

export function buildCampaignHomeText(campaign = { state: 'DRAFT' }) {
  const state = campaign.state ?? 'DRAFT';
  const closed = !['ACTIVE', 'VERIFYING', 'ALLOCATIONS_FROZEN', 'DISTRIBUTING', 'COMPLETED'].includes(state);
  return [
    '🦆 *Bond the Duck*',
    '',
    'A 10-day verified-participation and holder-acquisition campaign powered by Project Q.',
    '',
    `*Status:* ${state}${state === 'DRAFT' ? ' / pre-launch' : ''}`,
    ...(campaign.unavailable ? ['Campaign data is not connected yet; this screen is safely closed.'] : []),
    ...(closed ? ['The campaign is not accepting enrollment, XP, buys or reward claims.'] : []),
    '',
    '_Project Q calculates and verifies. Squads 2-of-3 controls every treasury transfer._',
  ].join('\n');
}

export const CAMPAIGN_HOME_TEXT = buildCampaignHomeText();

const SCREEN_TEXT = Object.freeze({
  overview: [
    '🦆 *Campaign Overview*', '',
    '10 active days · five 48-hour cycles · 15,000,000 FAWKQ main allocation.',
    '7.5M supports combined verified activity and 7.5M supports buy-to-earn.',
    '', '*Current state:* DRAFT',
  ].join('\n'),
  enroll: [
    '✅ *Enroll / Wallet Setup*', '',
    'Enrollment opens only after the public readiness gate passes.',
    'You will link one Telegram account, one verified X identity and one reward wallet, then complete a 10-minute signed-message challenge.',
    '', '*Current state:* Not open',
  ].join('\n'),
  status: [
    '📈 *My Campaign Status*', '',
    'This screen will show enrollment, identity verification, wallet readiness, FAWKQ token-account readiness, cycle eligibility, rank and next deadline.',
    '', '*Current state:* Campaign not launched',
  ].join('\n'),
  xp: [
    '⚡ *My Campaign XP*', '',
    'Verified, pending and rejected campaign XP will appear here with daily-cap usage and an auditable history.',
    'Participation cap: 15/day · Project Q missions: 20/day · Overall: 75/day.',
    '', '*Current state:* No campaign XP is being awarded',
  ].join('\n'),
  leaderboard: [
    '🏆 *Bond the Duck Leaderboard*', '',
    'One combined leaderboard will include verified raids, voting, approved participation and Project Q campaign XP.',
    'Each cycle selects the top two eligible participants plus three public weighted-draw winners.',
    '', '*Current state:* No active cycle',
  ].join('\n'),
  missions: [
    '🎯 *Missions & Voting*', '',
    'This centre will contain campaign missions, nine certified website-voting sources and four verified Telegram trending bots.',
    'Telegram bot confirmations award 2 XP each when origin, timing and uniqueness checks pass.',
    '', '*Current state:* Sources are not enabled',
  ].join('\n'),
  buy: [
    '📊 *Buy-to-Earn*', '',
    'Tier 1: at least 0.07 SOL and below 0.20 SOL net buy.',
    'Tier 2: at least 0.20 SOL net buy.',
    'Only finalized activity through approved markets counts. Transfers, OTC, rewards and manipulation are excluded.',
    '', '*Current state:* Tracking not active',
  ].join('\n'),
  cycles: [
    '🏁 *Cycle Results*', '',
    'Finalized Top 15 snapshots, commitments, reveals, winners, redraw indices and allocation manifests will appear here.',
    '', '*Current state:* No completed cycles',
  ].join('\n'),
  rewards: [
    '🎁 *Rewards & Releases*', '',
    'Activity awards: 25% after verification · 50% on Day 13 · five 5% releases over 30 days.',
    'This screen will show preliminary and final eligibility, allocations, payment status and recovery state.',
    '', '*Current state:* No allocation exists',
  ].join('\n'),
  rules: [
    '📜 *Rules & Eligibility*', '',
    'One Telegram · one X identity · one reward wallet.',
    'An existing FAWKQ token account is required before cycle close. Final eligibility also requires at least USD $2 of FAWKQ at the approved Day-10 snapshot.',
    '', '*Current state:* Final rules will be published and hashed before scheduling',
  ].join('\n'),
  treasury: [
    '🧾 *Treasury & Receipts*', '',
    'Public vault balances, rules and registry hashes, manifests, Squads proposal references, transaction signatures and reconciliation will appear here.',
    '', '*Current state:* Campaign treasury is not activated',
  ].join('\n'),
});

export function getCampaignScreen(screen) {
  return SCREEN_TEXT[screen] ?? null;
}

function yesNo(value) {
  return value ? '✅' : '—';
}

export function buildParticipantStatusText(status) {
  if (status.unavailable) return SCREEN_TEXT.status;
  return [
    '📈 *My Campaign Status*', '',
    `${yesNo(status.enrolled)} Enrolled`,
    `${yesNo(status.xLinked)} X account linked`,
    `${yesNo(status.xVerified)} X identity verified`,
    `${yesNo(status.walletLinked)} Reward wallet linked`,
    `${yesNo(status.walletVerified)} Reward wallet verified`,
    `${yesNo(status.tokenAccountReady)} FAWKQ token account ready`,
  ].join('\n');
}

export function buildParticipantXpText(status) {
  if (status.unavailable) return SCREEN_TEXT.xp;
  const cycles = status.xpByCycle.length
    ? status.xpByCycle.map(({ cycleId, xp }) => `Cycle ${cycleId}: ${xp} XP`)
    : ['No verified campaign XP yet.'];
  return [
    '⚡ *My Campaign XP*', '',
    `*Verified total:* ${status.totalXp} XP`,
    ...cycles,
    '',
    'Participation cap: 15/day · Project Q missions: 20/day · Overall: 75/day.',
  ].join('\n');
}

export function buildCampaignScreenMenu() {
  return { inline_keyboard: [[{ text: '⬅️ Back to Bond the Duck', callback_data: CAMPAIGN_CALLBACK_PREFIX }]] };
}
