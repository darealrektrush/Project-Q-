import { createHash } from 'node:crypto';

import {
  BOND_DRAW_PROTOCOL_VERSION,
  cycleDrawCommitHash,
  generateCycleDrawReveal,
  verifyCycleCutoffBracket,
} from './cycleDraw.js';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function normalizeCycles(cycles = []) {
  if (!Array.isArray(cycles) || cycles.length !== 5) {
    throw new Error('exactly five scheduled cycles are required');
  }
  const ordered = [...cycles].sort((a, b) => Number(a.cycle_id) - Number(b.cycle_id));
  ordered.forEach((cycle, index) => {
    const cycleId = Number(cycle.cycle_id);
    const opensAt = Date.parse(cycle.opens_at);
    const closesAt = Date.parse(cycle.closes_at);
    if (cycleId !== index + 1 || !Number.isFinite(opensAt) || !Number.isFinite(closesAt)
      || closesAt - opensAt !== 48 * 60 * 60 * 1000
      || (index > 0 && opensAt !== Date.parse(ordered[index - 1].closes_at))) {
      throw new Error('cycles do not match five contiguous 48-hour Bond schedule');
    }
  });
  return ordered;
}

export function prepareCycleDrawCommitmentPacket(cycles, {
  campaignId = 'bond-the-duck-2026',
  generatedAt = new Date(),
  revealGenerator = generateCycleDrawReveal,
} = {}) {
  const ordered = normalizeCycles(cycles);
  const generated = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  if (!Number.isFinite(generated.getTime())) throw new Error('invalid commitment generation time');
  if (generated.getTime() >= Date.parse(ordered[0].opens_at)) {
    throw new Error('draw commitments must be prepared before campaign opens');
  }

  const privateCycles = ordered.map((cycle) => {
    const revealValue = revealGenerator();
    const commitHash = cycleDrawCommitHash({
      campaignId,
      cycleId: Number(cycle.cycle_id),
      revealValue,
    });
    return {
      cycleId: Number(cycle.cycle_id),
      opensAt: cycle.opens_at,
      closesAt: cycle.closes_at,
      revealValue,
      commitHash,
    };
  });

  const publicPacket = {
    protocolVersion: BOND_DRAW_PROTOCOL_VERSION,
    campaignId,
    generatedAt: generated.toISOString(),
    cycles: privateCycles.map(({ revealValue, ...entry }) => entry),
  };
  publicPacket.packetHash = fingerprint(publicPacket);

  const privatePacket = {
    ...publicPacket,
    privateRevealValues: privateCycles.map(({ cycleId, revealValue }) => ({ cycleId, revealValue })),
  };
  privatePacket.privatePacketHash = fingerprint(privatePacket);

  return { publicPacket, privatePacket };
}

async function blockTimeMs(connection, slot, cache) {
  if (cache.has(slot)) return cache.get(slot);
  const seconds = await connection.getBlockTime(slot);
  const value = Number.isFinite(seconds) ? Number(seconds) * 1000 : null;
  cache.set(slot, value);
  return value;
}

async function finalizedBlock(connection, slot) {
  const block = await connection.getBlock(slot, {
    commitment: 'finalized',
    transactionDetails: 'none',
    rewards: false,
    maxSupportedTransactionVersion: 0,
  });
  if (!block?.blockhash || !Number.isFinite(block?.blockTime)) {
    throw new Error(`finalized block evidence unavailable for slot ${slot}`);
  }
  return {
    slot,
    blockhash: block.blockhash,
    blockTime: new Date(Number(block.blockTime) * 1000).toISOString(),
  };
}

export async function resolveFirstFinalizedBlockAtOrAfter(connection, closesAt, {
  searchWindowSlots = 4_000,
  maxWindows = 8,
  slotDurationMs = 400,
} = {}) {
  const closesMs = Date.parse(closesAt);
  if (!Number.isFinite(closesMs)) throw new Error('invalid cycle close time');
  if (!connection?.getSlot || !connection?.getBlockTime || !connection?.getBlocks || !connection?.getBlock) {
    throw new Error('Solana connection does not support cutoff resolution');
  }

  const latestSlot = await connection.getSlot('finalized');
  const latestTime = await connection.getBlockTime(latestSlot);
  if (!Number.isSafeInteger(latestSlot) || latestSlot <= 0 || !Number.isFinite(latestTime)) {
    throw new Error('latest finalized Solana block is unavailable');
  }
  const latestMs = Number(latestTime) * 1000;
  if (latestMs < closesMs) throw new Error('cycle close is not finalized on Solana yet');

  const estimatedOffset = Math.max(0, Math.ceil((latestMs - closesMs) / slotDurationMs));
  const estimatedSlot = Math.max(1, latestSlot - estimatedOffset);
  const cache = new Map([[latestSlot, latestMs]]);

  for (let windowIndex = 0; windowIndex < maxWindows; windowIndex += 1) {
    const radius = searchWindowSlots * (windowIndex + 1);
    const start = Math.max(1, estimatedSlot - radius);
    const end = Math.min(latestSlot, estimatedSlot + radius);
    const slots = await connection.getBlocks(start, end, 'finalized');
    if (!Array.isArray(slots) || slots.length < 2) continue;

    let low = 0;
    let high = slots.length - 1;
    let binaryFailed = false;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const midTime = await blockTimeMs(connection, slots[mid], cache);
      if (midTime == null) {
        binaryFailed = true;
        break;
      }
      if (midTime >= closesMs) high = mid;
      else low = mid + 1;
    }
    if (binaryFailed) continue;

    let candidateIndex = low;
    let candidateTime = await blockTimeMs(connection, slots[candidateIndex], cache);
    if (candidateTime == null || candidateTime < closesMs) continue;

    while (candidateIndex > 0) {
      const priorTime = await blockTimeMs(connection, slots[candidateIndex - 1], cache);
      if (priorTime == null) break;
      if (priorTime < closesMs) break;
      candidateIndex -= 1;
      candidateTime = priorTime;
    }

    if (candidateIndex === 0) continue;
    const previousSlot = slots[candidateIndex - 1];
    const cutoffSlot = slots[candidateIndex];
    const previous = await finalizedBlock(connection, previousSlot);
    const cutoff = await finalizedBlock(connection, cutoffSlot);

    if (!verifyCycleCutoffBracket({
      closesAt,
      previousSlot: previous.slot,
      previousBlockTime: previous.blockTime,
      cutoffSlot: cutoff.slot,
      cutoffBlockTime: cutoff.blockTime,
    })) {
      continue;
    }

    return {
      resolverVersion: 'first-finalized-block-at-or-after-v1',
      closesAt: new Date(closesMs).toISOString(),
      previousSlot: previous.slot,
      previousBlockhash: previous.blockhash,
      previousBlockTime: previous.blockTime,
      cutoffSlot: cutoff.slot,
      cutoffBlockhash: cutoff.blockhash,
      cutoffBlockTime: cutoff.blockTime,
      resolvedAt: new Date().toISOString(),
    };
  }

  throw new Error('unable to prove deterministic finalized cutoff block');
}

export function publicCommitmentPacketFingerprint(packet) {
  if (!packet || packet.protocolVersion !== BOND_DRAW_PROTOCOL_VERSION
    || !Array.isArray(packet.cycles) || packet.cycles.length !== 5) {
    throw new Error('invalid public commitment packet');
  }
  const copy = structuredClone(packet);
  delete copy.packetHash;
  return fingerprint(copy);
}
