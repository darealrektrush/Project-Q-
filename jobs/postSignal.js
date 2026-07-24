import 'dotenv/config';
import { createAndPostSignal } from '../src/lib/signal.js';

createAndPostSignal()
  .then((row) => {
    console.log(`Posted signal ${row.id} (${row.kind})`);
  })
  .catch((err) => {
    console.error('postSignal job failed', err);
    process.exit(1);
  });
