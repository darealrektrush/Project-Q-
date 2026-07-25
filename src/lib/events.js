import { supabase } from './supabase.js';

// Both Twitter Spaces and generic community events live in scheduled_events,
// distinguished by `kind` ('space' | 'event'). Admins add rows directly via
// Supabase for now.
export async function getUpcoming(kind, limit = 5) {
  return supabase.select(
    'scheduled_events',
    `?kind=eq.${kind}&cancelled=eq.false&starts_at=gte.${new Date().toISOString()}&order=starts_at.asc&limit=${limit}&select=title,description,link,starts_at`
  );
}

function formatEventLine(row) {
  const when = new Date(row.starts_at).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  const lines = [`*${row.title}*`, when];
  if (row.description) lines.push(row.description);
  if (row.link) lines.push(row.link);
  return lines.join('\n');
}

export async function buildUpcomingText(kind, { header, emptyText }) {
  const rows = await getUpcoming(kind);
  if (!rows?.length) return emptyText;
  return [header, '', ...rows.map(formatEventLine)].join('\n\n');
}
