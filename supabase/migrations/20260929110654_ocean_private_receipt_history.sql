-- Return original integer units as text; JSON numbers can lose precision in JavaScript.
create function public.list_ocean_contribution_receipts(p_profile_id uuid)
returns table (
  id bigint, asset text, amount_base_units text, decimals smallint,
  transaction_signature text, block_time timestamptz, founder_deposit boolean
)
language sql stable security invoker set search_path = '' as $$
  select r.id, r.asset, r.amount_base_units::text, r.decimals,
    r.transaction_signature, r.block_time, r.founder_deposit
  from public.ocean_contribution_receipts as r
  where r.profile_id = p_profile_id
  order by r.block_time desc, r.id desc
  limit 30;
$$;

revoke all on function public.list_ocean_contribution_receipts(uuid) from public, anon, authenticated;
grant execute on function public.list_ocean_contribution_receipts(uuid) to service_role;
