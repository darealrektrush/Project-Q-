create table if not exists public.project_q_profile_preferences (
  profile_id uuid primary key,
  app_tour_version integer not null default 0 check (app_tour_version >= 0),
  app_tour_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_q_profile_preferences enable row level security;

revoke all on table public.project_q_profile_preferences from anon;
revoke all on table public.project_q_profile_preferences from authenticated;

comment on table public.project_q_profile_preferences is
  'Project Q app-level participant preferences keyed by Oracle universal profile_id.';

comment on column public.project_q_profile_preferences.app_tour_version is
  'Latest Project Q app tour version completed by this profile.';

comment on column public.project_q_profile_preferences.app_tour_completed_at is
  'Timestamp when the latest recorded Project Q app tour was completed.';
