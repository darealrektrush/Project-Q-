const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function ensureCampaignProfile(client, {
  campaignId,
  telegramUserId,
}) {
  if (typeof campaignId !== 'string' || !campaignId.trim()) {
    throw new Error('invalid campaign identity request');
  }
  if (!Number.isSafeInteger(telegramUserId) || telegramUserId <= 0) {
    throw new Error('invalid campaign identity request');
  }

  const result = await client.rpc('ensure_project_q_campaign_profile', {
    p_campaign_id: campaignId,
    p_telegram_user_id: telegramUserId,
  });
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || !UUID_PATTERN.test(row.profile_id ?? '') || row.telegram_verified !== true) {
    throw new Error('Oracle campaign identity unavailable');
  }

  return {
    profileId: row.profile_id,
    profileState: row.profile_state,
    telegramVerified: true,
  };
}
