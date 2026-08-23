const SYSTEMS = Object.freeze([
  {
    key: 'app',
    label: 'Campaign App',
    envKey: 'PROJECT_Q_CAMPAIGN_APP_ENABLED',
    effect: 'Participant campaign access',
  },
  {
    key: 'wallet',
    label: 'Wallet Verification',
    envKey: 'PROJECT_Q_WALLET_VERIFICATION_ENABLED',
    effect: 'Signed-wallet eligibility checks',
  },
  {
    key: 'settlement',
    label: 'Campaign XP Settlement',
    envKey: 'PROJECT_Q_CAMPAIGN_XP_SETTLEMENT_ENABLED',
    effect: 'Verified XP crediting',
  },
]);

function enabled(value) {
  return value === 'true';
}

export function getLaunchSystemStatus(env = process.env) {
  const systems = SYSTEMS.map((system) => ({
    ...system,
    enabled: enabled(env[system.envKey]),
  }));
  return {
    systems,
    enabledCount: systems.filter((system) => system.enabled).length,
    totalCount: systems.length,
    ready: systems.every((system) => system.enabled),
  };
}

export function buildLaunchSystemText(status) {
  return [
    '⚙️ *Bond the Duck // Launch Systems*',
    '_Read-only production safety switches_',
    '',
    `*Enabled:* ${status.enabledCount}/${status.totalCount}`,
    '',
    ...status.systems.map(({ label, effect, enabled: isEnabled }) => [
      `${isEnabled ? '✅' : '🔒'} *${label}*`,
      `${effect} · ${isEnabled ? 'enabled' : 'disabled'}`,
    ].join('\n')),
    '',
    status.ready
      ? 'All launch systems are enabled. Readiness still requires the remaining campaign evidence.'
      : 'These switches remain fail-closed. They must be enabled through a reviewed deployment after their dependencies pass.',
    '',
    '_No switch can be changed from this screen._',
  ].join('\n');
}
