import { createHash } from 'node:crypto';

export const REQUIRED_REGISTRY_FIELDS = Object.freeze([
  'registry_version_hash', 'campaign_id_rules_hash', 'campaign_window',
  'fawkq_mint_decimals', 'founder_funding_wallets', 'squads_multisig',
  'cycle_activation_vault', 'scheduled_distribution_vault', 'community_reserve',
  'diamond_duck_vault', 'sol_operations_wallet', 'offline_recovery_public_key',
  'founder_streamflow_contracts', 'actual_unlock_timestamp', 'pump_fun_market',
  'pump_swap_pool_migration', 'approved_secondary_markets', 'pyth_sol_usd_feed',
  'switchboard_sol_usd_feed', 'jupiter_routing_rules', 'rpc_indexer_webhook',
  'project_q_bot_identity', 'oracle_bot_identity', 'supabase_schema_version',
  'announcement_channel', 'dashboard_url', 'reviewer_operator_accounts',
  'website_source_certifications', 'dexscreener_url', 'geckoterminal_url',
  'telegram_bot_certifications', 'winner_position_percentages',
  'buy_to_earn_wallet_cap', 'buy_to_earn_schedule', 'draw_reveal_fallback',
  'payment_retry_intervals', 'priority_fee_ceiling', 'legal_review', 'readiness_report',
]);

const SECRET_FIELD = /(secret|private|seed|mnemonic|service[_ -]?role|api[_ -]?key|token)/i;

function normalizedEntries(entries) {
  if (!Array.isArray(entries)) throw new TypeError('Registry entries must be an array');
  return entries.map(({ field, value, owner, evidence_url: evidenceUrl = null }) => ({
    field, value, owner, evidence_url: evidenceUrl,
  })).sort((a, b) => a.field.localeCompare(b.field));
}

export function validateRegistry(entries, { requireComplete = false } = {}) {
  const normalized = normalizedEntries(entries);
  const seen = new Set();
  for (const entry of normalized) {
    if (!REQUIRED_REGISTRY_FIELDS.includes(entry.field)) throw new Error(`Unknown registry field: ${entry.field}`);
    if (seen.has(entry.field)) throw new Error(`Duplicate registry field: ${entry.field}`);
    if (SECRET_FIELD.test(entry.field)) throw new Error(`Secret-like registry field rejected: ${entry.field}`);
    if (entry.value != null && SECRET_FIELD.test(String(entry.value))) {
      throw new Error(`Secret-like registry value rejected for: ${entry.field}`);
    }
    seen.add(entry.field);
  }
  if (requireComplete) {
    const missing = REQUIRED_REGISTRY_FIELDS.filter((field) => !seen.has(field));
    const blank = normalized.filter((entry) => !entry.value || !entry.owner || !entry.evidence_url).map((entry) => entry.field);
    if (missing.length || blank.length) throw new Error(`Registry incomplete; missing: ${missing.join(', ') || 'none'}; blank: ${blank.join(', ') || 'none'}`);
  }
  return normalized;
}

export function hashRegistry(entries) {
  const normalized = validateRegistry(entries);
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

