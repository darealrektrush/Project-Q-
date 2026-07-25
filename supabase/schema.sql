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

-- Superseded by bagwork_payouts below (real fawkq.com webhook contract, see
-- PROJECTQ-WEBHOOK.md). Left in place rather than dropped in case it holds data.
create table if not exists bagwork_events (
  id bigserial primary key,
  user_id bigint not null references users(id),
  task_id text not null,
  sol_awarded numeric(20, 9) not null default 0,
  xp_awarded bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, task_id)
);

-- Ledger of paid bagwork pieces from fawkq.com's bagwork_paid webhook event.
-- submission_id is unique so resend deliveries are idempotent (never
-- double-award XP or double-post the announcement).
create table if not exists bagwork_payouts (
  id bigserial primary key,
  submission_id text unique not null,
  handle text not null, -- X handle, lowercase no @
  telegram text, -- lowercase no @; null if the creator skipped the field
  user_id bigint references users(id), -- matched Telegram user, null if unmatched
  tier text not null,
  sol numeric(20, 9) not null,
  tx_sig text not null,
  post_url text,
  xp_awarded bigint not null default 0,
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Replies to the first-payout feedback DM ask, for founders to read.
create table if not exists bagwork_feedback (
  id bigserial primary key,
  user_id bigint references users(id),
  telegram text,
  reply_text text not null,
  created_at timestamptz not null default now()
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

-- Admin-editable overrides for menu/command bio text + media, set via /adminf.
create table if not exists menu_content (
  key text primary key,
  bio_text text,
  media_file_id text,
  updated_by bigint,
  updated_at timestamptz not null default now()
);

-- Signal mini-game: a posted teaser (signal_detected / unknown_transmission /
-- mission_available) that members can act on for XP via /signal's buttons.
create table if not exists signals (
  id bigserial primary key,
  kind text not null, -- signal_detected | unknown_transmission | mission_available
  teaser_text text not null,
  reveal_text text,
  hint_1 text,
  hint_2 text,
  hint_3 text,
  status text not null default 'open', -- open | resolved
  chat_id bigint,
  message_id bigint,
  thread_id bigint,
  -- signal_detected only: real on-chain data behind the teaser, when found.
  source text default 'synthetic', -- synthetic | onchain
  tx_signature text,
  wallet text,
  amount_tokens numeric(20, 9),
  created_at timestamptz not null default now()
);

-- One row per (signal, user, action) — the unique constraint is what makes
-- reveal/ignore/hint idempotent per user (can't double-charge or re-roll).
create table if not exists signal_interactions (
  id bigserial primary key,
  signal_id bigint not null references signals(id),
  user_id bigint not null references users(id),
  action text not null, -- reveal | ignore | hint_1 | hint_2 | hint_3
  xp_delta bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (signal_id, user_id, action)
);

-- Bag Workers leaderboard by X handle (works even when telegram is null/
-- unmatched, per PROJECTQ-WEBHOOK.md — not wired to a bot command yet).
create or replace view bagwork_leaderboard as
select
  handle,
  telegram,
  count(*) as pieces,
  sum(sol) as total_sol,
  rank() over (order by sum(sol) desc) as rank
from bagwork_payouts
group by handle, telegram
order by total_sol desc;

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
