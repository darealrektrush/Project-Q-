import { createHash } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';

const CAMPAIGN_ID = 'bond-the-duck-2026';
const CAMPAIGN_REWARD_BASE_UNITS = '15000000000000';
const EXPECTED_CYCLES = 7;
const WINNERS_PER_CYCLE = 5;
const RELEASES_PER_ALLOCATION = 7;

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
  return value;
}

function rewardWallet(value, telegramUserId) {
  const wallet = String(value ?? '');
  try {
    const key = new PublicKey(wallet);
    if (!PublicKey.isOnCurve(key.toBytes())) throw new Error('off curve');
  } catch {
    throw new Error(`verified reward wallet is required for Telegram user ${telegramUserId}`);
  }
  return wallet;
}

function baseUnits(value, label) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`${label} must be a canonical positive base-unit string`);
  }
  return BigInt(value);
}

export function buildLifecycleMaterializationPlan({
  lifecycle,
  walletsByTelegramUserId,
  calcVersion = 1,
  manifestVersion = 1,
}) {
  if (!lifecycle || lifecycle.mode !== 'BUILD_ONLY_NO_DATABASE_NO_SIGNING') {
    throw new Error('a reconciled build-only lifecycle is required');
  }
  if (!walletsByTelegramUserId || typeof walletsByTelegramUserId !== 'object' || Array.isArray(walletsByTelegramUserId)) {
    throw new Error('verified reward-wallet mapping is required');
  }
  positiveInteger(calcVersion, 'calculation version');
  positiveInteger(manifestVersion, 'manifest version');
  if (lifecycle.cycleCount !== EXPECTED_CYCLES || lifecycle.cycles?.length !== EXPECTED_CYCLES
    || lifecycle.winnerCount !== EXPECTED_CYCLES * WINNERS_PER_CYCLE
    || lifecycle.releaseCount !== EXPECTED_CYCLES * WINNERS_PER_CYCLE * RELEASES_PER_ALLOCATION
    || lifecycle.allocatedBaseUnits !== CAMPAIGN_REWARD_BASE_UNITS
    || lifecycle.scheduledBaseUnits !== CAMPAIGN_REWARD_BASE_UNITS) {
    throw new Error('lifecycle does not match the complete Bond campaign contract');
  }

  const winnerRows = [];
  const allocationRows = [];
  const releaseRows = [];
  const allocationKeys = new Set();
  const paymentKeys = new Set();

  for (const cycle of lifecycle.cycles) {
    positiveInteger(cycle.cycleId, 'cycle id');
    if (cycle.selection?.campaignId !== CAMPAIGN_ID || cycle.allocation?.campaignId !== CAMPAIGN_ID
      || cycle.selection.cycleId !== cycle.cycleId || cycle.allocation.cycleId !== cycle.cycleId
      || cycle.selection.winners?.length !== WINNERS_PER_CYCLE
      || cycle.allocation.allocations?.length !== WINNERS_PER_CYCLE
      || cycle.releasePlans?.length !== WINNERS_PER_CYCLE) {
      throw new Error(`cycle ${cycle.cycleId} is incomplete or belongs to another campaign`);
    }

    const winnerByPosition = new Map(cycle.selection.winners.map((winner) => [winner.position, winner]));
    for (const allocation of cycle.allocation.allocations) {
      const winner = winnerByPosition.get(allocation.position);
      if (!winner || String(winner.telegramUserId) !== String(allocation.telegramUserId)) {
        throw new Error(`cycle ${cycle.cycleId} winner and allocation identities do not match`);
      }
      const telegramUserId = String(winner.telegramUserId);
      const wallet = rewardWallet(walletsByTelegramUserId[telegramUserId], telegramUserId);
      const allocationKey = `cycle-${cycle.cycleId}:position-${winner.position}`;
      if (allocationKeys.has(allocationKey)) throw new Error('duplicate allocation key');
      allocationKeys.add(allocationKey);

      winnerRows.push({
        campaign_id: CAMPAIGN_ID,
        cycle_id: cycle.cycleId,
        position: winner.position,
        telegram_user_id: telegramUserId,
        selection: winner.selection,
        draw_index: winner.drawIndex,
      });
      allocationRows.push({
        allocation_key: allocationKey,
        campaign_id: CAMPAIGN_ID,
        category: 'activity',
        cycle_id: cycle.cycleId,
        telegram_user_id: telegramUserId,
        reward_wallet: wallet,
        gross_base_units: allocation.grossBaseUnits,
        calc_version: calcVersion,
        manifest_version: manifestVersion,
        eligibility_status: 'FINAL_VERIFIED',
      });

      const releasePlan = cycle.releasePlans.find((plan) => plan.allocationKey === allocationKey);
      if (!releasePlan || releasePlan.releases?.length !== RELEASES_PER_ALLOCATION
        || releasePlan.grossBaseUnits !== allocation.grossBaseUnits) {
        throw new Error(`release plan is missing for ${allocationKey}`);
      }
      const releaseTotal = releasePlan.releases.reduce((sum, release) => {
        if (paymentKeys.has(release.paymentKey)) throw new Error('duplicate release payment key');
        paymentKeys.add(release.paymentKey);
        releaseRows.push({
          allocation_key: allocationKey,
          pct: release.pct,
          scheduled_at: release.scheduledAt,
          amount_base_units: release.amountBaseUnits,
          status: 'scheduled',
          payment_key: release.paymentKey,
        });
        return sum + baseUnits(release.amountBaseUnits, 'release amount');
      }, 0n);
      if (releaseTotal !== baseUnits(allocation.grossBaseUnits, 'allocation amount')) {
        throw new Error(`release amounts do not reconcile for ${allocationKey}`);
      }
    }
  }

  const allocated = allocationRows.reduce((sum, row) => sum + baseUnits(row.gross_base_units, 'allocation amount'), 0n);
  const scheduled = releaseRows.reduce((sum, row) => sum + baseUnits(row.amount_base_units, 'release amount'), 0n);
  if (allocated.toString() !== CAMPAIGN_REWARD_BASE_UNITS || scheduled !== allocated) {
    throw new Error('materialization plan does not reconcile to 15M FAWKQ');
  }

  const payload = {
    schema: 'bond-lifecycle-materialization-v1',
    campaignId: CAMPAIGN_ID,
    expectedCampaignState: 'VERIFYING',
    calcVersion,
    manifestVersion,
    allocatedBaseUnits: allocated.toString(),
    scheduledBaseUnits: scheduled.toString(),
    winnerRows,
    allocationRows,
    releaseRows,
  };
  return {
    mode: 'BUILD_ONLY_NO_DATABASE_NO_SIGNING',
    planHash: createHash('sha256').update(canonical(payload)).digest('hex'),
    ...payload,
  };
}
