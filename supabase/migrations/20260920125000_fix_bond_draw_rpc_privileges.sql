-- Restore the audited draw RPC write path without reopening direct table inserts.
-- Draw ledgers remain non-insertable by service_role; only these explicitly
-- granted functions may write them.

alter function public.record_campaign_cycle_draw_commitment(text,integer,text)
  security definer;
alter function public.record_campaign_cycle_draw_cutoff(text,integer,bigint,text,timestamptz,bigint,text,timestamptz)
  security definer;
alter function public.record_campaign_cycle_draw_reveal(text,integer,text)
  security definer;
alter function public.finalize_campaign_cycle_draw(text,integer)
  security definer;

revoke all on function public.record_campaign_cycle_draw_commitment(text,integer,text)
  from public, anon, authenticated;
revoke all on function public.record_campaign_cycle_draw_cutoff(text,integer,bigint,text,timestamptz,bigint,text,timestamptz)
  from public, anon, authenticated;
revoke all on function public.record_campaign_cycle_draw_reveal(text,integer,text)
  from public, anon, authenticated;
revoke all on function public.finalize_campaign_cycle_draw(text,integer)
  from public, anon, authenticated;

grant execute on function public.record_campaign_cycle_draw_commitment(text,integer,text)
  to service_role;
grant execute on function public.record_campaign_cycle_draw_cutoff(text,integer,bigint,text,timestamptz,bigint,text,timestamptz)
  to service_role;
grant execute on function public.record_campaign_cycle_draw_reveal(text,integer,text)
  to service_role;
grant execute on function public.finalize_campaign_cycle_draw(text,integer)
  to service_role;
