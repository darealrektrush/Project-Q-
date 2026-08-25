-- Verified referral foundation for Bond the Duck. This migration creates no
-- awards and leaves referral bonus XP unset in application configuration.

create table if not exists public.campaign_referral_codes (
  campaign_id text not null references public.campaigns(id),
  telegram_user_id bigint not null,
  code text not null check (code ~ '^[a-z0-9_-]{8,24}$'),
  created_at timestamptz not null default now(),
  primary key (campaign_id, telegram_user_id),
  unique (campaign_id, code)
);

create table if not exists public.campaign_referrals (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  referral_code text not null,
  referrer_user_id bigint not null,
  referred_user_id bigint not null,
  status text not null default 'CAPTURED' check (status in (
    'CAPTURED','IDENTITY_VERIFIED','PURCHASE_VERIFIED','PARTICIPATED',
    'QUALIFIED','BONUS_AWARDED','REJECTED'
  )),
  accepted_at timestamptz not null default now(),
  identity_verified_at timestamptz,
  purchase_verified_at timestamptz,
  qualifying_purchase_usd numeric(20,9) check (qualifying_purchase_usd >= 2),
  qualifying_purchase_ref text,
  first_xp_ledger_id bigint references public.xp_ledger(id),
  qualified_at timestamptz,
  bonus_xp_ledger_id bigint references public.xp_ledger(id),
  rejected_reason text,
  unique (campaign_id, referred_user_id),
  unique (campaign_id, bonus_xp_ledger_id),
  foreign key (campaign_id, referral_code)
    references public.campaign_referral_codes(campaign_id, code),
  check (referrer_user_id <> referred_user_id),
  check (purchase_verified_at is null or qualifying_purchase_ref is not null),
  check (qualified_at is null or (
    identity_verified_at is not null and purchase_verified_at is not null and first_xp_ledger_id is not null
  )),
  check (bonus_xp_ledger_id is null or qualified_at is not null)
);

create table if not exists public.campaign_referral_purchase_proofs (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  referred_user_id bigint not null,
  reward_wallet text not null,
  purchase_ref text not null,
  purchase_usd numeric(20,9) not null check (purchase_usd >= 2),
  purchased_at timestamptz not null,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, purchase_ref),
  foreign key (campaign_id, referred_user_id)
    references public.campaign_referrals(campaign_id, referred_user_id)
);

create index if not exists campaign_referrals_referrer_idx
  on public.campaign_referrals(campaign_id, referrer_user_id, accepted_at desc);
create index if not exists campaign_referral_proofs_participant_idx
  on public.campaign_referral_purchase_proofs(campaign_id, referred_user_id, purchased_at);

create or replace function public.capture_campaign_referral(
  p_campaign_id text,
  p_referral_code text,
  p_referred_user_id bigint
) returns public.campaign_referrals
language plpgsql security invoker set search_path = public as $$
declare
  owner_id bigint;
  result public.campaign_referrals;
begin
  if not exists (
    select 1 from public.campaigns where id = p_campaign_id and state = 'ACTIVE'
  ) then raise exception 'campaign referral capture is not active'; end if;
  select telegram_user_id into owner_id
  from public.campaign_referral_codes
  where campaign_id = p_campaign_id and code = lower(p_referral_code);
  if owner_id is null then raise exception 'referral code not found'; end if;
  if owner_id = p_referred_user_id then raise exception 'self-referral is not allowed'; end if;
  select * into result from public.campaign_referrals
  where campaign_id = p_campaign_id and referred_user_id = p_referred_user_id;
  if found then return result; end if;
  if exists (
    select 1 from public.identity_links
    where campaign_id = p_campaign_id and telegram_user_id = p_referred_user_id
  ) then raise exception 'existing campaign participant is not referral eligible'; end if;

  insert into public.campaign_referrals
    (campaign_id, referral_code, referrer_user_id, referred_user_id)
  values (p_campaign_id, lower(p_referral_code), owner_id, p_referred_user_id)
  on conflict (campaign_id, referred_user_id) do nothing
  returning * into result;

  if result.id is null then
    select * into result from public.campaign_referrals
    where campaign_id = p_campaign_id and referred_user_id = p_referred_user_id;
  end if;
  return result;
end;
$$;

alter table public.campaign_referral_codes enable row level security;
alter table public.campaign_referrals enable row level security;
alter table public.campaign_referral_purchase_proofs enable row level security;

drop trigger if exists campaign_referral_codes_immutable on public.campaign_referral_codes;
create trigger campaign_referral_codes_immutable
before update or delete on public.campaign_referral_codes
for each row execute function public.reject_campaign_ledger_mutation();
drop trigger if exists campaign_referral_purchase_proofs_immutable on public.campaign_referral_purchase_proofs;
create trigger campaign_referral_purchase_proofs_immutable
before update or delete on public.campaign_referral_purchase_proofs
for each row execute function public.reject_campaign_ledger_mutation();

revoke all on public.campaign_referral_codes, public.campaign_referrals,
  public.campaign_referral_purchase_proofs from anon, authenticated;
grant select, insert on public.campaign_referral_codes, public.campaign_referral_purchase_proofs to service_role;
grant select, insert, update on public.campaign_referrals to service_role;
grant usage, select on sequence public.campaign_referrals_id_seq,
  public.campaign_referral_purchase_proofs_id_seq to service_role;

revoke all on function public.capture_campaign_referral(text,text,bigint)
  from public, anon, authenticated;
grant execute on function public.capture_campaign_referral(text,text,bigint) to service_role;
