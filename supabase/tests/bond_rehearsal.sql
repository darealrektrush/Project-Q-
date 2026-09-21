begin;

select plan(12);

select has_table('public', 'campaigns', 'campaign registry exists');
select has_table('public', 'cycles', 'campaign cycles exist');
select has_table('public', 'campaign_allocations', 'campaign allocations exist');
select has_table('public', 'campaign_release_schedule', 'release schedule exists');
select has_table('public', 'campaign_cycle_draw_commitments', 'draw commitments exist');
select has_table('public', 'campaign_funding_finalizations', 'funding finalizations exist');
select has_table('public', 'campaign_impact_receipts', 'impact receipts exist');

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
