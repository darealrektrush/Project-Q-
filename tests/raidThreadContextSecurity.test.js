import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260908011500_secure_raid_thread_context.sql',
);

test('Oracle raid thread routing is service-only and RLS protected', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');

  assert.match(
    migration,
    /alter table public\.raid_thread_context enable row level security/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.raid_thread_context[\s\S]+from public, anon, authenticated/i,
  );
  assert.doesNotMatch(migration, /create policy/i);
  assert.doesNotMatch(migration, /grant\s+.+\s+to\s+(?:public|anon|authenticated)/i);
});
