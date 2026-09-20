import { isEnabled } from '../lib/featureFlags.js';
import { fetchAndVerifyNativeSolTransfer } from './impactSolanaProof.js';

function firstRow(result) {
  return Array.isArray(result) ? result[0] ?? null : result;
}

export function impactReceiptsEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_IMPACT_RECEIPTS_ENABLED);
}

export async function finalizeTopContributor(client, {
  campaignId = 'bond-the-duck-2026',
  founderUserId,
  env = process.env,
} = {}) {
  if (!impactReceiptsEnabled(env)) throw new Error('impact receipt workflow disabled');
  if (!/^\d+$/.test(String(founderUserId || ''))) throw new Error('invalid founder identity');
  return firstRow(await client.rpc('finalize_campaign_top_contributor', {
    p_campaign_id: campaignId,
    p_finalized_by: Number(founderUserId),
  }));
}

export async function verifyAndRecordImpactReceipt(
  client,
  connection,
  {
    campaignId = 'bond-the-duck-2026',
    receiptType,
    recipient,
    amountLamports,
    signature,
    founderUserId,
    env = process.env,
  } = {}
) {
  if (!impactReceiptsEnabled(env)) throw new Error('impact receipt workflow disabled');
  if (!['WINNER_PRIZE','CONSERVATION_IMPACT'].includes(receiptType)) throw new Error('invalid impact receipt type');
  if (!/^\d+$/.test(String(founderUserId || ''))) throw new Error('invalid founder identity');

  const proof = await fetchAndVerifyNativeSolTransfer(connection, signature, {
    recipient,
    amountLamports,
  });
  const row = firstRow(await client.rpc('record_verified_campaign_impact_receipt', {
    p_campaign_id: campaignId,
    p_receipt_type: receiptType,
    p_recipient_address: proof.recipient,
    p_amount_lamports: Number(proof.amountLamports),
    p_transaction_signature: proof.signature,
    p_slot: Number(proof.slot),
    p_block_time: proof.blockTime,
    p_proof: proof,
    p_recorded_by: Number(founderUserId),
  }));
  return { receipt: row, proof, proofHash: row?.proof_hash ?? null };
}

export async function getImpactReceiptState(client, campaignId = 'bond-the-duck-2026') {
  const [contributorRows, receiptRows] = await Promise.all([
    client.select('campaign_top_contributor_finalizations',
      `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=campaign_id,telegram_user_id,profile_id,reward_wallet,total_xp,finalized_at&limit=1`),
    client.select('campaign_impact_receipts',
      `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=receipt_type,profile_id,recipient_address,amount_lamports,transaction_signature,slot,block_time,recorded_at&order=receipt_type.asc`)
  ]);
  const contributor = contributorRows[0] ?? null;
  return {
    campaignId,
    contributor,
    winnerPrize: receiptRows.find(({ receipt_type }) => receipt_type === 'WINNER_PRIZE') ?? null,
    conservationImpact: receiptRows.find(({ receipt_type }) => receipt_type === 'CONSERVATION_IMPACT') ?? null,
    complete: Boolean(
      contributor
      && receiptRows.some(({ receipt_type, amount_lamports }) => receipt_type === 'WINNER_PRIZE' && String(amount_lamports) === '1000000000')
      && receiptRows.some(({ receipt_type, amount_lamports }) => receipt_type === 'CONSERVATION_IMPACT' && String(amount_lamports) === '100000000')
    ),
  };
}
