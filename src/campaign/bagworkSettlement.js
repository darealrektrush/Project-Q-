export async function settleCampaignBagworkXp(client, campaignId, { limit = 500 } = {}) {
  const campaignRows = await client.select(
    'campaigns',
    `?id=eq.${encodeURIComponent(campaignId)}&select=state&limit=1`
  );
  if (!['ACTIVE', 'VERIFYING'].includes(campaignRows[0]?.state)) {
    return { settled: [], pending: [], skipped: 'campaign is not accepting Bagwork settlement' };
  }

  const cycles = await client.select(
    'cycles',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=opens_at,closes_at&order=cycle_id.asc`
  );
  if (!cycles.length) {
    return { settled: [], pending: [], skipped: 'campaign cycles are unavailable' };
  }

  const opensAt = cycles[0].opens_at;
  const closesAt = cycles.at(-1).closes_at;
  const [payouts, events] = await Promise.all([
    client.select(
      'bagwork_payouts',
      `?user_id=not.is.null&paid_at=gte.${encodeURIComponent(opensAt)}&paid_at=lt.${encodeURIComponent(closesAt)}` +
        `&select=submission_id,paid_at&order=paid_at.asc&limit=${Math.max(1, Math.min(limit, 1000))}`
    ),
    client.select(
      'campaign_bagwork_events',
      `?campaign_id=eq.${encodeURIComponent(campaignId)}&select=submission_id,status&limit=1000`
    ),
  ]);

  const terminal = new Set(
    events
      .filter(({ status }) => ['CREDITED', 'CAPPED'].includes(status))
      .map(({ submission_id: submissionId }) => submissionId)
  );

  const settled = [];
  const pending = [];
  for (const payout of payouts) {
    if (terminal.has(payout.submission_id)) continue;
    try {
      const result = await client.rpc('settle_campaign_bagwork_payout', {
        p_campaign_id: campaignId,
        p_submission_id: payout.submission_id,
      });
      const row = Array.isArray(result) ? result[0] ?? null : result;
      if (row) {
        const amount = Number(row.creditedXp ?? row.credited_xp ?? 0);
        settled.push({
          submissionId: payout.submission_id,
          ...row,
          credited: row.status === 'CREDITED' && amount > 0,
          amount,
        });
      }
    } catch (error) {
      pending.push({ submissionId: payout.submission_id, reason: String(error?.message || 'settlement failed') });
    }
  }

  return { settled, pending, skipped: null };
}
