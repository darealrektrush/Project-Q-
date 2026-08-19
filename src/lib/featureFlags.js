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

