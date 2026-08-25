import { formatBps, formatTokenBaseUnits } from './economics.js';

export function buildEarnToBurnAdminText(summary) {
  const amount = (value) => value == null ? 'Not recorded' : `${formatTokenBaseUnits(value, summary.decimals)} FAWKQ`;
  const milestone = summary.nextMilestone;
  return [
    '🔥 *PROJECT Q // EARN TO BURN*',
    '_Read-only proof and approval dashboard • no signer controls_',
    '',
    `*Program state:* ${summary.state}`,
    `*Campaign:* ${summary.campaignId}`,
    `*Reference supply:* ${amount(summary.originalSupplyBaseUnits)}`,
    `*Observed current supply:* ${amount(summary.currentSupplyBaseUnits)}`,
    `*Confirmed burned:* ${amount(summary.totalBurnedBaseUnits)}`,
    `*Supply removed:* ${formatBps(summary.supplyRemovedBps)}`,
    `*Confirmed receipts:* ${summary.burnCount}`,
    '',
    milestone ? [
      `*Next milestone:* ${milestone.label}`,
      `*State:* ${milestone.state}`,
      `*Progress:* ${formatBps(milestone.progressBps)}`,
      `*Proposed burn:* ${amount(milestone.burnAmountBaseUnits)}`,
    ].join('\n') : '*Next milestone:* Not configured',
    '',
    summary.unavailable
      ? '🔒 Earn to Burn remains unconfigured and cannot propose or verify burns.'
      : 'Project Q records progress, verifies completed burns, creates receipts and prepares publishing drafts.',
    '',
    '_Project Q never holds a treasury signer and never executes a burn._',
  ].join('\n');
}
