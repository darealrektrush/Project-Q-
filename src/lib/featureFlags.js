const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function isEnabled(value) {
  return TRUE_VALUES.has(String(value ?? '').trim().toLowerCase());
}

export function requireEnv(names, env = process.env) {
  const missing = names.filter((name) => !String(env[name] ?? '').trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function distributionEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_DISTRIBUTIONS_ENABLED);
}

export function signalsEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_SIGNALS_ENABLED);
}

export function earnToBurnEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_EARN_TO_BURN_ENABLED);
}

export function burnVerificationEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_BURN_VERIFICATION_ENABLED);
}

export function campaignReadinessApprovalsEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_CAMPAIGN_READINESS_APPROVALS_ENABLED);
}

export function campaignRulesGovernanceEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_CAMPAIGN_RULES_GOVERNANCE_ENABLED);
}

export function sourceCertificationEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_SOURCE_CERTIFICATION_ENABLED);
}

export function websiteVoteReviewEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_WEBSITE_VOTE_REVIEW_ENABLED);
}

export function telegramTrendingReceiptsEnabled(env = process.env) {
  return isEnabled(env.PROJECT_Q_TRENDING_RECEIPTS_ENABLED);
}
