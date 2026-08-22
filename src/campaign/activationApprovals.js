import { getCampaignReadiness } from './service.js';

function founderIds(env = process.env) {
  return [...new Set((env.TELEGRAM_FOUNDER_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean))];
}

export function isConfiguredFounder(userId, env = process.env) {
  return founderIds(env).includes(String(userId));
}

export function founderApprovalConfiguration(env = process.env) {
  const ids = founderIds(env);
  return { configured: ids.length === 2, founderCount: ids.length };
}

export async function getActivationApprovalStatus(client, env = process.env) {
  const readiness = await getCampaignReadiness(client, env);
  const config = founderApprovalConfiguration(env);
  const rows = await client.select(
    'campaign_activation_approvals',
    `?campaign_id=eq.${encodeURIComponent(readiness.campaignId)}&readiness_hash=eq.${readiness.reportHash}`
      + '&select=founder_user_id,approved,updated_at&order=updated_at.asc'
  );
  const approvedRows = rows.filter((row) => row.approved === true);
  return {
    readiness,
    config,
    approvals: approvedRows.map((row) => ({ founderUserId: String(row.founder_user_id), updatedAt: row.updated_at })),
    approvalCount: new Set(approvedRows.map((row) => String(row.founder_user_id))).size,
    requiredApprovals: 2,
    readyToCollect: readiness.ready && config.configured && readiness.state === 'SCHEDULED',
    approved: readiness.ready && config.configured
      && readiness.state === 'SCHEDULED'
      && new Set(approvedRows.map((row) => String(row.founder_user_id))).size === 2,
  };
}

export async function recordActivationApproval(client, userId, approved, env = process.env) {
  if (!isConfiguredFounder(userId, env)) throw new Error('Only a configured founder can record this approval.');
  const status = await getActivationApprovalStatus(client, env);
  if (!status.config.configured) throw new Error('Exactly two distinct founder Telegram IDs must be configured.');
  if (approved && !status.readiness.ready) throw new Error('All readiness gates must pass before approval.');
  if (approved && status.readiness.state !== 'SCHEDULED') throw new Error('Activation approvals require the SCHEDULED campaign state.');
  await client.upsert('campaign_activation_approvals', [{
    campaign_id: status.readiness.campaignId,
    readiness_hash: status.readiness.reportHash,
    founder_user_id: String(userId),
    approved,
    updated_at: new Date().toISOString(),
  }], 'campaign_id,readiness_hash,founder_user_id');
  return getActivationApprovalStatus(client, env);
}

export function buildActivationApprovalText(status, viewerUserId) {
  const viewerApproved = status.approvals.some(({ founderUserId }) => founderUserId === String(viewerUserId));
  return [
    '🛡 *Bond the Duck // Founder Activation Approvals*',
    '_Approval ledger only • this screen cannot activate the campaign_',
    '',
    `*Campaign state:* ${status.readiness.state}`,
    `*Readiness:* ${status.readiness.readyCount}/${status.readiness.totalCount}`,
    `*Readiness report:* \`${status.readiness.reportHash.slice(0, 12)}…\``,
    `*Founder identity config:* ${status.config.configured ? '2/2 configured' : `${status.config.founderCount}/2 configured`}`,
    `*Current approvals:* ${status.approvalCount}/${status.requiredApprovals}`,
    `*Your approval:* ${viewerApproved ? 'recorded' : 'not recorded'}`,
    '',
    status.approved
      ? '✅ Two distinct founders approved this exact readiness report. Activation is still a separate protected action.'
      : status.readyToCollect
        ? 'Approval collection is open for this exact readiness report.'
        : '🔒 Approval collection is locked until the campaign is SCHEDULED and every readiness gate passes.',
    '',
    '_Any readiness change creates a new report hash and makes earlier approvals stale._',
  ].join('\n');
}
