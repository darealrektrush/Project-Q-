export const CAMPAIGN_CALLBACK_PREFIX = 'menu:campaign:bond';

export function buildCampaignsMenu() {
  return {
    inline_keyboard: [
      [{ text: '🦆 Bond the Duck', callback_data: CAMPAIGN_CALLBACK_PREFIX }],
      [{ text: '⬅️ Back to Home', callback_data: 'menu:campaigns:back' }],
    ],
  };
}

export function buildBondTheDuckMenu(appUrl = process.env.PROJECT_Q_CAMPAIGN_APP_URL) {
  const appButton = appUrl
    ? [[{ text: '📱 Open Campaign App', url: appUrl }]]
    : [];
  return {
    inline_keyboard: [
      ...appButton,
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

export const MISSIONS_CALLBACK_PREFIX = `${CAMPAIGN_CALLBACK_PREFIX}:missions`;

export function buildMissionsMenu() {
  return {
    inline_keyboard: [
      [{ text: '⚔️ Oracle Raids', callback_data: `${MISSIONS_CALLBACK_PREFIX}:raids` }],
      [
        { text: '🗳 Website Voting', callback_data: `${MISSIONS_CALLBACK_PREFIX}:votes` },
        { text: '🤖 Trending Bots', callback_data: `${MISSIONS_CALLBACK_PREFIX}:bots` },
      ],
      [{ text: '📋 Other Missions', callback_data: `${MISSIONS_CALLBACK_PREFIX}:other` }],
      [{ text: '📈 My Mission Progress', callback_data: `${MISSIONS_CALLBACK_PREFIX}:progress` }],
      [{ text: '⬅️ Back to Bond the Duck', callback_data: CAMPAIGN_CALLBACK_PREFIX }],
    ],
  };
}

export function buildOracleRaidsMenu(oracleBotUsername = process.env.ORACLE_BOT_USERNAME ?? 'crabstar_oracle_bot') {
  const username = oracleBotUsername.replace(/^@/, '');
  return {
    inline_keyboard: [
      [{ text: '⚔️ Open Oracle Raids', url: `https://t.me/${username}` }],
      [{ text: '⬅️ Back to Missions & Voting', callback_data: MISSIONS_CALLBACK_PREFIX }],
    ],
  };
}

export const MISSIONS_HOME_TEXT = [
  '🎯 *Missions & Voting*', '',
  'Complete verified campaign actions through Project Q and the Oracle.',
  'Oracle powers X raids and sends verified engagement back to the Bond the Duck campaign.',
  '', '*Current state:* Sources remain closed until the campaign readiness gate passes.',
].join('\n');

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

export function buildOracleRaidsText(status) {
  if (status.unavailable) {
    return [
      '⚔️ *Oracle Raids*', '',
      'Raids are launched and verified by the CrabStar Oracle bot.',
      'Project Q receives verified X actions and applies the campaign XP and leaderboard rules.',
      '', '*Current state:* Raid data is not connected yet.',
    ].join('\n');
  }
  const history = status.events.length
    ? status.events.slice(0, 5).map((event) => {
        const result = event.credited ? '✅ XP credited' : event.reason ? '❌ Not credited' : '⏳ Pending XP';
        return `• Raid ${event.raid_id} · ${event.action} · ${result}`;
      })
    : ['No Oracle raid actions recorded yet.'];
  return [
    '⚔️ *Oracle Raids*', '',
    'Open the Oracle, join the active X raid, and complete the required actions.',
    'The Oracle verifies engagement. Project Q records campaign XP and leaderboard credit.',
    '',
    `✅ Credited actions: ${status.verifiedActions}`,
    `⏳ Pending actions: ${status.pendingActions}`,
    `❌ Not credited: ${status.rejectedActions}`,
    '', '*Recent raid activity:*', ...history,
  ].join('\n');
}

export function getMissionScreen(screen) {
  const screens = {
    votes: [
      '🗳 *Website Voting*', '',
      'Nine certified campaign voting sources will appear here with cooldown and verification status.',
      '', '*Current state:* Sources not enabled',
    ].join('\n'),
    bots: [
      '🤖 *Telegram Trending Bots*', '',
      'Four certified Telegram bots award 2 XP each after origin, timing, FAWKQ-context and uniqueness checks.',
      '', '*Current state:* Bots not enabled',
    ].join('\n'),
    other: [
      '📋 *Other Campaign Missions*', '',
      'Approved participation, content, education, event and onboarding missions will appear here.',
      '', '*Current state:* Missions not enabled',
    ].join('\n'),
    progress: [
      '📈 *My Mission Progress*', '',
      'Verified Oracle raids, website votes, Telegram bots and other campaign missions combine here.',
      'Participation cap: 15/day · Project Q missions: 20/day · Overall: 75/day.',
      '', '*Current state:* Campaign not launched',
    ].join('\n'),
  };
  return screens[screen] ?? null;
}

export function buildMissionScreenMenu() {
  return { inline_keyboard: [[{ text: '⬅️ Back to Missions & Voting', callback_data: MISSIONS_CALLBACK_PREFIX }]] };
}

export function buildCampaignScreenMenu() {
  return { inline_keyboard: [[{ text: '⬅️ Back to Bond the Duck', callback_data: CAMPAIGN_CALLBACK_PREFIX }]] };
}
