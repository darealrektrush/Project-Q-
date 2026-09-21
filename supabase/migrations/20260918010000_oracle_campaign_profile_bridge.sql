-- Oracle owns canonical profiles in a separate Supabase project. Project Q
-- stores only the opaque profile id returned by Oracle's authenticated API.
alter table public.identity_links add column if not exists profile_id uuid;
create unique index if not exists identity_links_campaign_profile_uidx
  on public.identity_links(campaign_id, profile_id) where profile_id is not null;
create index if not exists identity_links_profile_idx
  on public.identity_links(profile_id) where profile_id is not null;

create or replace function public.record_project_q_campaign_profile(
  p_campaign_id text, p_telegram_user_id bigint, p_profile_id uuid, p_profile_state text
) returns public.identity_links
language plpgsql security invoker set search_path = '' as $$
declare existing public.identity_links; result public.identity_links;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = '' or p_telegram_user_id is null
     or p_telegram_user_id <= 0 or p_profile_id is null
     or p_profile_state not in ('provisional', 'active') then
    raise exception 'invalid Oracle campaign identity';
  end if;
  if not exists (select 1 from public.campaigns where id = p_campaign_id) then
    raise exception 'campaign not found';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('project-q:telegram:' || p_telegram_user_id::text, 0));
  select * into existing from public.identity_links
   where campaign_id = p_campaign_id and telegram_user_id = p_telegram_user_id for update;
  if existing.profile_id is not null and existing.profile_id <> p_profile_id then
    raise exception 'campaign identity conflict';
  end if;
  if exists (select 1 from public.identity_links where campaign_id = p_campaign_id
      and profile_id = p_profile_id and telegram_user_id <> p_telegram_user_id) then
    raise exception 'Oracle profile belongs to another campaign identity';
  end if;
  insert into public.identity_links(campaign_id, telegram_user_id, profile_id, telegram_created_at)
  values (p_campaign_id, p_telegram_user_id, p_profile_id, now())
  on conflict (campaign_id, telegram_user_id) do update
    set profile_id = excluded.profile_id,
        telegram_created_at = coalesce(public.identity_links.telegram_created_at, excluded.telegram_created_at)
  returning * into result;
  return result;
end;
$$;
revoke all on function public.record_project_q_campaign_profile(text, bigint, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_project_q_campaign_profile(text, bigint, uuid, text) to service_role;

create or replace function public.link_oracle_identity(
  p_campaign_id text, p_telegram_user_id bigint, p_x_user_id text, p_verified_at timestamptz
) returns public.identity_links
language plpgsql security invoker set search_path = '' as $$
declare result public.identity_links;
begin
  if p_x_user_id is null or btrim(p_x_user_id) !~ '^[0-9]{1,30}$'
     or p_verified_at is null or p_verified_at > now() + interval '5 minutes' then
    raise exception 'invalid Oracle identity event';
  end if;
  update public.identity_links set x_user_id = btrim(p_x_user_id),
    x_verified_at = greatest(public.identity_links.x_verified_at, p_verified_at)
  where campaign_id = p_campaign_id and telegram_user_id = p_telegram_user_id
    and profile_id is not null returning * into result;
  if result.profile_id is null then raise exception 'Oracle campaign profile required'; end if;
  return result;
end;
$$;
revoke all on function public.link_oracle_identity(text, bigint, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.link_oracle_identity(text, bigint, text, timestamptz) to service_role;

create or replace function public.record_oracle_verified_wallet(
  p_campaign_id text, p_telegram_user_id bigint, p_wallet_address text, p_verified_at timestamptz
) returns public.identity_links
language plpgsql security invoker set search_path = '' as $$
declare previous_wallet text; canonical_profile_id uuid; result public.identity_links;
begin
  if p_wallet_address is null or btrim(p_wallet_address) !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
     or p_verified_at is null or p_verified_at > now() + interval '5 minutes' then
    raise exception 'invalid verified wallet event';
  end if;
  select profile_id, reward_wallet into canonical_profile_id, previous_wallet
  from public.identity_links where campaign_id = p_campaign_id
    and telegram_user_id = p_telegram_user_id for update;
  if canonical_profile_id is null then raise exception 'Oracle campaign profile required'; end if;
  if exists (select 1 from public.identity_links where reward_wallet = btrim(p_wallet_address)
      and profile_id <> canonical_profile_id) then
    raise exception 'wallet is already assigned to another campaign profile';
  end if;
  if previous_wallet is not null and previous_wallet <> btrim(p_wallet_address)
     and exists (select 1 from public.allocations where campaign_id = p_campaign_id
       and (telegram_user_id = p_telegram_user_id or reward_wallet = previous_wallet)) then
    raise exception 'campaign payout wallet is locked after allocation';
  end if;
  update public.identity_links set reward_wallet = btrim(p_wallet_address),
    wallet_verified_at = greatest(public.identity_links.wallet_verified_at, p_verified_at),
    fawkq_token_account = case when previous_wallet is distinct from btrim(p_wallet_address)
      then null else public.identity_links.fawkq_token_account end
  where campaign_id = p_campaign_id and telegram_user_id = p_telegram_user_id
  returning * into result;
  return result;
end;
$$;
revoke all on function public.record_oracle_verified_wallet(text, bigint, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_oracle_verified_wallet(text, bigint, text, timestamptz) to service_role;
