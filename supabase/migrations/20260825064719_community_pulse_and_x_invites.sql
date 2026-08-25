-- Community Pulse and one-time X invite evidence. Both remain feature-gated;
-- the X invite bonus amount is intentionally unset.

create table if not exists public.campaign_community_messages (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  chat_id bigint not null,
  message_id bigint not null,
  thread_id bigint,
  telegram_user_id bigint not null,
  local_day date not null,
  window_index smallint not null check (window_index between 0 and 47),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  word_count integer not null check (word_count >= 3),
  reply_to_user_id bigint,
  sent_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique (campaign_id, chat_id, message_id),
  unique (campaign_id, telegram_user_id, local_day, content_hash),
  check (reply_to_user_id is null or reply_to_user_id <> telegram_user_id)
);

create table if not exists public.campaign_community_daily_scores (
  campaign_id text not null references public.campaigns(id),
  local_day date not null,
  telegram_user_id bigint not null,
  qualifying_messages integer not null check (qualifying_messages >= 0),
  distinct_windows integer not null check (distinct_windows between 0 and 48),
  reply_count integer not null check (reply_count >= 0),
  activity_span_minutes integer not null check (activity_span_minutes >= 0),
  score integer not null check (score >= 0),
  eligible boolean not null,
  daily_rank integer check (daily_rank > 0),
  base_xp integer not null check (base_xp between 0 and 2),
  rank_xp integer not null check (rank_xp between 0 and 6),
  xp_awarded integer not null check (xp_awarded between 0 and 8),
  settled_at timestamptz not null,
  primary key (campaign_id, local_day, telegram_user_id),
  check (not eligible or (
    qualifying_messages >= 5 and distinct_windows >= 3 and reply_count >= 2
    and activity_span_minutes >= 120
  ))
);

create table if not exists public.campaign_x_invite_events (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  telegram_user_id bigint not null,
  x_user_id text not null,
  main_post_id text not null check (main_post_id ~ '^[0-9]{1,24}$'),
  reply_post_id text not null check (reply_post_id ~ '^[0-9]{1,24}$'),
  conversation_id text not null,
  referenced_post_id text not null,
  referenced_type text not null check (referenced_type = 'replied_to'),
  mentions jsonb not null check (jsonb_typeof(mentions) = 'array' and jsonb_array_length(mentions) = 3),
  verified_at timestamptz not null,
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  bonus_xp_ledger_id bigint references public.xp_ledger(id),
  created_at timestamptz not null default now(),
  unique (campaign_id, telegram_user_id),
  unique (campaign_id, reply_post_id),
  unique (campaign_id, idempotency_key),
  check (conversation_id = main_post_id and referenced_post_id = main_post_id)
);

create index if not exists campaign_community_messages_day_idx
  on public.campaign_community_messages(campaign_id, local_day, telegram_user_id, sent_at);
create index if not exists campaign_community_scores_rank_idx
  on public.campaign_community_daily_scores(campaign_id, local_day, eligible, daily_rank);

create or replace function public.ingest_campaign_community_message(
  p_campaign_id text, p_chat_id bigint, p_message_id bigint, p_thread_id bigint,
  p_telegram_user_id bigint, p_local_day date, p_window_index smallint,
  p_content_hash text, p_word_count integer, p_reply_to_user_id bigint,
  p_sent_at timestamptz
) returns public.campaign_community_messages
language plpgsql security invoker set search_path = public as $$
declare result public.campaign_community_messages;
begin
  if not exists (select 1 from public.campaigns where id = p_campaign_id and state = 'ACTIVE') then
    raise exception 'campaign is not active';
  end if;
  if not exists (
    select 1 from public.identity_links where campaign_id = p_campaign_id
      and telegram_user_id = p_telegram_user_id and x_verified_at is not null
  ) then raise exception 'verified campaign identity required'; end if;
  if p_sent_at > now() + interval '5 minutes' or p_sent_at < now() - interval '2 days' then
    raise exception 'community message timestamp outside ingest window';
  end if;
  insert into public.campaign_community_messages
    (campaign_id,chat_id,message_id,thread_id,telegram_user_id,local_day,window_index,
     content_hash,word_count,reply_to_user_id,sent_at)
  values
    (p_campaign_id,p_chat_id,p_message_id,p_thread_id,p_telegram_user_id,p_local_day,p_window_index,
     p_content_hash,p_word_count,p_reply_to_user_id,p_sent_at)
  on conflict do nothing returning * into result;
  if result.id is null then
    select * into result from public.campaign_community_messages
    where campaign_id = p_campaign_id and chat_id = p_chat_id and message_id = p_message_id;
  end if;
  return result;
