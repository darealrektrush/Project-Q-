-- Reconcile the checked-in Project Q Phase 1 schema with the shared Oracle
-- Supabase project. This migration is additive and keeps all application
-- tables private to server-side service-role workflows.

create table if not exists public.missions (
  id bigserial primary key,
  code text unique not null,
  title text not null,
  description text,
  xp_reward bigint not null default 0 check (xp_reward >= 0),
  sol_reward numeric(20, 9) not null default 0 check (sol_reward >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_missions (
  id bigserial primary key,
  user_id bigint not null references public.users(id),
  mission_id bigint not null references public.missions(id),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create table if not exists public.bagwork_events (
  id bigserial primary key,
  user_id bigint not null references public.users(id),
  task_id text not null,
  sol_awarded numeric(20, 9) not null default 0 check (sol_awarded >= 0),
  xp_awarded bigint not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, task_id)
);

create table if not exists public.bagwork_payouts (
  id bigserial primary key,
  submission_id text unique not null,
  handle text not null,
  telegram text,
  user_id bigint references public.users(id),
  tier text not null,
  sol numeric(20, 9) not null check (sol >= 0),
  tx_sig text not null,
  post_url text,
  platform text,
  xp_awarded bigint not null default 0 check (xp_awarded >= 0),
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bagwork_clearances (
  id bigserial primary key,
  handle text not null,
  status text not null check (status in ('cleared', 'denied')),
  telegram text,
  user_id bigint references public.users(id),
  outcome text not null check (
    outcome in ('posted', 'dm', 'skipped_no_telegram', 'skipped_unmatched', 'post_failed')
  ),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (handle, status)
);

create table if not exists public.bagwork_feedback (
  id bigserial primary key,
  user_id bigint references public.users(id),
  telegram text,
  reply_text text not null,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.feed_posts (
  id bigserial primary key,
  kind text not null check (kind in ('signal', 'recap', 'mission', 'announcement')),
  title text,
  body text not null,
  telegram_message_id bigint,
  message_thread_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.distribution_runs (
  id bigserial primary key,
  total_lamports bigint not null check (total_lamports >= 0),
  status text not null default 'started' check (status in ('started', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  network text not null default 'mainnet' check (network in ('mainnet', 'devnet')),
  error_message text,
  failed_stage smallint check (failed_stage is null or failed_stage in (1, 2))
);

create table if not exists public.distribution_transactions (
  id bigserial primary key,
  run_id bigint not null references public.distribution_runs(id),
  stage smallint not null check (stage in (1, 2)),
  role text not null check (
    role in ('community', 'dev', 'ocean', 'bag_wallet', 'buyback_reserve', 'holder')
  ),
  from_wallet text not null,
  to_wallet text not null,
  amount_lamports bigint not null check (amount_lamports >= 0),
  tx_signature text not null,
  created_at timestamptz not null default now()
);

create index if not exists distribution_transactions_run_idx
  on public.distribution_transactions(run_id);

create table if not exists public.scheduled_events (
  id bigserial primary key,
  kind text not null check (kind in ('space', 'event')),
  title text not null,
  description text,
  link text,
  starts_at timestamptz not null,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists scheduled_events_upcoming_idx
  on public.scheduled_events(kind, starts_at)
  where cancelled is false;

create table if not exists public.signals (
  id bigserial primary key,
  kind text not null check (
    kind in ('signal_detected', 'unknown_transmission', 'mission_available')
  ),
  teaser_text text not null,
  reveal_text text,
  hint_1 text,
  hint_2 text,
  hint_3 text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  chat_id bigint,
  message_id bigint,
  thread_id bigint,
  source text not null default 'synthetic' check (source in ('synthetic', 'onchain')),
  tx_signature text,
  wallet text,
  amount_tokens numeric(20, 9) check (amount_tokens is null or amount_tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists signals_open_created_idx
  on public.signals(created_at desc)
  where status = 'open';

create table if not exists public.signal_interactions (
  id bigserial primary key,
  signal_id bigint not null references public.signals(id),
  user_id bigint not null references public.users(id),
  action text not null check (
    action in ('reveal', 'ignore', 'hint_1', 'hint_2', 'hint_3', 'claim', 'mission_verified')
  ),
  xp_delta bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (signal_id, user_id, action)
);

create index if not exists signal_interactions_user_action_idx
  on public.signal_interactions(user_id, action, created_at desc);

create or replace view public.bagwork_leaderboard
with (security_invoker = true) as
select
  handle,
  telegram,
  count(*) as pieces,
  sum(sol) as total_sol,
  rank() over (order by sum(sol) desc) as rank
from public.bagwork_payouts
group by handle, telegram;

create or replace view public.leaderboard
with (security_invoker = true) as
select
  id,
  username,
  xp,
  points,
  rank() over (order by xp desc) as rank
from public.users;

create or replace function public.increment_user_xp(
  p_user_id bigint,
  p_xp bigint,
  p_points bigint
)
returns setof public.users
language sql
security invoker
set search_path = ''
as $$
  insert into public.users (id, xp, points)
  values (p_user_id, p_xp, p_points)
  on conflict (id) do update
    set xp = public.users.xp + excluded.xp,
        points = public.users.points + excluded.points,
        updated_at = now()
  returning *;
$$;

alter table public.missions enable row level security;
alter table public.user_missions enable row level security;
alter table public.bagwork_events enable row level security;
alter table public.bagwork_payouts enable row level security;
alter table public.bagwork_clearances enable row level security;
alter table public.bagwork_feedback enable row level security;
alter table public.bagwork_feedback_prompts enable row level security;
alter table public.feed_posts enable row level security;
alter table public.distribution_runs enable row level security;
alter table public.distribution_transactions enable row level security;
alter table public.scheduled_events enable row level security;
alter table public.signals enable row level security;
alter table public.signal_interactions enable row level security;

revoke all on table
  public.missions,
  public.user_missions,
  public.bagwork_events,
  public.bagwork_payouts,
  public.bagwork_clearances,
  public.bagwork_feedback,
  public.bagwork_feedback_prompts,
  public.feed_posts,
  public.distribution_runs,
  public.distribution_transactions,
  public.scheduled_events,
  public.signals,
  public.signal_interactions
from anon, authenticated;

grant select, insert, update, delete on table
  public.missions,
  public.user_missions,
  public.bagwork_events,
  public.bagwork_payouts,
  public.bagwork_clearances,
  public.bagwork_feedback,
  public.bagwork_feedback_prompts,
  public.feed_posts,
  public.distribution_runs,
  public.distribution_transactions,
  public.scheduled_events,
  public.signals,
  public.signal_interactions
to service_role;

revoke all on table public.bagwork_leaderboard, public.leaderboard
from anon, authenticated;
grant select on table public.bagwork_leaderboard, public.leaderboard
to service_role;

revoke all on function public.increment_user_xp(bigint, bigint, bigint)
from public, anon, authenticated;
grant execute on function public.increment_user_xp(bigint, bigint, bigint)
to service_role;

grant usage, select on all sequences in schema public to service_role;
