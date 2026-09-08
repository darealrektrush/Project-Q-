import { createHash } from 'node:crypto';

const DRAW_WINNERS = 3;
const TOP_WINNERS = 2;
const MAX_HASH_VALUE = 1n << 256n;

function compareIds(left, right) {
  if (/^\d+$/.test(left) && /^\d+$/.test(right)) {
    const a = BigInt(left);
    const b = BigInt(right);
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return left.localeCompare(right);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizedCandidates(profiles) {
  if (!Array.isArray(profiles)) throw new Error('profiles must be an array');
  const seen = new Set();
  return profiles.map((profile) => {
    const telegramUserId = String(profile.telegramUserId ?? '');
    const score = Number(profile.score);
    const weight = Number(profile.weight);
    if (!/^\d+$/.test(telegramUserId)) throw new Error('invalid Telegram user id');
    if (seen.has(telegramUserId)) throw new Error('duplicate Telegram user id');
    if (!Number.isSafeInteger(score) || score < 0) throw new Error('invalid verified score');
    if (!Number.isSafeInteger(weight) || weight < 0) throw new Error('invalid draw weight');
    seen.add(telegramUserId);
    return {
      telegramUserId,
      score,
      weight,
      eligible: profile.eligible === true && profile.admin !== true,
    };
  });
}

function drawTicket(seedHash, drawIndex, totalWeight) {
  const range = BigInt(totalWeight);
  const ceiling = MAX_HASH_VALUE - (MAX_HASH_VALUE % range);
  for (let nonce = 0; ; nonce += 1) {
    const digest = sha256(`${seedHash}:${drawIndex}:${nonce}`);
    const value = BigInt(`0x${digest}`);
    if (value < ceiling) return { ticket: Number(value % range), digest, nonce };
  }
}

export function selectCycleWinners({ campaignId, cycleId, profiles, publicSeed }) {
  if (!campaignId || !Number.isInteger(cycleId) || cycleId < 1) {
    throw new Error('invalid campaign cycle');
  }
  if (typeof publicSeed !== 'string' || publicSeed.length < 16) {
    throw new Error('public draw seed is required');
  }

  const eligible = normalizedCandidates(profiles).filter(({ eligible }) => eligible);
  if (eligible.length < TOP_WINNERS + DRAW_WINNERS) {
    throw new Error('at least five eligible profiles are required');
  }

  const ranked = [...eligible].sort((a, b) =>
    b.score - a.score || compareIds(a.telegramUserId, b.telegramUserId)
  );
  const top = ranked.slice(0, TOP_WINNERS);
  let pool = ranked
    .slice(TOP_WINNERS)
    .filter(({ weight }) => weight > 0)
    .sort((a, b) => compareIds(a.telegramUserId, b.telegramUserId));
  if (pool.length < DRAW_WINNERS) throw new Error('at least three weighted profiles are required');

  const seedHash = sha256(`${campaignId}:${cycleId}:${publicSeed}`);
  const draws = [];
  const audit = [];
  for (let drawIndex = 1; drawIndex <= DRAW_WINNERS; drawIndex += 1) {
    const totalWeight = pool.reduce((sum, profile) => sum + profile.weight, 0);
    const proof = drawTicket(seedHash, drawIndex, totalWeight);
    let cursor = proof.ticket;
    const selectedIndex = pool.findIndex(({ weight }) => {
      if (cursor < weight) return true;
      cursor -= weight;
      return false;
    });
    const [selected] = pool.splice(selectedIndex, 1);
    draws.push(selected);
    audit.push({
      drawIndex,
      digest: proof.digest,
      nonce: proof.nonce,
      ticket: proof.ticket,
      totalWeight,
      selectedTelegramUserId: selected.telegramUserId,
    });
  }

  return {
    campaignId,
    cycleId,
    seedHash,
    winners: [
      ...top.map((profile, index) => ({
        position: index + 1,
        telegramUserId: profile.telegramUserId,
        selection: 'auto_top2',
        drawIndex: null,
        score: profile.score,
        weight: profile.weight,
      })),
      ...draws.map((profile, index) => ({
        position: index + TOP_WINNERS + 1,
        telegramUserId: profile.telegramUserId,
        selection: 'weighted_draw',
        drawIndex: index + 1,
        score: profile.score,
        weight: profile.weight,
      })),
    ],
    audit,
  };
}
