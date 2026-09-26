import { secretMatches } from './oracleIngest.js';

const CAMPAIGN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function oracleCampaignIntelligenceHandler({
  secret,
  getCampaignIntelligence,
}) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');

    if (!secretMatches(req.get('x-oracle-campaign-secret'), secret)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const body = req.body ?? {};
    const keys = Object.keys(body);
    const campaignId = body.campaign_id;

    if (
      keys.length !== 1 ||
      keys[0] !== 'campaign_id' ||
      typeof campaignId !== 'string' ||
      !CAMPAIGN_ID_RE.test(campaignId)
    ) {
      return res.status(400).json({ ok: false, error: 'invalid campaign_id' });
    }

    try {
      const intelligence = await getCampaignIntelligence(campaignId);
      if (
        !safeObject(intelligence) ||
        intelligence.campaign_id !== campaignId ||
        typeof intelligence.campaign_state !== 'string' ||
        intelligence.campaign_state.length < 1 ||
        intelligence.campaign_state.length > 40
      ) {
        throw new Error('invalid campaign intelligence');
      }

      return res.status(200).json({
        ok: true,
        intelligence,
      });
    } catch {
      return res.status(503).json({
        ok: false,
        error: 'campaign intelligence unavailable',
      });
    }
  };
}
