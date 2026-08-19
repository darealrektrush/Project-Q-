import 'dotenv/config';
import { createAndPostSignal } from '../src/lib/signal.js';
import { requireEnv, signalsEnabled } from '../src/lib/featureFlags.js';

async function main() {
  if (!signalsEnabled()) {
    console.log('Signal posting disabled: PROJECT_Q_SIGNALS_ENABLED is not true.');
    return null;
  }

  requireEnv([
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
  ]);

  return createAndPostSignal();
}

main()
  .then((row) => {
    if (!row) return;
    console.log(`Posted signal ${row.id} (${row.kind})`);
  })
  .catch((err) => {
    console.error('postSignal job failed', err);
    process.exit(1);
  });
