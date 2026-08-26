import { createHash } from 'node:crypto';

export const CAMPAIGN_READINESS_REPORT_VERSION = 'bond-readiness-v2';

function byFields(fields) {
  return (left, right) => fields
    .map((field) => String(left?.[field] ?? '').localeCompare(String(right?.[field] ?? '')))
    .find((value) => value !== 0) ?? 0;
}

function normalizeCycles(rows = []) {
  return rows.map((row) => ({
    cycleId: Number(row.cycle_id),
    opensAt: String(row.opens_at || ''),
    closesAt: String(row.closes_at || ''),
  })).sort(byFields(['cycleId']));
}

function normalizeSources(rows = []) {
  return rows.map((row) => ({
    sourceKey: String(row.source_key || ''),
    source: String(row.source || ''),
    classification: String(row.classification || ''),
    targetUrl: String(row.target_url || ''),
  })).sort(byFields(['sourceKey']));
}

function normalizeSourceCertifications(rows = []) {
  return rows.map((row) => ({
    sourceKey: String(row.source_key || ''),
    sourceKind: String(row.source_kind || ''),
    classification: String(row.classification || ''),
    health: String(row.health || ''),
    evidenceHash: String(row.evidence_hash || ''),
    checkedAt: String(row.checked_at || ''),
    expiresAt: String(row.expires_at || ''),
  })).sort(byFields(['sourceKey', 'checkedAt', 'evidenceHash']));
}

function normalizeBurnSources(rows = []) {
  return rows.map((row) => ({
    sourceType: String(row.source_type || ''),
    approved: Boolean(row.approved),
    evidenceUrl: String(row.evidence_url || ''),
    verifiedAt: String(row.verified_at || ''),
  })).sort(byFields(['sourceType', 'evidenceUrl']));
}

function normalizeBurnMilestones(rows = []) {
  return rows.map((row) => ({
    id: String(row.id || ''),
    rulesHash: String(row.rules_hash || ''),
    progressTargetUnits: String(row.progress_target_units || ''),
    burnAmountBaseUnits: String(row.burn_amount_base_units || ''),
    state: String(row.state || ''),
  })).sort(byFields(['id']));
}

export function createCampaignReadinessReport({
  campaignId,
  campaign,
  checks = [],
  cycles = [],
  sources = [],
  sourceCertifications = [],
  registryHash = null,
  burnProgram = null,
  burnSources = [],
  burnFounders = [],
  burnMilestones = [],
  flags = {},
} = {}) {
  const report = {
    version: CAMPAIGN_READINESS_REPORT_VERSION,
    campaignId: String(campaignId || ''),
    campaign: {
      state: String(campaign?.state || 'DRAFT'),
      rulesetVersion: Number(campaign?.ruleset_version || 0),
      rulesHash: String(campaign?.rules_hash || ''),
      fundedBaseUnits: String(campaign?.funded_base_units || '0'),
    },
    cycles: normalizeCycles(cycles),
    sources: normalizeSources(sources),
    sourceCertifications: normalizeSourceCertifications(sourceCertifications),
    registryHash: registryHash && /^[0-9a-f]{64}$/.test(registryHash) ? registryHash : null,
    burnProgram: burnProgram ? {
      id: String(burnProgram.id || ''),
      state: String(burnProgram.state || ''),
      mint: String(burnProgram.mint || ''),
      tokenProgramId: String(burnProgram.token_program_id || ''),
      decimals: Number(burnProgram.decimals || 0),
      rulesHash: String(burnProgram.rules_hash || ''),
      hardCapBaseUnits: String(burnProgram.hard_cap_base_units || '0'),
      maxSingleBurnBaseUnits: String(burnProgram.max_single_burn_base_units || '0'),
    } : null,
    burnSources: normalizeBurnSources(burnSources),
    burnFounders: burnFounders.map(({ founder_user_id: founderUserId }) => String(founderUserId)).sort(),
    burnMilestones: normalizeBurnMilestones(burnMilestones),
    flags: Object.fromEntries(Object.entries(flags).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, Boolean(value)])),
    checks: checks.map(({ key, ready }) => ({ key: String(key), ready: Boolean(ready) }))
      .sort(byFields(['key'])),
  };
  const reportHash = createHash('sha256').update(JSON.stringify(report)).digest('hex');
  return { reportVersion: CAMPAIGN_READINESS_REPORT_VERSION, reportHash, report };
}
