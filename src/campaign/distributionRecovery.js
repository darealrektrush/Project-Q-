const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

function integer(value, label, { min = 0 } = {}) {
  if (!Number.isSafeInteger(value) || value < min) throw new Error(`${label} must be an integer >= ${min}`);
  return value;
}

function baseUnits(value, label) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`${label} must be a canonical non-negative base-unit string`);
  }
  return BigInt(value);
}

function time(value, label) {
  const parsed = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(parsed.getTime())) throw new Error(`${label} must be an ISO timestamp`);
  return parsed;
}

function validateIntervals(intervals) {
  if (!Array.isArray(intervals) || intervals.length === 0
    || intervals.some((value, index) => !Number.isSafeInteger(value) || value <= 0
      || (index > 0 && value <= intervals[index - 1]))) {
    throw new Error('retry intervals must be positive, strictly increasing integer seconds');
  }
  return intervals;
}

function normalizedAttempts(attempts, expectedAmount) {
  if (!Array.isArray(attempts)) throw new Error('payment attempts are required');
  return attempts.map((attempt, index) => {
    const status = String(attempt.status || '').toUpperCase();
    if (!['PROPOSED', 'SUBMITTED', 'CONFIRMED', 'FAILED'].includes(status)) {
      throw new Error('invalid payment attempt status');
    }
    const signature = attempt.signature == null ? null : String(attempt.signature);
    if (signature && !SIGNATURE.test(signature)) throw new Error('invalid Solana transaction signature');
    const amount = baseUnits(attempt.amountBaseUnits, 'attempt amount');
    if (amount !== expectedAmount) throw new Error('payment attempt amount does not match release');
    const attemptedAt = time(attempt.attemptedAt, 'attempted at');
    return { ...attempt, index, status, signature, attemptedAt };
  }).sort((a, b) => a.attemptedAt - b.attemptedAt || a.index - b.index);
}

export function decidePaymentRecovery({
  paymentKey, amountBaseUnits, attempts, now, retryIntervalsSeconds, maxAttempts,
}) {
  if (typeof paymentKey !== 'string' || paymentKey.trim() === '') throw new Error('payment key is required');
  const amount = baseUnits(amountBaseUnits, 'release amount');
  if (amount === 0n) throw new Error('release amount must be positive');
  const observedAt = time(now, 'recovery observation time');
  const intervals = validateIntervals(retryIntervalsSeconds);
  integer(maxAttempts, 'max attempts', { min: 1 });
  if (maxAttempts !== intervals.length + 1) throw new Error('max attempts must equal retry interval count plus one');
  const rows = normalizedAttempts(attempts, amount);
  if (rows.some(({ attemptedAt }) => attemptedAt > observedAt)) {
    throw new Error('payment attempt cannot be later than the recovery observation');
  }

  const confirmed = rows.filter(({ status }) => status === 'CONFIRMED');
  const confirmedSignatures = new Set(confirmed.map(({ signature }) => signature));
  if (confirmed.length > 1 || confirmed.some(({ signature }) => !signature) || confirmedSignatures.size > 1) {
    return { paymentKey, action: 'BLOCK_CONFLICT', reason: 'confirmed payment evidence is ambiguous' };
  }
  if (confirmed.length > 0) {
    return { paymentKey, action: 'COMPLETE', signature: confirmed[0].signature, recovered: rows.length > 1 };
  }

  const latest = rows.at(-1);
  if (!latest) return { paymentKey, action: 'SUBMIT', attemptNumber: 1 };
  if (latest.status === 'PROPOSED') {
    return { paymentKey, action: 'WAIT_FOR_APPROVAL', attemptNumber: rows.length };
  }
  if (latest.signature) {
    return { paymentKey, action: 'RECONCILE_SIGNATURE', signature: latest.signature, attemptNumber: rows.length };
  }
  if (rows.length >= maxAttempts) {
    return { paymentKey, action: 'BLOCK_EXHAUSTED', attemptNumber: rows.length };
  }

  const delaySeconds = intervals[rows.length - 1];
  const retryAt = new Date(latest.attemptedAt.getTime() + delaySeconds * 1000);
  if (observedAt < retryAt) {
    return { paymentKey, action: 'WAIT_RETRY', attemptNumber: rows.length + 1, retryAt: retryAt.toISOString() };
  }
  return { paymentKey, action: 'RETRY', attemptNumber: rows.length + 1 };
}

export function reconcileRecoveryBatch({ releases, attemptsByPaymentKey, now, retryIntervalsSeconds, maxAttempts }) {
  if (!Array.isArray(releases) || releases.length === 0) throw new Error('releases are required');
  if (!attemptsByPaymentKey || typeof attemptsByPaymentKey !== 'object' || Array.isArray(attemptsByPaymentKey)) {
    throw new Error('attempt map is required');
  }
  const keys = new Set();
  const decisions = releases.map((release) => {
    if (keys.has(release.paymentKey)) throw new Error('duplicate release payment key');
    keys.add(release.paymentKey);
    return decidePaymentRecovery({
      ...release, attempts: attemptsByPaymentKey[release.paymentKey] ?? [], now,
      retryIntervalsSeconds, maxAttempts,
    });
  });
  const counts = decisions.reduce((result, { action }) => {
    result[action] = (result[action] ?? 0) + 1;
    return result;
  }, {});
  return {
    releaseCount: releases.length,
    complete: counts.COMPLETE ?? 0,
    actionable: (counts.SUBMIT ?? 0) + (counts.RETRY ?? 0),
    blocked: (counts.BLOCK_CONFLICT ?? 0) + (counts.BLOCK_EXHAUSTED ?? 0),
    decisions,
  };
}
