export const BOND_DRAW_READINESS_PROTOCOL = 'bond-draw-v1';

const HASH = /^[0-9a-f]{64}$/;

export function evaluateBondDrawCommitments(
  cycleRows = [],
  commitmentRows = [],
  campaignId = 'bond-the-duck-2026'
) {
  const cycles = new Map();
  const cycleErrors = [];
  for (const row of cycleRows) {
    const cycleId = Number(row?.cycle_id);
    const opensAt = Date.parse(row?.opens_at ?? '');
    if (!Number.isInteger(cycleId) || cycleId < 1 || cycleId > 5 || !Number.isFinite(opensAt)) {
      cycleErrors.push('invalid cycle row');
      continue;
    }
    if (cycles.has(cycleId)) {
      cycleErrors.push(`duplicate cycle ${cycleId}`);
      continue;
    }
    cycles.set(cycleId, { ...row, opensAt });
  }

  const commitments = new Map();
  const commitmentErrors = [];
  for (const row of commitmentRows) {
    const cycleId = Number(row?.cycle_id);
    const committedAt = Date.parse(row?.committed_at ?? '');
    const commitHash = String(row?.commit_hash ?? '');
    const protocolVersion = String(row?.protocol_version ?? '');
    if (String(row?.campaign_id ?? '') !== String(campaignId)) {
      commitmentErrors.push(`cycle ${cycleId || '?'} campaign mismatch`);
      continue;
    }
    if (!Number.isInteger(cycleId) || cycleId < 1 || cycleId > 5) {
      commitmentErrors.push('invalid commitment cycle id');
      continue;
    }
    if (commitments.has(cycleId)) {
      commitmentErrors.push(`duplicate commitment cycle ${cycleId}`);
      continue;
    }
    if (protocolVersion !== BOND_DRAW_READINESS_PROTOCOL) {
      commitmentErrors.push(`cycle ${cycleId} protocol mismatch`);
      continue;
    }
    if (!HASH.test(commitHash)) {
      commitmentErrors.push(`cycle ${cycleId} commitment hash invalid`);
      continue;
    }
    if (!Number.isFinite(committedAt)) {
      commitmentErrors.push(`cycle ${cycleId} committed_at invalid`);
      continue;
    }
    commitments.set(cycleId, { ...row, committedAt, commitHash, protocolVersion });
  }

  const blockers = [...cycleErrors, ...commitmentErrors];
  for (let cycleId = 1; cycleId <= 5; cycleId += 1) {
    const cycle = cycles.get(cycleId);
    const commitment = commitments.get(cycleId);
    if (!cycle) {
      blockers.push(`cycle ${cycleId} schedule missing`);
      continue;
    }
    if (!commitment) {
      blockers.push(`cycle ${cycleId} draw commitment missing`);
      continue;
    }
    if (commitment.committedAt >= cycle.opensAt) {
      blockers.push(`cycle ${cycleId} commitment was not recorded before cycle open`);
    }
  }

  const normalized = [...commitments.values()]
    .map((row) => ({
      campaign_id: String(row.campaign_id),
      cycle_id: Number(row.cycle_id),
      protocol_version: String(row.protocol_version),
      commit_hash: String(row.commit_hash),
      committed_at: new Date(row.committedAt).toISOString(),
    }))
    .sort((a, b) => a.cycle_id - b.cycle_id);

  return {
    ready: cycles.size === 5 && commitments.size === 5 && blockers.length === 0,
    expectedCount: 5,
    commitmentCount: commitments.size,
    blockers,
    commitments: normalized,
  };
}
