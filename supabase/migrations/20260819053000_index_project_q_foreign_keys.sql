-- Add covering indexes for Project Q foreign keys reported by the Supabase
-- performance advisor after the Phase 1 schema reconciliation.

create index if not exists bagwork_clearances_user_id_idx
  on public.bagwork_clearances(user_id)
  where user_id is not null;

create index if not exists bagwork_feedback_user_id_idx
  on public.bagwork_feedback(user_id)
  where user_id is not null;

create index if not exists bagwork_payouts_user_id_idx
  on public.bagwork_payouts(user_id)
  where user_id is not null;

create index if not exists user_missions_mission_id_idx
  on public.user_missions(mission_id);
