import { createHash } from 'node:crypto';

export const CAMPAIGN_STATES = Object.freeze([
  'DRAFT',
  'READINESS_BLOCKED',
  'FUNDED',
  'SCHEDULED',
  'ACTIVE',
  'VERIFYING',
  'ALLOCATIONS_FROZEN',
  'DISTRIBUTING',
  'COMPLETED',
  'ARCHIVED',
  'PAUSED',
  'TERMINATED',
]);

const NORMAL_TRANSITIONS = Object.freeze({
  DRAFT: ['READINESS_BLOCKED'],
  READINESS_BLOCKED: ['FUNDED'],
  FUNDED: ['SCHEDULED'],
  SCHEDULED: ['ACTIVE'],
  ACTIVE: ['VERIFYING'],
  VERIFYING: ['ALLOCATIONS_FROZEN'],
  ALLOCATIONS_FROZEN: ['DISTRIBUTING'],
  DISTRIBUTING: ['COMPLETED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
  PAUSED: [],
  TERMINATED: ['ARCHIVED'],
});

const PAUSABLE_STATES = new Set([
  'READINESS_BLOCKED', 'FUNDED', 'SCHEDULED', 'ACTIVE', 'VERIFYING',
  'ALLOCATIONS_FROZEN', 'DISTRIBUTING',
]);
const TERMINABLE_STATES = new Set([...PAUSABLE_STATES, 'PAUSED']);

const REQUIRED_EXIT_EVIDENCE = Object.freeze({
  'DRAFT->READINESS_BLOCKED': ['rulesHash', 'rulesetVersion'],
  'READINESS_BLOCKED->FUNDED': ['fundedBaseUnits', 'expectedFundedBaseUnits', 'activationVaultBaseUnits', 'scheduledVaultBaseUnits', 'solOperationsLamports', 'vaultsVerifiedAt'],
  'FUNDED->SCHEDULED': ['registryHash', 'sourcesCertifiedAt', 'publicTimesPublishedAt'],
  'SCHEDULED->ACTIVE': ['readinessReportHash', 'founderApprovals'],
  'ACTIVE->VERIFYING': ['campaignClosedAt', 'cutoffSlot'],
  'VERIFYING->ALLOCATIONS_FROZEN': ['manifestHash', 'appealsClosedAt', 'verificationCompleteAt'],
  'ALLOCATIONS_FROZEN->DISTRIBUTING': ['proposalRef', 'founderApprovals'],
  'DISTRIBUTING->COMPLETED': ['reconciliationHash'],
  'COMPLETED->ARCHIVED': ['closeoutHash', 'founderApprovals'],
  'TERMINATED->ARCHIVED': ['closeoutHash', 'founderApprovals'],
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
    );
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError('Ruleset contains a non-finite number');
  }
  return value;
}

export function canonicalJson(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Ruleset must be a JSON object');
  }
  return JSON.stringify(canonicalize(value));
}

export function hashRuleset(rules) {
  return createHash('sha256').update(canonicalJson(rules)).digest('hex');
}

export function canTransition(from, to, { resumeState } = {}) {
  if (!CAMPAIGN_STATES.includes(from) || !CAMPAIGN_STATES.includes(to) || from === to) return false;
  if (to === 'PAUSED') return PAUSABLE_STATES.has(from);
  if (to === 'TERMINATED') return TERMINABLE_STATES.has(from);
  if (from === 'PAUSED') return Boolean(resumeState && to === resumeState && PAUSABLE_STATES.has(to));
  return NORMAL_TRANSITIONS[from].includes(to);
}

export function assertTransition(from, to, options = {}) {
  if (!canTransition(from, to, options)) {
    throw new Error(`Invalid campaign state transition: ${from} -> ${to}`);
  }
  const evidence = options.evidence;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence) || Object.keys(evidence).length === 0) {
    throw new Error(`Transition ${from} -> ${to} requires exit evidence`);
  }
  const required = REQUIRED_EXIT_EVIDENCE[`${from}->${to}`] ?? [];
  const missing = required.filter((field) => evidence[field] === undefined || evidence[field] === null || evidence[field] === '');
  if (missing.length) throw new Error(`Transition ${from} -> ${to} missing evidence: ${missing.join(', ')}`);
  if (to === 'FUNDED') {
    const funded = BigInt(evidence.fundedBaseUnits);
    const expected = BigInt(evidence.expectedFundedBaseUnits);
    const activation = BigInt(evidence.activationVaultBaseUnits);
    const scheduled = BigInt(evidence.scheduledVaultBaseUnits);
    if (funded !== expected || funded !== activation + scheduled || scheduled !== activation * 7n) {
      throw new Error('FUNDED evidence does not reconcile to the locked 1:7 vault allocation');
    }
    if (BigInt(evidence.solOperationsLamports) !== 250_000_000n) {
      throw new Error('FUNDED requires exactly 0.25 SOL in the operations wallet');
    }
  }
  if (from !== 'PAUSED' && ['ACTIVE', 'DISTRIBUTING', 'ARCHIVED'].includes(to) && evidence.founderApprovals !== 2) {
    throw new Error(`${to} requires two founder approvals in exit evidence`);
  }
  if (from === 'PAUSED' && options.founderApprovals !== 2) {
    throw new Error('Resuming a paused campaign requires two founder approvals');
  }
  if ((to === 'PAUSED' || to === 'TERMINATED') && options.authorizedSigners !== 2 && !options.automaticSecurityPause) {
    throw new Error(`${to} requires two authorized signers`);
  }
  return true;
}
