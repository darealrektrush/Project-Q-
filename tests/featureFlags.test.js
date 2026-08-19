import test from 'node:test';
import assert from 'node:assert/strict';

import {
  distributionEnabled,
  isEnabled,
  requireEnv,
  signalsEnabled,
} from '../src/lib/featureFlags.js';

test('feature flags default to disabled', () => {
  assert.equal(distributionEnabled({}), false);
  assert.equal(signalsEnabled({}), false);
});

test('feature flags require an explicit true value', () => {
  for (const value of ['1', 'true', 'TRUE', 'yes', 'on']) {
    assert.equal(isEnabled(value), true);
  }
  for (const value of [undefined, '', 'false', '0', 'enabled', 'no']) {
    assert.equal(isEnabled(value), false);
  }
});

test('requireEnv reports names without exposing values', () => {
  assert.doesNotThrow(() => requireEnv(['A', 'B'], { A: 'set', B: 'set' }));
  assert.throws(
    () => requireEnv(['A', 'B'], { A: 'secret-value', B: '' }),
    (error) => {
      assert.match(error.message, /B/);
      assert.doesNotMatch(error.message, /secret-value/);
      return true;
    }
  );
});
