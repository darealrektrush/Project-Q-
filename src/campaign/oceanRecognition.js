// Draft recognition rules only. No caller may settle XP, issue badges, or
// publish contributors until an append-only contribution ledger and pricing
// evidence are deployed and the campaign rules have been approved.
export const OCEAN_RECOGNITION_VERSION = 'proposal-1';
export const OCEAN_TIERS = Object.freeze([
  { key: 'supporter', title: 'Ocean Supporter', days: 1 },
  { key: 'protector', title: 'Ocean Protector', days: 3 },
  { key: 'guardian', title: 'Ocean Guardian', days: 10 },
  { key: 'steward', title: 'Ocean Steward', days: 25 },
]);
export const OCEAN_BADGES = Object.freeze([
  { key: 'first', title: 'First Contributor', requirement: 'First verified vault contribution' },
  { key: 'repeat', title: 'Repeat Contributor', requirement: 'Verified contributions on three separate days' },
  { key: 'campaign', title: 'Campaign Contributor', requirement: 'A verified contribution during an active campaign' },
]);

function day(value) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error('invalid verified contribution date');
  return parsed.toISOString().slice(0, 10);
}

export function summarizeOceanContributor(receipts, { now = new Date() } = {}) {
  if (!Array.isArray(receipts)) throw new Error('verified receipts required');
  const unique = new Set();
  const dates = new Set();
  let campaignCount = 0;
  for (const receipt of receipts) {
    if (receipt?.status !== 'VERIFIED' || !receipt.signature || !receipt.asset || !receipt.verifiedAt) continue;
    const id = `${receipt.signature}:${receipt.asset}`;
    if (unique.has(id)) continue;
    unique.add(id);
    dates.add(day(receipt.verifiedAt));
    if (receipt.campaignEligible === true) campaignCount += 1;
  }
  const today = day(now);
  const currentCampaignDays = [...dates].filter((value) => value <= today);
  const tier = [...OCEAN_TIERS].reverse().find((entry) => currentCampaignDays.length >= entry.days) || null;
  const badgeKeys = [
    ...(unique.size > 0 ? ['first'] : []),
    ...(dates.size >= 3 ? ['repeat'] : []),
    ...(campaignCount > 0 ? ['campaign'] : []),
  ];
  return { contributions: unique.size, days: dates.size, tier: tier?.key || null, badgeKeys, campaignCount };
}

// USD ranking requires timestamped, independently recorded price evidence.
// This board orders by participation days, so an asset's raw units cannot
// silently decide a cross-asset ranking. All three publicity choices preserve
// totals; anonymous contributors have no identifying public row.
export function oceanCommunityBoard(contributors, { limit = 20 } = {}) {
  if (!Array.isArray(contributors)) throw new Error('contributors required');
  return contributors
    .filter((entry) => entry?.type === 'COMMUNITY' && ['PUBLIC', 'ALIAS'].includes(entry.visibility)
      && entry.summary?.contributions > 0)
    .map((entry) => ({
      name: entry.visibility === 'ALIAS' ? String(entry.alias || '').trim() : String(entry.publicName || '').trim(),
      days: entry.summary.days, contributions: entry.summary.contributions, tier: entry.summary.tier,
    }))
    .filter((entry) => entry.name.length > 0 && entry.name.length <= 64)
    .sort((a, b) => b.days - a.days || b.contributions - a.contributions || a.name.localeCompare(b.name))
    .slice(0, Math.min(Math.max(1, limit), 100));
}

// Proposed campaign XP policy: at most one qualified donation each Vancouver campaign day;
// 4 base XP, with a repeat-days boost, capped at 12 XP per campaign. The
// campaign's 75/day cap still applies and Oracle lifetime XP is separate.
// Do not invoke this in settlement until a price floor and governance exist.
export function proposedOceanXp({ daysBefore = 0, awardedThisCampaign = 0, qualifiedByPrice = false } = {}) {
  if (!qualifiedByPrice) return { amount: 0, reason: 'price_evidence_pending' };
  const points = daysBefore >= 5 ? 6 : daysBefore >= 1 ? 5 : 4;
  const amount = Math.max(0, Math.min(points, 12 - Math.max(0, awardedThisCampaign)));
  return { amount, reason: amount ? null : 'campaign_cap_reached' };
}
