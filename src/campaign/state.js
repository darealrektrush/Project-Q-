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
  if (from === 'PAUSED' && options.founderApprovals !== 2) {
    throw new Error('Resuming a paused campaign requires two founder approvals');
  }
  if ((to === 'PAUSED' || to === 'TERMINATED') && options.authorizedSigners !== 2 && !options.automaticSecurityPause) {
    throw new Error(`${to} requires two authorized signers`);
  }
  return true;
}

