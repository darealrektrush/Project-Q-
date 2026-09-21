import { runBondAutomatedRehearsal } from '../src/campaign/automatedRehearsal.js';

try {
  const report = runBondAutomatedRehearsal({
    profileCount: Number(process.env.BOND_REHEARSAL_PROFILE_COUNT || 30),
  });
  console.log(JSON.stringify(report, null, 2));
  if (!report.automatedReady || report.launchReady) process.exitCode = 1;
} catch (error) {
  console.error('Bond automated rehearsal failed:', error.message);
  process.exitCode = 1;
}
