import assert from 'node:assert/strict';
import test from 'node:test';

import { BOND_REHEARSAL_ACK, validateBondRehearsalEnvironment } from '../src/campaign/rehearsalIsolation.js';

test('rehearsal environment accepts explicit isolated devnet configuration', () => {
  const result = validateBondRehearsalEnvironment({
    BOND_REHEARSAL_NETWORK: 'devnet',
    BOND_REHEARSAL_RPC_URL: 'https://api.devnet.solana.com',
    BOND_REHEARSAL_SUPABASE_URL: 'https://example-staging.supabase.co',
    BOND_REHEARSAL_ACK,
  });
  assert.equal(result.ready, true);
  assert.equal(result.mutationsAllowed, true);
  assert.equal(result.productionAssetsAllowed, false);
});

test('rehearsal environment rejects production database, mint, vault and mainnet RPC', () => {
  const result = validateBondRehearsalEnvironment({
    BOND_REHEARSAL_NETWORK: 'devnet',
    BOND_REHEARSAL_RPC_URL: 'https://api.mainnet-beta.solana.com',
    BOND_REHEARSAL_SUPABASE_URL: 'https://hahyactfjpawmapvixow.supabase.co',
    BOND_REHEARSAL_MINT: 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump',
    BOND_REHEARSAL_VAULT: '3z6YpKpgDrUdRuqp1KkJfVhw5X3BRGQzUZhGN8VMNfci',
    BOND_REHEARSAL_ACK,
  });
  assert.equal(result.ready, false);
  assert.equal(result.mutationsAllowed, false);
  assert.ok(result.reasons.length >= 4);
});

test('rehearsal environment fails closed without explicit acknowledgement', () => {
  const result = validateBondRehearsalEnvironment({ BOND_REHEARSAL_NETWORK: 'devnet' });
  assert.equal(result.ready, false);
  assert.match(result.reasons.join('; '), /acknowledgement/);
});
