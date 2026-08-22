import { DEFAULT_CAMPAIGN_ID } from './service.js';

const EXPECTED_VOTE_SOURCES = 9;
const EXPECTED_EVENT_SOURCES = 4;
const BLOCKED_CLASSIFICATIONS = new Set(['SOURCE_UNAVAILABLE', 'REMOVED_FOR_INTEGRITY']);
const FULL_EVIDENCE_CLASSIFICATIONS = new Set(['MACHINE_VERIFIED', 'PROOF_SUPPORTED']);

function campaignId(env = process.env) {
  return env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
}

function sourceLabel(sourceKey) {
  return String(sourceKey ?? 'unnamed source')
    .replace(/[_-]+/g, ' ')
    .replace(/[*`\[\]()~>#+=|{}.!]/g, '')
    .slice(0, 48);
}

function classificationLabel(classification) {
  return ({
    MACHINE_VERIFIED: 'machine verified',
    PROOF_SUPPORTED: 'proof supported',
    COMMUNITY_PROGRESS_ONLY: 'community progress only',
    SOURCE_UNAVAILABLE: 'unavailable',
    REMOVED_FOR_INTEGRITY: 'removed for integrity',
  })[classification] ?? 'unknown classification';
}

function normalizeSource(row) {
  const blocked = BLOCKED_CLASSIFICATIONS.has(row.classification);
  const fullEvidence = FULL_EVIDENCE_CLASSIFICATIONS.has(row.classification);
  return {
    key: row.source_key,
    label: sourceLabel(row.source_key),
    type: row.source,
    classification: row.classification,
    classificationLabel: classificationLabel(row.classification),
    fullEvidence,
    limitedEvidence: row.classification === 'COMMUNITY_PROGRESS_ONLY',
    blocked,
    health: row.health ?? null,
    checkedAt: row.checked_at ?? null,
  };
}

export async function getVerificationSourceStatus(client, env = process.env) {
  const id = campaignId(env);
  const rows = await client.select(
    'verification_sources',
    `?campaign_id=eq.${encodeURIComponent(id)}&select=source_key,source,classification,cooldown_seconds,health,checked_at&order=source.asc,source_key.asc`
  );
  const sources = rows.map(normalizeSource);
  const votes = sources.filter(({ type }) => type === 'vote');
  const events = sources.filter(({ type }) => type === 'event');
  const invalidTypeCount = sources.length - votes.length - events.length;
  const blockedCount = sources.filter(({ blocked }) => blocked).length;
  const fullEvidenceCount = sources.filter(({ fullEvidence }) => fullEvidence).length;
  const limitedEvidenceCount = sources.filter(({ limitedEvidence }) => limitedEvidence).length;
  const configured = votes.length === EXPECTED_VOTE_SOURCES
    && events.length === EXPECTED_EVENT_SOURCES
    && invalidTypeCount === 0;
  return {
    sources,
    votes,
    events,
    expectedVoteSources: EXPECTED_VOTE_SOURCES,
    expectedEventSources: EXPECTED_EVENT_SOURCES,
    missingVoteSlots: Math.max(0, EXPECTED_VOTE_SOURCES - votes.length),
    missingEventSlots: Math.max(0, EXPECTED_EVENT_SOURCES - events.length),
    invalidTypeCount,
    blockedCount,
    fullEvidenceCount,
    limitedEvidenceCount,
    configured,
    ready: configured && blockedCount === 0,
  };
}

function sourceLine(source) {
  const icon = source.blocked ? '⛔' : source.fullEvidence ? '✅' : source.limitedEvidence ? '🟡' : '⚠️';
  const health = source.health ? ` · health: ${sourceLabel(source.health)}` : '';
  return `${icon} ${source.label} — ${source.classificationLabel}${health}`;
}

export function buildVerificationSourceText(status) {
  const voteLines = status.votes.length ? status.votes.map(sourceLine) : ['🔒 No voting sources configured'];
  const eventLines = status.events.length ? status.events.map(sourceLine) : ['🔒 No bot/event sources configured'];
  return [
    '🔎 *Bond the Duck // Verification Sources*',
    '_Read-only source certification • XP remains disabled_',
    '',
    `${status.votes.length === status.expectedVoteSources ? '✅' : '🔒'} *Voting sites:* ${status.votes.length}/${status.expectedVoteSources}`,
    `${status.events.length === status.expectedEventSources ? '✅' : '🔒'} *Trending bots/events:* ${status.events.length}/${status.expectedEventSources}`,
    `${status.fullEvidenceCount ? '✅' : '🔒'} *Individual-XP evidence:* ${status.fullEvidenceCount} full · ${status.limitedEvidenceCount} limited`,
    `${status.blockedCount ? '⛔' : '✅'} *Blocked or removed:* ${status.blockedCount}`,
    '',
    '*Voting sites*',
    ...voteLines,
    '',
    '*Trending bots/events*',
    ...eventLines,
    '',
    status.ready
      ? 'All 13 source slots are configured without unavailable or integrity-blocked entries.'
      : `Launch gate remains closed: ${status.missingVoteSlots} voting and ${status.missingEventSlots} bot/event slots are still missing.`,
  ].join('\n');
}
