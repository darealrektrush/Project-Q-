-- Keep Oracle raid thread routing private to trusted backend services.
-- The service_role retains its existing privileges and bypasses RLS.

alter table public.raid_thread_context enable row level security;

revoke all on table public.raid_thread_context
  from public, anon, authenticated;
