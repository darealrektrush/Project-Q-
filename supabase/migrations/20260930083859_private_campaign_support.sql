create table public.q_support_threads (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null,
 campaign_id text not null, category text not null check(category in ('identity','mission','xp','rewards','wallet','technical','ocean')),
 subject text not null check(length(subject) between 5 and 120),
 status text not null default 'waiting_team' check(status in ('waiting_team','waiting_user','resolved')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index q_support_profile_recent on public.q_support_threads(profile_id,updated_at desc);
create table public.q_support_messages (
 id uuid primary key, thread_id uuid not null references public.q_support_threads(id),
 sender text not null check(sender in ('participant','team')), body text not null check(length(body) between 1 and 3000),
 created_at timestamptz not null default now()
);
create index q_support_thread_messages on public.q_support_messages(thread_id,created_at,id);
alter table public.q_support_threads enable row level security;
alter table public.q_support_messages enable row level security;
revoke all on public.q_support_threads,public.q_support_messages from public,anon,authenticated;
grant select,insert,update on public.q_support_threads to service_role;
grant select,insert on public.q_support_messages to service_role;

-- Server-only invoker RPC. The HTTP layer derives ownership from signed Telegram data.
create function public.q_support_write(p_profile uuid,p_campaign text,p_thread uuid,p_message uuid,p_category text,p_subject text,p_body text,p_team boolean default false)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_thread uuid; v_existing public.q_support_messages; v_owner uuid;
begin
 if p_profile is null or p_message is null or length(trim(p_body)) not between 1 and 3000 then raise exception 'invalid support request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_profile::text,0));
 select * into v_existing from public.q_support_messages where id=p_message;
 if found then
  select profile_id into v_owner from public.q_support_threads where id=v_existing.thread_id;
  if v_owner<>p_profile or v_existing.body<>p_body or v_existing.sender<>(case when p_team then 'team' else 'participant' end) then raise exception 'support retry conflict'; end if;
  return v_existing.thread_id;
 end if;
 if not p_team and (select count(*) from public.q_support_messages m join public.q_support_threads t on t.id=m.thread_id where t.profile_id=p_profile and m.sender='participant' and m.created_at>now()-interval '1 minute')>=5 then raise exception 'support rate limit'; end if;
 if p_thread is null then
  if p_team then raise exception 'support thread not found'; end if;
  if (select count(*) from public.q_support_threads where profile_id=p_profile and created_at>now()-interval '1 day')>=5 then raise exception 'support rate limit'; end if;
  insert into public.q_support_threads(profile_id,campaign_id,category,subject) values(p_profile,p_campaign,p_category,p_subject) returning id into v_thread;
 else
  select id into v_thread from public.q_support_threads where id=p_thread and profile_id=p_profile for update;
  if v_thread is null then raise exception 'support thread not found'; end if;
  if (select count(*) from public.q_support_messages where thread_id=v_thread)>=200 then raise exception 'support conversation limit'; end if;
 end if;
 insert into public.q_support_messages(id,thread_id,sender,body) values(p_message,v_thread,case when p_team then 'team' else 'participant' end,p_body);
 update public.q_support_threads set status=case when p_team then 'waiting_user' else 'waiting_team' end,updated_at=now() where id=v_thread;
 return v_thread;
end $$;
revoke all on function public.q_support_write(uuid,text,uuid,uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.q_support_write(uuid,text,uuid,uuid,text,text,text,boolean) to service_role;
