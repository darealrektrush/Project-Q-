// Generates a disposable pgTAP integration test from the reviewed rules draft.
// This file only writes test SQL; it never connects to a database.
import { readFile, writeFile } from 'node:fs/promises';

import { prepareBondFinalRulesPacket } from '../src/campaign/finalRulesPacket.js';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('test SQL output path is required');
const draft = JSON.parse(await readFile(new URL('../config/bond-the-duck-rules-v1.json', import.meta.url), 'utf8'));
const packet = prepareBondFinalRulesPacket({
  campaign: { state: 'DRAFT', ruleset_version: 3 },
  reviewedDraft: draft,
  activeOpensAt: '2030-01-01T16:00:00.000Z',
  xInviteMainPostId: '1234567890123456789', // disposable test fixture only
  now: new Date('2026-09-25T00:00:00Z'),
});
const quoted = (value) => `'${String(value).replaceAll("'", "''")}'`;
const hash = quoted(packet.rulesHash);
const rules = quoted(JSON.stringify(packet.rules));
const sql = `begin;
select plan(8);
select is((select count(*)::integer from public.cycles where campaign_id='bond-the-duck-2026'), 7, 'historical draft has seven old cycles');
insert into public.ruleset_versions(campaign_id,version,rules_json,rules_hash)
  values('bond-the-duck-2026',4,${rules}::jsonb,${hash});
update public.campaigns set ruleset_version=4,rules_hash=${hash}
  where id='bond-the-duck-2026';
select is((public.schedule_bond_final_cycles('bond-the-duck-2026',${hash})->>'cycleCount')::integer,
  5,'approved final rules materialize five cycles');
select is((select count(*)::integer from public.cycles where campaign_id='bond-the-duck-2026'),
  5,'the two stale cycles are removed');
select is((select min(opens_at)::text from public.cycles where campaign_id='bond-the-duck-2026'),
  '2030-01-01 16:00:00+00','the exact approved start is used');
select is((public.schedule_bond_final_cycles('bond-the-duck-2026',${hash})->>'replayed'),
  'true','exact schedule retry is idempotent');
update public.cycles set allocation_base_units=1
  where campaign_id='bond-the-duck-2026' and cycle_id=1;
select throws_ok(
  $$select public.schedule_bond_final_cycles('bond-the-duck-2026',${packet.rulesHash});$$,
  'refusing to replace Bond cycles after campaign evidence exists',
  'allocated campaign cycles cannot be rescheduled'
);
select is((select count(*)::integer from public.cycles where campaign_id='bond-the-duck-2026'),
  5,'failed rescheduling keeps the existing cycles');
select is((select count(*)::integer from public.campaign_cycle_draw_commitments where campaign_id='bond-the-duck-2026'),
  0,'scheduling creates no draw commitments');
select * from finish();
rollback;
`;
await writeFile(outputPath, sql, { flag: 'wx', mode: 0o600 });
console.log(`Generated disposable Bond schedule test at ${outputPath}`);
