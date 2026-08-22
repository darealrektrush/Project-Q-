import { DEFAULT_CAMPAIGN_ID } from './service.js';

export const EXPECTED_FUNDING_BASE_UNITS = 15_000_000_000_000n;

export const FUNDING_REGISTRY_FIELDS = Object.freeze([
  { key: 'squads_multisig', label: 'Squads 2-of-3 multisig' },
  { key: 'cycle_activation_vault', label: 'Cycle Activation Vault', expected: '1,875,000 FAWKQ' },
  { key: 'scheduled_distribution_vault', label: 'Scheduled Distribution Vault', expected: '13,125,000 FAWKQ' },
  { key: 'community_reserve', label: 'Community Reserve' },
  { key: 'diamond_duck_vault', label: 'Diamond Duck Bonus Vault', expected: '2,500,000 FAWKQ' },
  { key: 'sol_operations_wallet', label: 'SOL Operations Wallet', expected: '0.25 SOL' },
]);

function campaignId(env = process.env) {
  return env.BOND_THE_DUCK_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;
}

function completeRegistryEntry(entry) {
  return Boolean(entry?.value && entry?.owner && entry?.evidence_url);
}

function formatFawkq(baseUnits) {
  const whole = BigInt(baseUnits) / 1_000_000n;
  return new Intl.NumberFormat('en-US').format(whole);
}

export async function getFundingVaultStatus(client, env = process.env) {
  const id = campaignId(env);
  const fields = ['fawkq_mint_decimals', 'founder_funding_wallets', ...FUNDING_REGISTRY_FIELDS.map(({ key }) => key)];
  const [campaignRows, registryRows] = await Promise.all([
    client.select('campaigns', `?id=eq.${encodeURIComponent(id)}&select=id,state,funded_base_units,updated_at&limit=1`),
    client.select(
      'deployment_registry',
      `?campaign_id=eq.${encodeURIComponent(id)}&field=in.(${fields.join(',')})&select=field,value,owner,evidence_url`
    ),
  ]);
  const campaign = campaignRows[0] ?? { state: 'DRAFT', funded_base_units: '0', updated_at: null };
  const entries = Object.fromEntries(registryRows.map((entry) => [entry.field, entry]));
  const fundedBaseUnits = BigInt(campaign.funded_base_units ?? 0);
  const vaults = FUNDING_REGISTRY_FIELDS.map((field) => ({
    ...field,
    registered: Boolean(entries[field.key]?.value),
    evidenced: completeRegistryEntry(entries[field.key]),
    value: entries[field.key]?.value ?? null,
  }));
  const mintReady = completeRegistryEntry(entries.fawkq_mint_decimals);
  const fundingSourcesReady = completeRegistryEntry(entries.founder_funding_wallets);
  const registryReady = mintReady && fundingSourcesReady && vaults.every(({ evidenced }) => evidenced);
  const databaseFundingReady = fundedBaseUnits === EXPECTED_FUNDING_BASE_UNITS;
  const onChainVerified = false;

  return {
    campaignId: id,
    state: campaign.state,
    fundedBaseUnits: fundedBaseUnits.toString(),
    expectedFundingBaseUnits: EXPECTED_FUNDING_BASE_UNITS.toString(),
    databaseFundingReady,
    mintReady,
    fundingSourcesReady,
    registryReady,
    registeredVaultCount: vaults.filter(({ registered }) => registered).length,
    evidencedVaultCount: vaults.filter(({ evidenced }) => evidenced).length,
    totalVaultCount: vaults.length,
    vaults,
    onChainVerified,
    ready: databaseFundingReady && registryReady && onChainVerified,
  };
}

export function buildFundingVaultText(status) {
  const vaultLines = status.vaults.map(({ label, expected, registered, evidenced }) => {
    const icon = evidenced ? '🟡' : registered ? '⚠️' : '🔒';
    const detail = expected ? ` — target ${expected}` : '';
    const state = evidenced ? 'registered + evidence' : registered ? 'address only' : 'missing';
    return `${icon} *${label}*${detail}\n   ${state}`;
  });
  return [
    '💰 *Bond the Duck // Funding & Vaults*',
    '_Read-only evidence dashboard • no transfer controls_',
    '',
    `*Campaign state:* ${status.state}`,
    `${status.databaseFundingReady ? '✅' : '🔒'} *Database funding:* ${formatFawkq(status.fundedBaseUnits)} / 15,000,000 FAWKQ recorded`,
    `${status.mintReady ? '✅' : '🔒'} FAWKQ mint and decimals evidenced`,
    `${status.fundingSourcesReady ? '✅' : '🔒'} Founder funding sources evidenced`,
    `${status.registryReady ? '✅' : '🔒'} Vault registry: ${status.evidencedVaultCount}/${status.totalVaultCount} evidenced`,
    `${status.onChainVerified ? '✅' : '🔒'} Independent on-chain balances verified`,
    '',
    ...vaultLines,
    '',
    status.ready
      ? 'Funding and vault evidence passes every read-only check.'
      : 'Funding remains blocked. Register public vault evidence, then add independent on-chain balance verification.',
  ].join('\n');
}
