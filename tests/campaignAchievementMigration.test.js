import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260930193800_campaign_achievement_records.sql', import.meta.url),
  'utf8'
);
const standingMigration = readFileSync(
  new URL('../supabase/migrations/20261001041100_finalize_campaign_standing_achievements.sql', import.meta.url),
  'utf8'
);

test('achievement receipts are private, profile-linked and append-only', () => {
  assert.match(migration, /create table if not exists public\.campaign_achievement_records/i);
  assert.match(migration, /foreign key \(campaign_id, profile_id\)[\s\S]*references public\.identity_links\(campaign_id, profile_id\)/i);
  assert.match(migration, /unique \(campaign_id, profile_id, operation_key, achievement_id\)/i);
  assert.match(migration, /alter table public\.campaign_achievement_records enable row level security/i);
  assert.match(migration, /revoke all on public\.campaign_achievement_records from public, anon, authenticated/i);
  assert.match(migration, /before update or delete on public\.campaign_achievement_records/i);
});

test('final standings create rarity-backed receipts only on the completed transition', () => {
  assert.match(standingMigration, /after update of state on public\.campaigns/i);
  assert.match(standingMigration, /when \(new\.state = 'COMPLETED' and old\.state is distinct from new\.state\)/i);
  assert.match(standingMigration, /identity\.x_verified_at is not null/i);
  assert.match(standingMigration, /row_number\(\) over \(order by campaign_xp desc, telegram_user_id asc\)/i);
  assert.match(standingMigration, /'top-10-percent'[\s\S]*'top-5-percent'[\s\S]*'top-1-percent'[\s\S]*'top-100'[\s\S]*'champion'/i);
  assert.match(standingMigration, /holder_share_percent/i);
  assert.match(standingMigration, /when counts\.holder_count::numeric \/ award\.eligible_participant_count <= 0\.01 then 'legendary'/i);
  assert.match(standingMigration, /on conflict \(campaign_id, profile_id, operation_key, achievement_id\) do nothing/i);
});

test('only positive settled XP writes a verified receipt and Universal Profile outbox event', () => {
  assert.match(migration, /if new\.amount <= 0 or new\.profile_id is null then return new/i);
  assert.match(migration, /'xp-earned'[\s\S]*'settled_xp_ledger'[\s\S]*new\.awarded_at/i);
  assert.match(migration, /'xp', 'standard', 'bond-xp-earned-v1'/i);
  assert.match(migration, /after insert on public\.xp_ledger/i);
  assert.match(migration, /'campaign\.achievement\.earned:' \|\| new\.record_id::text/i);
  assert.match(migration, /'campaign\.achievement\.earned'/i);
  assert.match(migration, /'campaign_achievement', new\.record_id::text/i);
  assert.match(migration, /on conflict \(event_key\) do nothing/i);
});
