import assert from 'node:assert/strict';
import test from 'node:test';

import { assertDevDatabaseTarget } from '../src/lib/devDatabaseGuard.js';

test('Project Q Dev only starts with the isolated Dev project URL', () => {
  assert.doesNotThrow(() => assertDevDatabaseTarget({
    RENDER_SERVICE_NAME: 'project-q-dev',
    SUPABASE_URL: 'https://awouccxagxglpvvuznxo.supabase.co/',
  }));
  for (const url of [
    undefined,
    'https://hahyactfjpawmapvixow.supabase.co',
    'https://qubzgbpkajktulhkdllr.supabase.co',
  ]) {
    assert.throws(() => assertDevDatabaseTarget({ RENDER_SERVICE_NAME: 'project-q-dev', SUPABASE_URL: url }), /isolated Project Q Dev/);
  }
  assert.doesNotThrow(() => assertDevDatabaseTarget({
    RENDER_SERVICE_NAME: 'project-q',
    SUPABASE_URL: 'https://hahyactfjpawmapvixow.supabase.co',
  }));
});
