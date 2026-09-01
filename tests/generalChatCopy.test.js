import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Signal announcements direct members to General Chat', async () => {
  const source = await readFile(new URL('../src/lib/signal.js', import.meta.url), 'utf8');

  assert.match(source, /Head to General Chat and type \/signal to act on it\./);
  assert.doesNotMatch(source, /Head to (?:fawkq-chat|CrabStar Chat)/i);
});
