import { supabase } from './supabase.js';

export function ensureUser(userId, username) {
  return supabase.upsert('users', [{ id: userId, username }], 'id');
}

export async function awardXp(userId, xpAmount, pointsAmount = xpAmount) {
  const rows = await supabase.rpc('increment_user_xp', {
    p_user_id: userId,
    p_xp: xpAmount,
    p_points: pointsAmount,
  });
  return rows[0];
}

export function getLeaderboard(limit = 10) {
  return supabase.select('leaderboard', `?order=xp.desc&limit=${limit}`);
}

export async function getUserRank(userId) {
  const rows = await supabase.select('leaderboard', `?id=eq.${userId}`);
  return rows[0] ?? null;
}
