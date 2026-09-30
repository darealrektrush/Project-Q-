-- Oracle owns X verification. Project Q mirrors only the current X rail for
-- campaign eligibility while preserving every historical campaign/raid record.

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
  v_profile_id uuid;
  result public.identity_links;
begin
  if p_telegram_user_id is null or p_telegram_user_id <= 0
     or p_x_user_id is null or btrim(p_x_user_id) !~ '^[0-9]{1,30}$'
     or p_verified_at is null
     or p_verified_at > now() + interval '5 minutes' then
    raise exception 'invalid Oracle identity event';
  end if;

  select profile_id into v_profile_id
  from public.identity_links
  where campaign_id = p_campaign_id
    and telegram_user_id = p_telegram_user_id
  for update;

  if v_profile_id is null then
    raise exception 'Oracle campaign profile required';
  end if;

  -- Oracle is the ownership authority. Project Q still prevents one current
  -- X reference from being mirrored onto two campaign profiles.
  if exists (
    select 1
    from public.identity_links
    where campaign_id = p_campaign_id
      and x_user_id = btrim(p_x_user_id)
      and profile_id is distinct from v_profile_id
  ) then
    raise exception 'X identity is already assigned to another campaign profile';
  end if;

  update public.identity_links
  set x_user_id = btrim(p_x_user_id),
      x_verified_at = case
        when public.identity_links.x_user_id is distinct from btrim(p_x_user_id)
          then p_verified_at
        else greatest(public.identity_links.x_verified_at, p_verified_at)
      end
  where campaign_id = p_campaign_id
    and telegram_user_id = p_telegram_user_id
    and profile_id = v_profile_id
  returning * into result;

  if result.profile_id is null then
    raise exception 'Oracle campaign identity update failed';
  end if;

  return result;
end;
$$;

revoke all on function public.link_oracle_identity(text,bigint,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.link_oracle_identity(text,bigint,text,timestamptz)
  to service_role;

comment on function public.link_oracle_identity(text,bigint,text,timestamptz) is
  'Mirrors Oracle current X verification onto a Project Q campaign profile. X replacement does not rewrite historical campaign evidence, XP or settlement records.';
