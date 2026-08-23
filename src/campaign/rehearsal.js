import { founderApprovalConfiguration } from './activationApprovals.js';
import { DEFAULT_CAMPAIGN_ID } from './service.js';

function campaignId(env = process.env) {
  return env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
}

function configured(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function httpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export async function getRehearsalReadiness(client, env = process.env) {
  const id = campaignId(env);
  const [campaignRows, cycleRows, sourceRows] = await Promise.all([
    client.select('campaigns', `?id=eq.${encodeURIComponent(id)}&select=id,state&limit=1`),
    client.select('cycles', `?campaign_id=eq.${encodeURIComponent(id)}&select=cycle_id,opens_at,closes_at`),
    client.select('verification_sources', `?campaign_id=eq.${encodeURIComponent(id)}&select=source_key&limit=20`),
  ]);
  const campaign = campaignRows[0] ?? null;
  const founders = founderApprovalConfiguration(env);
  const timelineUnset = cycleRows.length === 0
    || cycleRows.every((row) => !row.opens_at && !row.closes_at);
  const launchLocked = [
    env.PROJECT_Q_CAMPAIGN_APP_ENABLED,
    env.PROJECT_Q_WALLET_VERIFICATION_ENABLED,
    env.PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED,
  ].every((value) => value !== 'true');

  const checks = [
    { key: 'database', label: 'Campaign database connected', ready: Boolean(campaign) },
    { key: 'draft', label: 'Campaign remains safely in DRAFT', ready: campaign?.state === 'DRAFT' },
    { key: 'timeline', label: 'Public timeline remains unset', ready: timelineUnset },
    { key: 'founders', label: 'Two founder identities configured', ready: founders.configured },
    { key: 'app_url', label: 'Campaign Mini App HTTPS URL configured', ready: httpsUrl(env.PROJECT_Q_CAMPAIGN_APP_URL) },
    { key: 'telegram_auth', label: 'Telegram Mini App authentication configured', ready: configured(env.TELEGRAM_BOT_TOKEN) },
    { key: 'oracle', label: 'Oracle campaign bridge authentication configured', ready: configured(env.ORACLE_CAMPAIGN_SECRET) },
    {
      key: 'wallet_stack',
      label: 'Wallet verification dependencies configured',
      ready: configured(env.HELIUS_RPC_URL) && configured(env.TOKEN_MINT),
    },
    { key: 'sources', label: 'Verification-source rehearsal data present', ready: sourceRows.length > 0 },
    { key: 'launch_lock', label: 'All participant launch switches remain off', ready: launchLocked },
  ];

  return {
    campaignId: id,
    campaignState: campaign?.state ?? 'MISSING',
    checks,
    readyCount: checks.filter((check) => check.ready).length,
    totalCount: checks.length,
    ready: checks.every((check) => check.ready),
  };
}

export function buildRehearsalReadinessText(status) {
  return [
    '🧪 *Bond the Duck // Rehearsal Readiness*',
    '_Read-only preflight • no activation, XP, or fund movement_',
    '',
    `*Campaign state:* ${status.campaignState}`,
    `*Passed:* ${status.readyCount}/${status.totalCount}`,
    '',
    ...status.checks.map(({ label, ready }) => `${ready ? '✅' : '🔒'} ${label}`),
    '',
    status.ready
      ? 'The campaign is ready for controlled rehearsal while remaining closed to participants.'
      : 'Rehearsal remains blocked until every preflight check passes.',
    '',
    '_Secret values are never displayed. The final campaign date remains a separate last-step decision._',
  ].join('\n');
}
