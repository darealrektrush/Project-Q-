import { formatBps, formatTokenBaseUnits, supplyRemovedBps } from './economics.js';

function receiptUrl(baseUrl, receiptCode) {
  return `${String(baseUrl).replace(/\/$/, '')}/campaign-app/?receipt=${encodeURIComponent(receiptCode)}#burns`;
}

function burnTypeLabel(type) {
  return type === 'BUYBACK_AND_BURN' ? 'Buyback + Burn' : 'Creator Wallet Reserve Burn';
}

export function buildBurnPublishingPackage(receipt, {
  campaignName = 'Bond the Duck',
  symbol = 'FAWKQ',
  publicBaseUrl,
  decimals = 6,
  originalSupplyBaseUnits,
} = {}) {
  if (!publicBaseUrl) throw new Error('public receipt base URL is required');
  const amount = formatTokenBaseUnits(receipt.amountBaseUnits, decimals);
  const after = formatTokenBaseUnits(receipt.supplyAfterBaseUnits, decimals);
  const removed = formatBps(supplyRemovedBps(originalSupplyBaseUnits, receipt.amountBaseUnits));
  const url = receiptUrl(publicBaseUrl, receipt.receiptCode);
  const type = burnTypeLabel(receipt.burnType);

  return {
    x: `🔥 EARN TO BURN // ${receipt.receiptCode}\n\n${amount} ${symbol} permanently removed.\n${type}.\n\nCurrent supply: ${after}\nOn-chain. Supply verified. Receipt published.\n\n${url}`,
    telegram: [
      `🔥 *EARN TO BURN // ${receipt.receiptCode}*`,
      '',
      `*${amount} ${symbol}* permanently removed.`,
      `Type: ${type}`,
      `Campaign: ${campaignName}`,
      `Supply after: ${after} ${symbol}`,
      `Original supply removed by this burn: ${removed}`,
      '',
      '✓ On-chain confirmed',
      '✓ Supply verified',
      '✓ Project Q receipt',
      '',
      url,
    ].join('\n'),
    discord: [
      `## 🔥 EARN TO BURN — ${receipt.receiptCode}`,
      `**Campaign:** ${campaignName}`,
      `**Type:** ${type}`,
      `**Amount:** ${amount} ${symbol}`,
      `**Current supply:** ${after} ${symbol}`,
      `**Transaction:** ${receipt.signature}`,
      `**Receipt:** ${url}`,
    ].join('\n'),
    projectQ: {
      title: `Earn to Burn Receipt ${receipt.receiptCode}`,
      receiptUrl: url,
      status: 'CONFIRMED',
      amount,
      symbol,
      burnType: type,
      campaignName,
    },
  };
}
