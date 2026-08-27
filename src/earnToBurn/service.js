import { publicBurnSummary } from './economics.js';

export const DEFAULT_EARN_TO_BURN_PROGRAM_ID = 'fawkq-earn-to-burn';

export async function getEarnToBurnSummary(client, campaignId) {
  const programRows = await client.select(
    'earn_to_burn_programs',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=id,campaign_id,state,mint,token_program_id,decimals,original_supply_base_units,observed_start_supply_base_units,hard_cap_base_units,max_single_burn_base_units&limit=1`
  );
  const program = programRows[0];
  if (!program) return closedEarnToBurnSummary(campaignId);

  const [milestones, receipts, progressEvents] = await Promise.all([
    client.select(
      'burn_milestones',
      `?program_id=eq.${encodeURIComponent(program.id)}&select=id,sequence,label,state,progress_target_units,burn_amount_base_units&order=sequence.asc`
    ),
    client.select(
      'burn_receipts',
      `?program_id=eq.${encodeURIComponent(program.id)}&select=receipt_code,burn_type,amount_base_units,supply_before_base_units,supply_after_base_units,transaction_signature,slot,block_time,confirmed_at&order=confirmed_at.asc`
    ),
    client.select(
      'burn_progress_events',
      `?program_id=eq.${encodeURIComponent(program.id)}&select=units`
    ),
  ]);
  return publicBurnSummary({ program, milestones, receipts, progressEvents });
}

export async function getBurnReceipt(client, receiptCode) {
  if (!/^ETB-[0-9]{4,8}$/.test(String(receiptCode))) throw new Error('invalid burn receipt code');
  const rows = await client.select(
    'burn_receipts',
    `?receipt_code=eq.${encodeURIComponent(receiptCode)}&select=receipt_code,program_id,campaign_id,burn_type,mint,token_program_id,source_token_account,amount_base_units,supply_before_base_units,supply_after_base_units,transaction_signature,slot,block_time,confirmed_at&limit=1`
  );
  return rows[0] ?? null;
}

export function closedEarnToBurnSummary(campaignId) {
  return {
    programId: DEFAULT_EARN_TO_BURN_PROGRAM_ID,
    campaignId,
    state: 'DRAFT',
    mint: null,
    tokenProgramId: null,
    decimals: 6,
    originalSupplyBaseUnits: '1000000000000000',
    observedStartSupplyBaseUnits: null,
    currentSupplyBaseUnits: null,
    totalBurnedBaseUnits: '0',
    supplyRemovedBps: 0,
    hardCapBaseUnits: '0',
    progressUnits: '0',
    burnCount: 0,
    milestones: [],
    nextMilestone: null,
    receipts: [],
    unavailable: true,
  };
}
