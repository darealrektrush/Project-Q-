-- Project Q / FawkQ — Phase 1 schema
-- Economy (XP/points/rank), missions, leaderboard, feed, distribution logs.
-- Phase 3 adds the AI knowledge base (pgvector) on top of this — not here yet.

create table if not exists users (
  id bigint primary key, -- telegram user id
  username text,
  wallet_address text,
  xp bigint not null default 0,
  points bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists missions (
  id bigserial primary key,
  code text unique not null,
  title text not null,
  description text,
  xp_reward bigint not null default 0,
  sol_reward numeric(20, 9) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists user_missions (
  id bigserial primary key,
  user_id bigint not null references users(id),
  mission_id bigint not null references missions(id),
  status text not null default 'pending', -- pending | completed
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

-- Completion callbacks from fawkq.com's bagwork tasks (POST /bagwork).
create table if not exists bagwork_events (
  id bigserial primary key,
  user_id bigint not null references users(id),
  task_id text not null,
  sol_awarded numeric(20, 9) not null default 0,
  xp_awarded bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, task_id)
);

create table if not exists feed_posts (
  id bigserial primary key,
  kind text not null, -- signal | recap | mission | announcement
  title text,
  body text not null,
  telegram_message_id bigint,
  message_thread_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists distribution_runs (
  id bigserial primary key,
  total_lamports bigint not null,
  status text not null default 'started', -- started | completed | failed
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists distribution_transactions (
  id bigserial primary key,
  run_id bigint not null references distribution_runs(id),
  stage smallint not null, -- 1 or 2
  role text not null, -- community | dev | ocean | bag_wallet | buyback_reserve | holder
  from_wallet text not null,
  to_wallet text not null,
  amount_lamports bigint not null,
  tx_signature text not null,
  created_at timestamptz not null default now()
);

create or replace view leaderboard as
select
  id,
  username,
  xp,
  points,
  rank() over (order by xp desc) as rank
from users
order by xp desc;

-- Atomic XP/points increment, used by src/lib/xp.js so concurrent awards
-- (bagwork webhook + bot commands) can't clobber each other.
create or replace function increment_user_xp(p_user_id bigint, p_xp bigint, p_points bigint)
returns setof users as $$
  insert into users (id, xp, points)
  values (p_user_id, p_xp, p_points)
  on conflict (id) do update
    set xp = users.xp + excluded.xp,
        points = users.points + excluded.points,
        updated_at = now()
  returning *;
$$ language sql;
