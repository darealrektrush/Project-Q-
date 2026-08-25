export const BPS_DENOMINATOR = 10_000n;

export function asBaseUnits(value, label = 'amount', { allowZero = true } = {}) {
  let amount;
  try {
    amount = typeof value === 'bigint' ? value : BigInt(value);
  } catch {
    throw new TypeError(`${label} must be an integer base-unit value`);
  }
  if (amount < 0n || (!allowZero && amount === 0n)) {
    throw new RangeError(`${label} must be ${allowZero ? 'non-negative' : 'positive'}`);
  }
  return amount;
}

export function formatTokenBaseUnits(value, decimals = 6) {
  const amount = asBaseUnits(value);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new RangeError('token decimals must be an integer between 0 and 18');
  }
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${new Intl.NumberFormat('en-US').format(whole)}${fraction ? `.${fraction}` : ''}`;
}

export function progressBps(currentUnits, targetUnits) {
  const current = asBaseUnits(currentUnits, 'current progress');
  const target = asBaseUnits(targetUnits, 'progress target', { allowZero: false });
  return Number((current * BPS_DENOMINATOR) / target > BPS_DENOMINATOR
    ? BPS_DENOMINATOR
    : (current * BPS_DENOMINATOR) / target);
}

export function supplyRemovedBps(originalSupply, totalBurned) {
  const original = asBaseUnits(originalSupply, 'original supply', { allowZero: false });
  const burned = asBaseUnits(totalBurned, 'total burned');
  if (burned > original) throw new RangeError('total burned cannot exceed original supply');
  return Number((burned * BPS_DENOMINATOR) / original);
}

export function formatBps(bps) {
  if (!Number.isInteger(bps) || bps < 0) throw new RangeError('basis points must be non-negative');
  return `${(bps / 100).toFixed(2)}%`;
}

export function assertBurnProposal(program, milestone, proposal) {
  const amount = asBaseUnits(proposal.amountBaseUnits, 'burn amount', { allowZero: false });
  const hardCap = asBaseUnits(program.hardCapBaseUnits, 'hard burn cap', { allowZero: false });
  const maxSingle = asBaseUnits(program.maxSingleBurnBaseUnits, 'maximum single burn', { allowZero: false });
  const alreadyCommitted = asBaseUnits(program.committedBaseUnits ?? 0, 'committed burn amount');
  const milestoneAmount = asBaseUnits(milestone.burnAmountBaseUnits, 'milestone burn amount', { allowZero: false });

  if (program.state !== 'ENABLED') throw new Error('earn-to-burn program is not enabled');
  if (milestone.state !== 'UNLOCKED') throw new Error('burn milestone is not unlocked');
  if (proposal.mint !== program.mint) throw new Error('burn proposal mint does not match program');
  if (proposal.tokenProgramId !== program.tokenProgramId) throw new Error('burn proposal token program does not match program');
  if (!program.approvedSourceAccounts?.includes(proposal.sourceTokenAccount)) {
    throw new Error('burn proposal source token account is not approved');
  }
  if (amount !== milestoneAmount) throw new Error('burn proposal amount does not match milestone');
  if (amount > maxSingle) throw new Error('burn proposal exceeds maximum single burn');
  if (alreadyCommitted + amount > hardCap) throw new Error('burn proposal exceeds hard campaign burn cap');
  return true;
}

export function publicBurnSummary({ program, milestones = [], receipts = [], progressEvents = [] }) {
  const totalBurned = receipts.reduce(
    (total, receipt) => total + asBaseUnits(receipt.amount_base_units),
    0n
  );
  const signedProgress = progressEvents.reduce((total, event) => total + BigInt(event.units), 0n);
  const progressUnits = signedProgress < 0n ? 0n : signedProgress;
  const nextMilestone = milestones
    .filter(({ state }) => ['LOCKED', 'UNLOCKED', 'APPROVAL_PENDING', 'APPROVED', 'AWAITING_CONFIRMATION'].includes(state))
    .sort((a, b) => Number(a.sequence) - Number(b.sequence))[0] ?? null;
  const observedStart = asBaseUnits(program.observed_start_supply_base_units ?? program.original_supply_base_units);
  const currentSupply = receipts.length
    ? asBaseUnits([...receipts].sort((a, b) =>
      new Date(b.confirmed_at ?? b.block_time) - new Date(a.confirmed_at ?? a.block_time)
    )[0].supply_after_base_units)
    : observedStart;

  return {
    programId: program.id,
    campaignId: program.campaign_id,
    state: program.state,
    mint: program.mint,
    tokenProgramId: program.token_program_id,
    decimals: Number(program.decimals),
    originalSupplyBaseUnits: String(program.original_supply_base_units),
    observedStartSupplyBaseUnits: observedStart.toString(),
    currentSupplyBaseUnits: currentSupply.toString(),
    totalBurnedBaseUnits: totalBurned.toString(),
    supplyRemovedBps: supplyRemovedBps(program.original_supply_base_units, totalBurned),
    hardCapBaseUnits: String(program.hard_cap_base_units),
    progressUnits: progressUnits.toString(),
    burnCount: receipts.length,
    nextMilestone: nextMilestone ? {
      id: nextMilestone.id,
      label: nextMilestone.label,
      state: nextMilestone.state,
      progressTargetUnits: String(nextMilestone.progress_target_units),
      burnAmountBaseUnits: String(nextMilestone.burn_amount_base_units),
      progressBps: progressBps(progressUnits, nextMilestone.progress_target_units),
    } : null,
    receipts: receipts.map((receipt) => ({
      receiptCode: receipt.receipt_code,
      burnType: receipt.burn_type,
      amountBaseUnits: String(receipt.amount_base_units),
      supplyBeforeBaseUnits: String(receipt.supply_before_base_units),
      supplyAfterBaseUnits: String(receipt.supply_after_base_units),
      signature: receipt.transaction_signature,
      slot: String(receipt.slot),
      blockTime: receipt.block_time,
      status: 'CONFIRMED',
    })),
  };
}
