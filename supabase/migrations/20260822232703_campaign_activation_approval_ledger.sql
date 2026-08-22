create table if not exists public.campaign_activation_approvals (
  campaign_id text not null references public.campaigns(id),
  readiness_hash text not null check (readiness_hash ~ '^[0-9a-f]{64}$'),
  founder_user_id bigint not null,
  approved boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, readiness_hash, founder_user_id)
);

create table if not exists public.campaign_activation_approval_audit (
  id bigserial primary key,
  campaign_id text not null references public.campaigns(id),
  readiness_hash text not null check (readiness_hash ~ '^[0-9a-f]{64}$'),
  founder_user_id bigint not null,
  approved boolean not null,
  recorded_at timestamptz not null default now()
);

create index if not exists campaign_activation_approval_audit_lookup_idx
  on public.campaign_activation_approval_audit(campaign_id, readiness_hash, recorded_at);

alter table public.campaign_activation_approvals enable row level security;
alter table public.campaign_activation_approval_audit enable row level security;

revoke all on public.campaign_activation_approvals from public, anon, authenticated;
revoke all on public.campaign_activation_approval_audit from public, anon, authenticated;
revoke all on sequence public.campaign_activation_approval_audit_id_seq from public, anon, authenticated;

grant select, insert, update on public.campaign_activation_approvals to service_role;
grant select, insert on public.campaign_activation_approval_audit to service_role;
grant usage, select on sequence public.campaign_activation_approval_audit_id_seq to service_role;

create or replace function public.audit_campaign_activation_approval()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  insert into public.campaign_activation_approval_audit(
    campaign_id, readiness_hash, founder_user_id, approved
  ) values (
    new.campaign_id, new.readiness_hash, new.founder_user_id, new.approved
  );
  return new;
end;
$$;

revoke all on function public.audit_campaign_activation_approval() from public, anon, authenticated;
grant execute on function public.audit_campaign_activation_approval() to service_role;

drop trigger if exists campaign_activation_approvals_audit on public.campaign_activation_approvals;
create trigger campaign_activation_approvals_audit
before insert or update on public.campaign_activation_approvals
for each row execute function public.audit_campaign_activation_approval();

create or replace function public.reject_campaign_activation_approval_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'campaign activation approval audit is append-only';
end;
$$;

revoke all on function public.reject_campaign_activation_approval_audit_mutation() from public, anon, authenticated;
grant execute on function public.reject_campaign_activation_approval_audit_mutation() to service_role;

drop trigger if exists campaign_activation_approval_audit_immutable on public.campaign_activation_approval_audit;
create trigger campaign_activation_approval_audit_immutable
before update or delete on public.campaign_activation_approval_audit
for each row execute function public.reject_campaign_activation_approval_audit_mutation();
