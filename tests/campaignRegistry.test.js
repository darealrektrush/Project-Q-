import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commitDeploymentRegistry, hashRegistry, REQUIRED_REGISTRY_FIELDS, validateRegistry } from '../src/campaign/registry.js';

const entries = [
  { field: 'campaign_id_rules_hash', value: 'bond-the-duck-2026:abc', owner: 'development', evidence_url: 'https://example.com/a' },
  { field: 'dashboard_url', value: 'https://example.com/dashboard', owner: 'development', evidence_url: 'https://example.com/b' },
];

test('registry hash is stable across entry order', () => {
  assert.equal(hashRegistry(entries), hashRegistry([...entries].reverse()));
});

test('registry rejects duplicates and unknown or secret-like fields', () => {
  assert.throws(() => validateRegistry([...entries, entries[0]]), /Duplicate/);
  assert.throws(() => validateRegistry([{ field: 'treasury_private_key', value: 'x' }]), /Unknown/);
  assert.throws(() => validateRegistry([{ field: 'dashboard_url', value: 'service_role secret', owner: 'x' }]), /Secret-like/);
});

test('complete mode fails closed until Appendix B is fully evidenced', () => {
  assert.throws(() => validateRegistry(entries, { requireComplete: true }), /Registry incomplete/);
});

test('registry allows legitimate public token metadata such as Token-2022', () => {
  const rows = validateRegistry([{
    field: 'fawkq_mint_decimals',
    value: 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump:6:Token-2022',
    owner: 'development',
    evidence_url: 'https://example.com/token-metadata',
  }]);
  assert.equal(rows[0].value.includes('Token-2022'), true);
});



function completeRegistry() {
  return REQUIRED_REGISTRY_FIELDS.map((field) => ({
    field,
    value: `verified-${field}`,
    owner: 'operations',
    evidence_url: `https://example.com/${field}`,
  }));
}

test('atomic registry helper validates, hashes and calls one service RPC', async () => {
  const calls = [];
  const registry = completeRegistry();
  const expectedHash = hashRegistry(registry);
  const client = {
    async rpc(fn, args) {
      calls.push({ fn, args });
      return [{
        version: 1,
        registryHash: expectedHash,
        fieldCount: REQUIRED_REGISTRY_FIELDS.length,
        replayed: false,
      }];
    },
  };
  const result = await commitDeploymentRegistry(client, { version: 1, entries: registry });
  assert.equal(result.registryHash, expectedHash);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].fn, 'commit_campaign_deployment_registry');
  assert.equal(calls[0].args.p_version, 1);
  assert.equal(calls[0].args.p_entries.length, REQUIRED_REGISTRY_FIELDS.length);
  assert.equal(calls[0].args.p_registry_hash, expectedHash);
});

test('atomic registry helper refuses incomplete evidence before database mutation', async () => {
  let called = false;
  const client = { rpc: async () => { called = true; } };
  await assert.rejects(
    commitDeploymentRegistry(client, { version: 1, entries }),
    /Registry incomplete/
  );
  assert.equal(called, false);
});

test('atomic registry helper fails closed when database result does not reconcile', async () => {
  const registry = completeRegistry();
  const client = { rpc: async () => [{ version: 1, registryHash: 'f'.repeat(64), fieldCount: 34 }] };
  await assert.rejects(
    commitDeploymentRegistry(client, { version: 1, entries: registry }),
    /did not reconcile/
  );
});

test('atomic registry migration is complete, service-only and never activates Bond', async () => {
  const sql = await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('../supabase/migrations/20260920070000_atomic_deployment_registry_commit.sql', import.meta.url), 'utf8')
  );
  assert.match(sql, /jsonb_array_length\(p_entries\) <> array_length\(required_fields, 1\)/);
  assert.match(sql, /campaign_row\.state not in \('DRAFT','READINESS_BLOCKED','FUNDED'\)/);
  assert.match(sql, /update public\.campaigns[\s\S]*registry_version = p_version/);
  assert.match(sql, /grant execute on function public\.commit_campaign_deployment_registry/);
  assert.doesNotMatch(sql, /grant\s+.*\s+to\s+(anon|authenticated)/i);
  assert.doesNotMatch(sql, /state\s*=\s*'ACTIVE'/i);
});
