const PRODUCTION_SUPABASE_REF = 'hahyactfjpawmapvixow';
const PRODUCTION_MINT = 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump';
const PRODUCTION_VAULT = '3z6YpKpgDrUdRuqp1KkJfVhw5X3BRGQzUZhGN8VMNfci';
const REQUIRED_ACK = 'TEST_ONLY_NO_PRODUCTION_ASSETS';

function value(env, name) {
  return String(env[name] || '').trim();
}

export function validateBondRehearsalEnvironment(env = process.env) {
  const reasons = [];
  const network = value(env, 'BOND_REHEARSAL_NETWORK').toLowerCase();
  const rpcUrl = value(env, 'BOND_REHEARSAL_RPC_URL');
  const supabaseUrl = value(env, 'BOND_REHEARSAL_SUPABASE_URL');
  const mint = value(env, 'BOND_REHEARSAL_MINT');
  const vault = value(env, 'BOND_REHEARSAL_VAULT');

  if (!['devnet', 'localnet'].includes(network)) reasons.push('network must be devnet or localnet');
  if (value(env, 'BOND_REHEARSAL_ACK') !== REQUIRED_ACK) reasons.push('explicit test-only acknowledgement is required');
  if (rpcUrl && !/^https?:\/\//.test(rpcUrl)) reasons.push('rehearsal RPC URL must be HTTP(S)');
  if (/mainnet/i.test(rpcUrl)) reasons.push('mainnet RPC is forbidden for rehearsal');
  if (network === 'devnet' && rpcUrl && !/devnet/i.test(rpcUrl)) reasons.push('devnet RPC URL must identify devnet');
  if (network === 'localnet' && rpcUrl && !/(127\.0\.0\.1|localhost)/i.test(rpcUrl)) {
    reasons.push('localnet RPC URL must be loopback');
  }
  if (supabaseUrl && supabaseUrl.includes(PRODUCTION_SUPABASE_REF)) {
    reasons.push('production Supabase is forbidden for rehearsal');
  }
  if (mint === PRODUCTION_MINT) reasons.push('production FAWKQ mint is forbidden for rehearsal');
  if (vault === PRODUCTION_VAULT) reasons.push('production Squads vault is forbidden for rehearsal');

  return {
    ready: reasons.length === 0,
    reasons,
    network: network || null,
    rpcUrl: rpcUrl || (network === 'devnet' ? 'https://api.devnet.solana.com' : 'http://127.0.0.1:8899'),
    mutationsAllowed: reasons.length === 0 && ['devnet', 'localnet'].includes(network),
    productionAssetsAllowed: false,
  };
}

export const BOND_REHEARSAL_ACK = REQUIRED_ACK;
