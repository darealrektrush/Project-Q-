const DEV_SERVICE = 'project-q-dev';
const DEV_PROJECT_REF = 'awouccxagxglpvvuznxo';

export function assertDevDatabaseTarget(env = process.env) {
  if (env.RENDER_SERVICE_NAME !== DEV_SERVICE) return;

  const expected = `https://${DEV_PROJECT_REF}.supabase.co`;
  const actual = String(env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  if (actual !== expected) {
    throw new Error(`${DEV_SERVICE} requires the isolated Project Q Dev Supabase project`);
  }
}
