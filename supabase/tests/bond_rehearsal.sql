begin;

select plan(14);

select has_table('public', 'campaigns', 'campaign registry exists');
select has_table('public', 'cycles', 'campaign cycles exist');
select has_table('public', 'allocations', 'campaign allocations exist');
select has_table('public', 'releases', 'release schedule exists');
select has_table('public', 'campaign_cycle_draw_commitments', 'draw commitments exist');
select has_table('public', 'campaign_funding_finalizations', 'funding finalizations exist');
select has_table('public', 'campaign_impact_receipts', 'impact receipts exist');
select is(
  (select count(*)::integer from pg_proc where oid = 'public.schedule_bond_final_cycles(text,text)'::regprocedure),
  1,
  'service-only final five-cycle scheduling operation exists'
);
select is(
  has_function_privilege('authenticated', 'public.schedule_bond_final_cycles(text,text)', 'execute'),
  false,
  'participants cannot reschedule Bond cycles'
);

select is(
  (select state from public.campaigns where id = 'bond-the-duck-2026'),
  'DRAFT',
  'fresh rehearsal keeps Bond the Duck in DRAFT'
);

select is(
  (select funded_base_units::text from public.campaigns where id = 'bond-the-duck-2026'),
  '0',
  'fresh rehearsal never fabricates campaign funding'
);

select is(
  (select count(*)::integer from public.campaign_materializations where campaign_id = 'bond-the-duck-2026'),
  0,
  'fresh rehearsal creates no winner materialization'
);

select is(
  (select count(*)::integer from public.campaign_funding_finalizations where campaign_id = 'bond-the-duck-2026'),
  0,
  'fresh rehearsal creates no funding finalization'
);

select is(
  (select count(*)::integer from public.campaign_impact_receipts where campaign_id = 'bond-the-duck-2026'),
  0,
  'fresh rehearsal creates no impact receipt'
);

select * from finish();
rollback;
