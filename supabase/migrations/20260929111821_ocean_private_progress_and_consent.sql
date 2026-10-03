-- A saved display choice is consent for a future reviewed program, never a publication job.
alter table public.ocean_recognition_preferences
  add column display_consent_at timestamptz,
  add column display_consent_version text;

alter table public.ocean_recognition_preferences
  add constraint ocean_display_consent_explicit check (
    (display_mode = 'ANONYMOUS' and display_consent_at is null and display_consent_version is null)
    or (display_mode in ('PUBLIC', 'ALIAS') and display_consent_at is not null
      and display_consent_version = 'draft-1')
  );

-- Aggregate across the full receipt ledger: the 30-row personal list is only a view window.
create function public.get_ocean_private_progress(p_profile_id uuid)
returns table (contributions bigint, contribution_days bigint, founder_receipts bigint)
language sql stable security invoker set search_path = '' as $$
  select count(*) filter (where not r.founder_deposit),
    count(distinct ((r.block_time at time zone 'UTC')::date)) filter (where not r.founder_deposit),
    count(*) filter (where r.founder_deposit)
  from public.ocean_contribution_receipts r
  where r.profile_id = p_profile_id;
$$;

revoke all on function public.get_ocean_private_progress(uuid) from public, anon, authenticated;
grant execute on function public.get_ocean_private_progress(uuid) to service_role;

comment on column public.ocean_recognition_preferences.display_consent_at is
  'Member-selected future display preference; no current public publication is authorized.';