end;
$$;

create or replace function public.ingest_campaign_x_invite(
  p_campaign_id text, p_telegram_user_id bigint, p_x_user_id text,
  p_main_post_id text, p_reply_post_id text, p_conversation_id text,
  p_referenced_post_id text, p_referenced_type text, p_mentions jsonb, p_verified_at timestamptz,
  p_idempotency_key text
) returns public.campaign_x_invite_events
language plpgsql security invoker set search_path = public as $$
declare result public.campaign_x_invite_events;
begin
  if not exists (select 1 from public.campaigns where id = p_campaign_id and state = 'ACTIVE') then
    raise exception 'campaign is not active';
  end if;
  if not exists (
    select 1 from public.identity_links where campaign_id = p_campaign_id
      and telegram_user_id = p_telegram_user_id and x_user_id = p_x_user_id
      and x_verified_at is not null
  ) then raise exception 'campaign identity does not match verified X identity'; end if;
  if p_conversation_id <> p_main_post_id or p_referenced_post_id <> p_main_post_id
    or p_referenced_type <> 'replied_to' then
    raise exception 'reply does not target the official campaign post';
  end if;
  if p_verified_at > now() + interval '5 minutes' then
    raise exception 'X invite verification timestamp is in the future';
  end if;
  if jsonb_typeof(p_mentions) <> 'array' or jsonb_array_length(p_mentions) <> 3 then
    raise exception 'exactly three verified mentions required';
  end if;
  insert into public.campaign_x_invite_events
    (campaign_id,telegram_user_id,x_user_id,main_post_id,reply_post_id,conversation_id,
     referenced_post_id,referenced_type,mentions,verified_at,idempotency_key)
  values
    (p_campaign_id,p_telegram_user_id,p_x_user_id,p_main_post_id,p_reply_post_id,p_conversation_id,
     p_referenced_post_id,p_referenced_type,p_mentions,p_verified_at,p_idempotency_key)
  on conflict (campaign_id,idempotency_key) do nothing returning * into result;
  if result.id is null then
    select * into result from public.campaign_x_invite_events
    where campaign_id = p_campaign_id and idempotency_key = p_idempotency_key;
  end if;
  return result;
end;
$$;

alter table public.campaign_community_messages enable row level security;
alter table public.campaign_community_daily_scores enable row level security;
alter table public.campaign_x_invite_events enable row level security;

drop trigger if exists campaign_community_messages_immutable on public.campaign_community_messages;
create trigger campaign_community_messages_immutable before update or delete on public.campaign_community_messages
for each row execute function public.reject_campaign_ledger_mutation();
drop trigger if exists campaign_x_invite_events_immutable on public.campaign_x_invite_events;
create trigger campaign_x_invite_events_immutable before update or delete on public.campaign_x_invite_events
for each row execute function public.reject_campaign_ledger_mutation();

revoke all on public.campaign_community_messages, public.campaign_community_daily_scores,
  public.campaign_x_invite_events from anon, authenticated;
grant select, insert on public.campaign_community_messages, public.campaign_x_invite_events to service_role;
grant select, insert, update on public.campaign_community_daily_scores to service_role;
grant usage, select on sequence public.campaign_community_messages_id_seq,
  public.campaign_x_invite_events_id_seq to service_role;

revoke all on function public.ingest_campaign_community_message(text,bigint,bigint,bigint,bigint,date,smallint,text,integer,bigint,timestamptz)
  from public, anon, authenticated;
grant execute on function public.ingest_campaign_community_message(text,bigint,bigint,bigint,bigint,date,smallint,text,integer,bigint,timestamptz)
  to service_role;
revoke all on function public.ingest_campaign_x_invite(text,bigint,text,text,text,text,text,text,jsonb,timestamptz,text)
  from public, anon, authenticated;
grant execute on function public.ingest_campaign_x_invite(text,bigint,text,text,text,text,text,text,jsonb,timestamptz,text)
  to service_role;
