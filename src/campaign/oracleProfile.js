import { secretMatches } from './oracleIngest.js';

// Resolve the deployment's real Telegram bot without copying its token to Oracle.
export function oracleProfileAppHandler({ secret, botToken, fetchImpl = fetch }) {
  let appUrl = null;
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!secretMatches(req.get('x-oracle-campaign-secret'), secret)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    try {
      if (!appUrl) {
        if (!botToken) throw new Error('missing bot');
        const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/getMe`, {
          method: 'POST', signal: AbortSignal.timeout(5000),
        });
        const body = await response.json();
        const username = body?.result?.username;
        if (!response.ok || body.ok !== true || body.result.is_bot !== true || !/^[A-Za-z0-9_]{5,32}$/.test(username ?? '')) {
          throw new Error('bot identity unavailable');
        }
        appUrl = `https://t.me/${username}?start=campaigns`;
      }
      return res.status(200).json({ ok: true, appUrl });
    } catch {
      return res.status(503).json({ ok: false, error: 'campaign app unavailable' });
    }
  };
}

// This is a server-to-server route. Never expose the shared secret to the Mini App.
// The Oracle bot derives the actor from a private Telegram update before calling it.
export function oracleProfileHandler({ secret, getParticipantStatus, campaignId = 'bond-the-duck-2026', now = () => new Date() }) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!secretMatches(req.get('x-oracle-campaign-secret'), secret)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const id = req.body?.telegram_user_id;
    if (!Number.isSafeInteger(id) || id <= 0 || Object.keys(req.body).some(key => key !== 'telegram_user_id')) {
      return res.status(400).json({ ok: false, error: 'invalid telegram_user_id' });
    }
    try {
      if (campaignId !== 'bond-the-duck-2026') throw new Error('unsupported profile campaign');
      const participant = await getParticipantStatus(id);
      if (participant.unavailable) throw new Error('unavailable');
      const releases = [...(participant.rewards?.releases ?? [])]
        .sort((a, b) => String(b.scheduledAt ?? '').localeCompare(String(a.scheduledAt ?? '')))
        .slice(0, 3)
        .map(row => ({
          status: row.status,
          amountBaseUnits: row.amountBaseUnits,
          scheduledAt: row.scheduledAt,
          transactionSignature: row.transactionSignature,
        }));
      return res.status(200).json({ ok: true, profile: {
        telegramUserId: id,
        campaignId,
        campaignState: participant.campaignState,
        enrolled: participant.enrolled,
        walletVerified: participant.walletVerified,
        xVerified: participant.xVerified,
        totalXp: participant.totalXp,
        completedMissionCount: participant.completedMissionCount,
        releases,
        observedAt: now().toISOString(),
      } });
    } catch {
      // Do not log participant data or upstream response bodies.
      return res.status(503).json({ ok: false, error: 'campaign profile unavailable' });
    }
  };
}
