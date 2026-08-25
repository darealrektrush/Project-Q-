-- Lock Bond the Duck to seven contiguous 48-hour active cycles.
-- This migration does not activate the campaign, allocate rewards, create a
-- transfer, or overwrite finalized cycle evidence.

alter table public.cycles drop constraint if exists cycles_cycle_id_check;
alter table public.cycles
  add constraint cycles_cycle_id_check check (cycle_id between 1 and 7);

alter table public.xp_ledger drop constraint if exists xp_ledger_cycle_id_check;
alter table public.xp_ledger
  add constraint xp_ledger_cycle_id_check check (cycle_id between 1 and 7);

alter table public.campaign_raid_events drop constraint if exists campaign_raid_events_cycle_id_check;
alter table public.campaign_raid_events
  add constraint campaign_raid_events_cycle_id_check check (cycle_id between 1 and 7);

alter table public.allocations drop constraint if exists allocations_cycle_id_check;
alter table public.allocations
  add constraint allocations_cycle_id_check check (cycle_id between 1 and 7);

alter table public.campaign_participation_events
  drop constraint if exists campaign_participation_events_cycle_id_check;
alter table public.campaign_participation_events
  add constraint campaign_participation_events_cycle_id_check check (cycle_id between 1 and 7);

do $$
begin
  if exists (
    select 1
    from public.cycles
    where campaign_id = 'bond-the-duck-2026'
      and (
        finalized_at is not null
        or cutoff_slot is not null
        or cutoff_blockhash is not null
        or commit_hash is not null
        or reveal_value is not null
      )
  ) then
    raise exception 'refusing to reschedule Bond the Duck after cycle evidence exists';
  end if;

  if exists (select 1 from public.campaigns where id = 'bond-the-duck-2026') then
    insert into public.cycles (
      campaign_id, cycle_id, opens_at, closes_at, allocation_base_units
    ) values
      ('bond-the-duck-2026', 1, '2026-09-01T15:00:00Z', '2026-09-03T15:00:00Z', 0),
      ('bond-the-duck-2026', 2, '2026-09-03T15:00:00Z', '2026-09-05T15:00:00Z', 0),
      ('bond-the-duck-2026', 3, '2026-09-05T15:00:00Z', '2026-09-07T15:00:00Z', 0),
      ('bond-the-duck-2026', 4, '2026-09-07T15:00:00Z', '2026-09-09T15:00:00Z', 0),
      ('bond-the-duck-2026', 5, '2026-09-09T15:00:00Z', '2026-09-11T15:00:00Z', 0),
      ('bond-the-duck-2026', 6, '2026-09-11T15:00:00Z', '2026-09-13T15:00:00Z', 0),
      ('bond-the-duck-2026', 7, '2026-09-13T15:00:00Z', '2026-09-15T15:00:00Z', 0)
    on conflict (campaign_id, cycle_id) do update set
      opens_at = excluded.opens_at,
      closes_at = excluded.closes_at;
  end if;
end;
$$;
