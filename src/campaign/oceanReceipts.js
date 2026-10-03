import { verifyOceanContribution } from './oceanContributionProof.js';

export function oceanReceiptsEnabled(env = process.env) {
  return env.RENDER_SERVICE_NAME === 'project-q-dev' &&
    String(env.SUPABASE_URL || '').replace(/\/$/, '') === 'https://awouccxagxglpvvuznxo.supabase.co';
}

async function canonicalOceanProfile(client, { campaignId, telegramUserId }) {
  const identities = await client.select('identity_links',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
    '&select=profile_id&limit=1');
  const profileId = identities[0]?.profile_id;
  if (!profileId) throw new Error('Oracle verified profile required');
  return profileId;
}

export async function getOceanRecognitionState(client, identity) {
  const profileId = await canonicalOceanProfile(client, identity);
  const [preferences, progressRows] = await Promise.all([
    client.select('ocean_recognition_preferences',
      `?profile_id=eq.${encodeURIComponent(profileId)}` +
      '&select=display_mode,display_alias,shoutout_opt_in,display_consent_at&limit=1'),
    client.rpc('get_ocean_private_progress', { p_profile_id: profileId }),
  ]);
  if (!Array.isArray(preferences) || !Array.isArray(progressRows) || !progressRows[0]) {
    throw new Error('ocean recognition state unavailable');
  }
  const row = preferences[0];
  const progress = progressRows[0];
  return {
    preference: {
      displayMode: row?.display_mode || 'ANONYMOUS',
      alias: row?.display_mode === 'ALIAS' ? row.display_alias : null,
      shoutoutOptIn: false,
      consentAt: row?.display_consent_at || null,
    },
    progress: {
      contributions: Number(progress.contributions),
      days: Number(progress.contribution_days),
      founderReceipts: Number(progress.founder_receipts),
      status: 'PREVIEW',
    },
  };
}

export async function saveOceanRecognitionPreference(client, identity, { displayMode, alias }) {
  if (!['ANONYMOUS', 'PUBLIC', 'ALIAS'].includes(displayMode)) throw new Error('invalid recognition mode');
  const trimmedAlias = typeof alias === 'string' ? alias.trim() : '';
  if (displayMode === 'ALIAS' && (!/^[A-Za-z0-9_ .-]{3,30}$/.test(trimmedAlias) ||
    /^(admin|oracle|crabstar|project[ _.-]*q|fawkq|moderator|official)$/i.test(trimmedAlias))) {
    throw new Error('choose an alias of 3–30 letters, numbers or spaces');
  }
  const profileId = await canonicalOceanProfile(client, identity);
  const now = new Date().toISOString();
  const rows = await client.upsert('ocean_recognition_preferences', [{
    profile_id: profileId,
    display_mode: displayMode,
    display_alias: displayMode === 'ALIAS' ? trimmedAlias : null,
    display_consent_at: displayMode === 'ANONYMOUS' ? null : now,
    display_consent_version: displayMode === 'ANONYMOUS' ? null : 'draft-1',
    shoutout_opt_in: false,
    updated_at: now,
  }], 'profile_id');
  if (!Array.isArray(rows) || rows[0]?.profile_id !== profileId) {
    throw new Error('ocean recognition preference not saved');
  }
  return getOceanRecognitionState(client, identity);
}

export async function listOceanContributions(client, { campaignId, telegramUserId }) {
  const profileId = await canonicalOceanProfile(client, { campaignId, telegramUserId });
  const rows = await client.rpc('list_ocean_contribution_receipts', { p_profile_id: profileId });
  if (!Array.isArray(rows)) throw new Error('ocean receipt history unavailable');
  return rows.map((row) => ({
    id: row.id, asset: row.asset, amountBaseUnits: row.amount_base_units,
    decimals: row.decimals, signature: row.transaction_signature,
    blockTime: row.block_time, founderDeposit: row.founder_deposit,
  }));
}

export async function recordOceanContribution(client, connection, { campaignId, telegramUserId, signature }) {
  const identities = await client.select('identity_links',
    `?campaign_id=eq.${encodeURIComponent(campaignId)}&telegram_user_id=eq.${encodeURIComponent(String(telegramUserId))}` +
    '&select=profile_id,reward_wallet,wallet_verified_at&limit=1');
  const identity = identities[0];
  if (!identity?.profile_id || !identity?.reward_wallet || !identity?.wallet_verified_at) {
    throw new Error('Oracle verified profile and wallet required');
  }
  const proof = await verifyOceanContribution(connection, signature, identity.reward_wallet);
  if (!proof) return null;
  if (!Number.isSafeInteger(proof.blockTime) || proof.blockTime <= 0) {
    throw new Error('finalized block time required for a receipt');
  }
  const receipts = await client.rpc('record_ocean_contribution', {
    p_campaign_id: campaignId,
    p_telegram_user_id: telegramUserId,
    p_wallet: proof.wallet,
    p_signature: proof.signature,
    p_slot: proof.slot,
    p_block_time: new Date(proof.blockTime * 1000).toISOString(),
    p_transfers: proof.transfers,
  });
  if (!Array.isArray(receipts) || receipts.length !== proof.transfers.length ||
      receipts.some((receipt) => receipt.transaction_signature !== signature ||
        receipt.profile_id !== identity.profile_id)) {
    throw new Error('ocean receipt persistence failed');
  }
  return { proof, receipts: receipts.map((receipt) => ({
    id: receipt.id, asset: receipt.asset,
    amountBaseUnits: proof.transfers.find((transfer) => transfer.asset === receipt.asset)?.amountBaseUnits,
    decimals: receipt.decimals, signature: receipt.transaction_signature,
    blockTime: receipt.block_time, founderDeposit: receipt.founder_deposit,
  })) };
}
