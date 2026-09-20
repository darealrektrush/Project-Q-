-- Cover the Project Q Oracle Platform outbox campaign foreign key.
create index if not exists oracle_platform_outbox_campaign_idx
  on public.oracle_platform_outbox (campaign_id);
