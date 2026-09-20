import { createHash } from 'node:crypto';

import {
  SOURCE_CERTIFICATION_MAX_AGE_MS,
  certificationHealthMatchesClassification,
  sourceCertificationIdempotencyKey,
} from './sourceCertifications.js';

function sourceKind(source) {
  if (source === 'vote') return 'WEBSITE_VOTE';
  if (source === 'event') return 'TELEGRAM_BOT';
  return null;
}

function validHttps(value) {
  try {
    return new URL(String(value || '')).protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildSourceCertificationPackets(
  sourceRows = [],
  evidenceRows = [],
  {
    campaignId = 'bond-the-duck-2026',
    founderUserId,
    checkedAt = new Date(),
    ttlMs = SOURCE_CERTIFICATION_MAX_AGE_MS,
  } = {}
) {
  const checked = new Date(checkedAt);
  if (!Number.isFinite(checked.getTime())) throw new Error('invalid certification checkedAt');
  if (!/^\d+$/.test(String(founderUserId || ''))) throw new Error('founder user id is required');
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || ttlMs > SOURCE_CERTIFICATION_MAX_AGE_MS) {
    throw new Error('invalid certification ttl');
  }

  const evidenceByKey = new Map(
    (evidenceRows || []).map((row) => [String(row?.sourceKey || row?.source_key || '').trim(), row])
  );
  const expiresAt = new Date(checked.getTime() + ttlMs).toISOString();

  return sourceRows.map((source) => {
    const sourceKey = String(source?.source_key || '').trim();
    const classification = String(source?.classification || '').trim();
    const kind = sourceKind(source?.source);
    const evidence = evidenceByKey.get(sourceKey) || null;
    const evidenceUrl = String(evidence?.evidenceUrl || evidence?.evidence_url || '').trim();
    const evidenceHash = String(evidence?.evidenceHash || evidence?.evidence_hash || '').trim();
    const health = String(evidence?.health || '').trim();

    const reasons = [];
    if (!kind) reasons.push('source kind is invalid');
    if (!evidence) reasons.push('evidence is missing');
    if (evidence && !validHttps(evidenceUrl)) reasons.push('evidence URL must be HTTPS');
    if (evidence && !/^[0-9a-f]{64}$/.test(evidenceHash)) reasons.push('evidence hash must be SHA-256');
    if (evidence && !certificationHealthMatchesClassification(classification, health)) {
      reasons.push('health does not match registered classification');
    }

    const status = !evidence ? 'MISSING' : reasons.length ? 'INVALID' : 'READY';
    let idempotencyKey = null;
    if (status === 'READY') {
      idempotencyKey = sourceCertificationIdempotencyKey({
        campaignId,
        sourceKey,
        founderUserId,
        checkedAt: checked.toISOString(),
        evidenceHash,
      });
    }

    return {
      status,
      reasons,
      campaignId,
      sourceKey,
      sourceKind: kind,
      classification,
      health: health || null,
      targetUrl: source?.target_url || null,
      evidenceUrl: evidenceUrl || null,
      evidenceHash: evidenceHash || null,
      checkedAt: checked.toISOString(),
      expiresAt,
      founderUserId: String(founderUserId),
      idempotencyKey,
    };
  });
}

export function summarizeSourceCertificationPackets(packets = []) {
  const counts = packets.reduce((acc, packet) => {
    acc[packet.status] = (acc[packet.status] || 0) + 1;
    return acc;
  }, { READY: 0, MISSING: 0, INVALID: 0 });
  const complete = packets.length === 14 && counts.READY === 14;
  const fingerprint = createHash('sha256').update(JSON.stringify(
    packets.map(({ status, sourceKey, classification, health, evidenceHash, checkedAt, expiresAt }) => ({
      status, sourceKey, classification, health, evidenceHash, checkedAt, expiresAt,
    }))
  )).digest('hex');
  return { complete, counts, fingerprint };
}
