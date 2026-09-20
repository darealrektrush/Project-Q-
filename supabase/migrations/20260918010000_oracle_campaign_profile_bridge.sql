-- Project Q launches before the Universe UI, but every participant must use
-- the same permanent Oracle profile the Universe will consume later.
-- Telegram Mini App initData is verified by the Project Q server before this
-- service-role-only function is called.

alter table public.identity_links
  add column if not exists profile_id uuid references public.crabstar_profiles(profile_id);

create unique index if not exists identity_links_campaign_profile_uidx
  on public.identity_links(campaign_id, profile_id)
  where profile_id is not null;

create index if not exists identity_links_profile_idx
  on public.identity_links(profile_id)
  where profile_id is not null;

update public.identity_links link
set profile_id = telegram.profile_id
from public.telegram_identity telegram
where telegram.telegram_user_id = link.telegram_user_id
  and link.profile_id is null;

create or replace function public.ensure_project_q_campaign_profile(
  p_campaign_id text,
  p_telegram_user_id bigint
) returns table (
  profile_id uuid,
  profile_state text,
  telegram_verified boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing_identity public.telegram_identity;
  campaign_link public.identity_links;
  candidate_profile_id uuid;
begin
  if p_campaign_id is null or btrim(p_campaign_id) = ''
     or p_telegram_user_id is null or p_telegram_user_id <= 0 then
    raise exception 'invalid campaign identity request';
  end if;

  if not exists (select 1 from public.campaigns where id = p_campaign_id) then
    raise exception 'campaign not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('crabstar:telegram:' || p_telegram_user_id::text, 0));

  select * into existing_identity
  from public.telegram_identity
  where telegram_user_id = p_telegram_user_id
  for update;

  if existing_identity.telegram_identity_id is null then
    insert into public.crabstar_profiles default values
    returning crabstar_profiles.profile_id into candidate_profile_id;

    insert into public.telegram_identity (
      profile_id, telegram_user_id, connection_state, verified_at
    ) values (
      candidate_profile_id, p_telegram_user_id, 'verified', now()
    )
    returning * into existing_identity;
  elsif existing_identity.connection_state in ('revoked', 'conflicted') then
    raise exception 'telegram identity requires review';
  else
    update public.telegram_identity
    set connection_state = 'verified',
        verified_at = coalesce(verified_at, now()),
        disconnected_at = null,
        updated_at = now()
    where telegram_identity_id = existing_identity.telegram_identity_id
    returning * into existing_identity;
  end if;

  select * into campaign_link
  from public.identity_links
  where campaign_id = p_campaign_id
    and telegram_user_id = p_telegram_user_id
  for update;

  if campaign_link.telegram_user_id is not null
     and campaign_link.profile_id is not null
     and campaign_link.profile_id <> existing_identity.profile_id then
    raise exception 'campaign identity conflict';
  end if;

  insert into public.identity_links (
    campaign_id, telegram_user_id, profile_id, telegram_created_at
  ) values (
    p_campaign_id, p_telegram_user_id, existing_identity.profile_id, now()
  )
  on conflict (campaign_id, telegram_user_id) do update
    set profile_id = excluded.profile_id,
        telegram_created_at = coalesce(
          identity_links.telegram_created_at,
          excluded.telegram_created_at
        );

  return query
  select profile.profile_id, profile.profile_state, true
  from public.crabstar_profiles profile
  where profile.profile_id = existing_identity.profile_id;
end;
$$;

revoke all on function public.ensure_project_q_campaign_profile(text, bigint)
  from public, anon, authenticated;
grant execute on function public.ensure_project_q_campaign_profile(text, bigint)
  to service_role;

-- Oracle is the authority that sends this already-verified X identity event.
-- Mirror it into the canonical profile while preserving the existing Project Q
-- campaign link used by current campaign code.
create or replace function public.link_oracle_identity(
  p_campaign_id text,
  p_telegram_user_id bigint,
  p_x_user_id text,
  p_verified_at timestamptz
) returns public.identity_links
language plpgsql
security invoker
set search_path = ''
as $$
declare
  canonical_profile_id uuid;
  conflicting_profile_id uuid;
  result public.identity_links;
begin
  if p_x_user_id is null or btrim(p_x_user_id) !~ '^[0-9]{1,30}$'
     or p_verified_at is null or p_verified_at > now() + interval '5 minutes' then
    raise exception 'invalid Oracle identity event';
  end if;

  perform public.ensure_project_q_campaign_profile(p_campaign_id, p_telegram_user_id);

  select profile_id into canonical_profile_id
  from public.telegram_identity
  where telegram_user_id = p_telegram_user_id
    and connection_state = 'verified'
  for update;

  select profile_id into conflicting_profile_id
  from public.x_identity
  where x_user_id = btrim(p_x_user_id)
  for update;

  if conflicting_profile_id is not null and conflicting_profile_id <> canonical_profile_id then
    raise exception 'X identity belongs to another profile';
  end if;

  select profile_id into conflicting_profile_id
  from public.x_identity
  where profile_id = canonical_profile_id
  for update;

  if conflicting_profile_id is not null and not exists (
    select 1 from public.x_identity
    where profile_id = canonical_profile_id and x_user_id = btrim(p_x_user_id)
  ) then
    raise exception 'profile already has another X identity';
  end if;

  insert into public.x_identity (
    profile_id, x_user_id, connection_state, verified_at
  ) values (
    canonical_profile_id, btrim(p_x_user_id), 'verified', p_verified_at
  )
  on conflict (profile_id) do update
    set connection_state = 'verified',
        verified_at = greatest(x_identity.verified_at, excluded.verified_at),
        disconnected_at = null,
        revoked_at = null,
        updated_at = now();

  update public.identity_links
  set x_user_id = btrim(p_x_user_id),
      x_verified_at = greatest(identity_links.x_verified_at, p_verified_at)
  where campaign_id = p_campaign_id
    and telegram_user_id = p_telegram_user_id
  returning * into result;

  return result;
end;
$$;

revoke all on function public.link_oracle_identity(text, bigint, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.link_oracle_identity(text, bigint, text, timestamptz)
  to service_role;

-- Oracle is the sole wallet-connection and signature-verification authority.
-- Project Q records only the payout reference needed for campaign eligibility,
-- allocations and distributions; it never writes the canonical wallet table.
create or replace function public.record_oracle_verified_wallet(
  p_campaign_id text,
  p_telegram_user_id bigint,
  p_wallet_address text,
  p_verified_at timestamptz
) returns public.identity_links
language plpgsql
security invoker
set search_path = ''
as $$
declare
  canonical_profile_id uuid;
  previous_wallet text;
  result public.identity_links;
begin
  if p_wallet_address is null or btrim(p_wallet_address) !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
     or p_verified_at is null or p_verified_at > now() + interval '5 minutes' then
    raise exception 'invalid verified wallet event';
  end if;

  perform public.ensure_project_q_campaign_profile(p_campaign_id, p_telegram_user_id);

  select profile_id, reward_wallet
  into canonical_profile_id, previous_wallet
  from public.identity_links
  where campaign_id = p_campaign_id
    and telegram_user_id = p_telegram_user_id
  for update;

  if exists (
    select 1 from public.identity_links
    where reward_wallet = btrim(p_wallet_address)
      and profile_id <> canonical_profile_id
  ) then
    raise exception 'wallet is already assigned to another campaign profile';
  end if;

  if previous_wallet is not null and previous_wallet <> btrim(p_wallet_address) then
    if exists (
      select 1 from public.allocations
      where campaign_id = p_campaign_id
        and (telegram_user_id = p_telegram_user_id or reward_wallet = previous_wallet)
    ) then
      raise exception 'campaign payout wallet is locked after allocation';
    end if;
  end if;

  update public.identity_links
  set reward_wallet = btrim(p_wallet_address),
      wallet_verified_at = greatest(identity_links.wallet_verified_at, p_verified_at),
      fawkq_token_account = case
        when previous_wallet is distinct from btrim(p_wallet_address) then null
        else identity_links.fawkq_token_account
      end
  where campaign_id = p_campaign_id
    and telegram_user_id = p_telegram_user_id
  returning * into result;

  return result;
end;
$$;

revoke all on function public.record_oracle_verified_wallet(text, bigint, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_oracle_verified_wallet(text, bigint, text, timestamptz)
  to service_role;

-- Preserve every pre-existing Project Q participant and replay only the
-- Oracle-owned X identity fact. Legacy Project Q wallet records are not
-- promoted into the canonical profile; members reconnect once through Oracle.
do $$
declare
  campaign_identity public.identity_links;
begin
  for campaign_identity in
    select * from public.identity_links order by campaign_id, telegram_user_id
  loop
    perform public.ensure_project_q_campaign_profile(
      campaign_identity.campaign_id,
      campaign_identity.telegram_user_id
    );

    if campaign_identity.x_user_id is not null
       and campaign_identity.x_verified_at is not null then
      perform public.link_oracle_identity(
        campaign_identity.campaign_id,
        campaign_identity.telegram_user_id,
        campaign_identity.x_user_id,
        campaign_identity.x_verified_at
      );
    end if;

  end loop;
end;
$$;
