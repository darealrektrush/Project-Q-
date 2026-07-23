import { supabase } from './supabase.js';

export async function getMenuContent(key) {
  const rows = await supabase.select('menu_content', `?key=eq.${key}&select=*`);
  return rows?.[0] ?? null;
}

export async function getAllMenuContent() {
  const rows = await supabase.select('menu_content', '?select=*');
  const map = {};
  for (const row of rows ?? []) map[row.key] = row;
  return map;
}

export function upsertMenuContent(key, patch, updatedBy) {
  return supabase.upsert(
    'menu_content',
    [{ key, ...patch, updated_by: updatedBy, updated_at: new Date().toISOString() }],
    'key'
  );
}
