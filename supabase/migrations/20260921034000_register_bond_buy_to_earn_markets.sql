-- Register the only currently verified FAWKQ trading venue. PumpSwap remains
-- disabled until the on-chain Pump.fun migration creates a verifiable pool.
-- This does not activate the campaign or enable the Render ingestion bridge.

insert into public.campaign_buy_to_earn_markets (
  campaign_id, venue_key, label, enabled, evidence_url, verified_at
) values
  (
    'bond-the-duck-2026',
    'pump_fun',
    'FAWKQ Pump.fun bonding curve',
    true,
    'https://solscan.io/account/5DmR2TCRz8jJZTr5DaDpfvQHZ4z7YzU2sNX1kqzaM7sM',
    now()
  ),
  (
    'bond-the-duck-2026',
    'pump_swap',
    'FAWKQ PumpSwap pool after on-chain migration',
    false,
    null,
    null
  )
on conflict (campaign_id, venue_key) do update
set label = excluded.label,
    enabled = excluded.enabled,
    evidence_url = excluded.evidence_url,
    verified_at = excluded.verified_at,
    updated_at = now();
