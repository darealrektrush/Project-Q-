-- Register the two founder-supplied Telegram identities and reconcile the
-- display label expected by the Earn-to-Burn workflow. This migration does
-- not create or enable an Earn-to-Burn program, seed milestones, approve a
-- source account, fund a campaign, or change campaign state.

do $$
begin
  if not exists (
    select 1 from public.campaigns
    where id = 'bond-the-duck-2026' and state = 'DRAFT'
  ) then
    raise exception 'Bond the Duck must exist and remain DRAFT while founders are registered';
  end if;
end;
$$;

alter table public.burn_program_founders
  add column if not exists founder_label text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'burn_program_founders_label_check'
      and conrelid = 'public.burn_program_founders'::regclass
  ) then
    alter table public.burn_program_founders
      add constraint burn_program_founders_label_check
      check (founder_label is null or char_length(founder_label) between 1 and 80);
  end if;
end;
$$;

insert into public.campaign_founders (
  campaign_id, founder_user_id, founder_label, enabled
) values
  ('bond-the-duck-2026', 8560606243, '@darealrektrush', true),
  ('bond-the-duck-2026', 1767783978, '@AndrewNicholls', true)
on conflict (campaign_id, founder_user_id) do update
set founder_label = excluded.founder_label,
    enabled = true;

do $$
declare
  enabled_founders integer;
  expected_founders integer;
begin
  select count(*) into enabled_founders
  from public.campaign_founders
  where campaign_id = 'bond-the-duck-2026' and enabled;

  select count(*) into expected_founders
  from public.campaign_founders
  where campaign_id = 'bond-the-duck-2026'
    and enabled
    and (founder_user_id, founder_label) in (
      (8560606243::bigint, '@darealrektrush'),
      (1767783978::bigint, '@AndrewNicholls')
    );

  if enabled_founders <> 2 or expected_founders <> 2 then
    raise exception 'Bond the Duck requires exactly the two approved numeric founder identities';
  end if;
end;
$$;
