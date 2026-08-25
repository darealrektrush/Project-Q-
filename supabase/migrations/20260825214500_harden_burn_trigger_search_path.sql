-- Pin the append-only burn-ledger trigger to a trusted search path.
-- This is intentionally separate from the original Earn-to-Burn migration so
-- already-provisioned environments receive the same hardening safely.

alter function public.reject_immutable_burn_ledger_mutation()
  set search_path = pg_catalog;
