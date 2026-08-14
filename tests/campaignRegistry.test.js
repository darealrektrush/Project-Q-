import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashRegistry, validateRegistry } from '../src/campaign/registry.js';

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

