import { supabase } from './supabase.js';
import { awardXp, getUserRank } from './xp.js';

const XP_PER_SOL = Number(process.env.XP_PER_SOL ?? 1000);

// Payload shape is TBD from the fawkq.com side; this is a placeholder until
// the real contract is defined.
export async function handleBagworkCompletion({ userId, taskId, solAwarded }) {
  if (!userId || !taskId || typeof solAwarded !== 'number' || solAwarded < 0) {
    throw new Error('invalid bagwork payload');
  }

  const xpAwarded = Math.round(solAwarded * XP_PER_SOL);

  await supabase.insert('bagwork_events', [
    { user_id: userId, task_id: taskId, sol_awarded: solAwarded, xp_awarded: xpAwarded },
  ]);

  await awardXp(userId, xpAwarded);
  const rank = await getUserRank(userId);

  return { xpAwarded, rank };
}
