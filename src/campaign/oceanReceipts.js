import { verifyOceanContribution } from './oceanContributionProof.js';

export function oceanReceiptsEnabled(env = process.env) {
  return env.RENDER_SERVICE_NAME === 'project-q-dev' &&
    String(env.SUPABASE_URL || '').replace(/\/$/, '') === 'https://awouccxagxglpvvuznxo.supabase.co';
}

export async function recordOceanContribution(client, connection, { campaignId, telegramUserId, signature }) {
  const identities = await client.select('identity_links',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
    '&select=profile_id,reward_wallet,wallet_verified_at&limit=1');
  const identity = identities[0];
  if (!identity?.profile_id || !identity?.reward_wallet || !identity?.wallet_verified_at) {
    throw new Error('Oracle verified profile and wallet required');
  }
  const proof = await verifyOceanContribution(connection, signature, identity.reward_wallet);
  if (!proof) return null;
  if (!Number.isSafeInteger(proof.blockTime) || proof.blockTime <= 0) {
    throw new Error('finalized block time required for a receipt');
  }
  const receipts = await client.rpc('record_ocean_contribution', {
    p_campaign_id: campaignId,
    p_telegram_user_id: telegramUserId,
    p_wallet: proof.wallet,
    p_signature: proof.signature,
    p_slot: proof.slot,
    p_block_time: new Date(proof.blockTime * 1000).toISOString(),
    p_transfers: proof.transfers,
  });
  if (!Array.isArray(receipts) || receipts.length !== proof.transfers.length ||
      receipts.some((receipt) => receipt.transaction_signature !== signature ||
        receipt.profile_id !== identity.profile_id)) {
    throw new Error('ocean receipt persistence failed');
  }
  return { proof, receipts: receipts.map((receipt) => ({
    id: receipt.id, asset: receipt.asset,
    amountBaseUnits: proof.transfers.find((transfer) => transfer.asset === receipt.asset)?.amountBaseUnits,
    decimals: receipt.decimals, signature: receipt.transaction_signature,
    blockTime: receipt.block_time, founderDeposit: receipt.founder_deposit,
  })) };
}
