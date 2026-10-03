// Shared by the Mini App and Telegram launcher. These are display rules only;
// server-side eligibility and settlement remain authoritative.
export function participantClearance(profile = {}, eligibility = {}) {
  const minimumUsd = Number(eligibility.minimumFawkqUsd ?? 2);
  const walletRequired = eligibility.walletRequiredForRewards !== false || minimumUsd > 0;
  return [
    eligibility.telegramRequired !== false && { key: 'telegram', label: 'Telegram identity', complete: Boolean(profile.telegramVerified), detail: 'Open Project Q from the official Telegram bot.', action: 'telegram' },
    eligibility.oracleXRequired !== false && { key: 'x', label: 'X linked through Oracle', complete: Boolean(profile.xVerified), detail: 'Connect the X account used for eligible operation activity.', action: 'x' },
    walletRequired && { key: 'wallet', label: 'Reward wallet', complete: Boolean(profile.walletVerified), detail: 'Verify your reward wallet through Oracle.', action: 'wallet-verify' },
    walletRequired && minimumUsd > 0 && { key: 'token-account', label: 'FAWKQ token account', complete: Boolean(profile.tokenAccountReady), detail: 'Check the FAWKQ token account on your verified reward wallet.', action: 'wallet' },
    minimumUsd > 0 && { key: 'holder', label: `Minimum $${minimumUsd} FAWKQ`, complete: Boolean(profile.holderEligible), detail: `Hold at least $${minimumUsd} of FAWKQ in your verified reward wallet.`, action: 'wallet' },
  ].filter(Boolean);
}

export function participantNextStep({ profile = {}, eligibility, lifecycle = 'UPCOMING', sessionStatus, oracleAvailable = false } = {}) {
  if (sessionStatus === 'identity-unavailable') return { label: 'Identity Sync', title: 'Sync Oracle Identity', detail: 'Telegram is confirmed. Your operation profile is temporarily unavailable.', action: 'RETRY', retry: true, brand: 'q' };

  const clearance = participantClearance(profile, eligibility);
  const nextAction = clearance.find(item => !item.complete && ['x', 'wallet-verify'].includes(item.action));
  if (nextAction) {
    const oraclePending = !oracleAvailable;
    const isX = nextAction.action === 'x';
    return {
      label: 'Operation Access',
      title: oraclePending ? 'Secure connection unavailable' : isX ? 'Connect your X account' : 'Verify your reward wallet',
      detail: oraclePending ? 'Open Project Q from Telegram to continue.' : isX
        ? 'One secure X consent. Project Q refreshes when you return.'
        : 'Sign one readable ownership message. No transaction or SOL fee.',
      action: isX ? 'CONNECT X' : 'VERIFY WALLET',
      screen: 'profile',
      profileView: 'overview',
      brand: 'oracle',
    };
  }

  const automaticPending = clearance.find(item => !item.complete);
  if (automaticPending) {
    return {
      label: 'Operation Access',
      title: 'Finishing automatic checks',
      detail: automaticPending.key === 'telegram'
        ? 'Telegram identity is synchronizing from the signed Mini App session.'
        : 'Project Q is checking token-account and holder eligibility from your verified wallet.',
      action: 'VIEW STATUS',
      screen: 'profile',
      profileView: 'overview',
      brand: 'oracle',
    };
  }

  const steps = {
    ACTIVE: ['Choose a Mission File', 'Complete an available objective and follow its verified result in Record.', 'VIEW MISSIONS', 'operations', 'missions'],
    REVIEWING: ['Follow final review', 'New scoring is closed while verified activity and allocations are reconciled.', 'OPEN BRIEFING', 'operations', 'overview'],
    DISTRIBUTING: ['Track reward delivery', 'Follow scheduled releases and confirmed receipts in Rewards.', 'OPEN REWARDS', 'rewards'],
    COMPLETED: ['Review your operation history', 'Your settled XP and outcomes remain available in Record.', 'OPEN RECORD', 'record'],
    ARCHIVED: ['Review your operation history', 'This operation is archived. Your verified history remains available.', 'OPEN RECORD', 'record'],
    TERMINATED: ['Operation closed', 'Participation has ended. Review existing outcomes and receipts.', 'OPEN RECORD', 'record'],
    PAUSED: ['Operation paused', 'Participation is closed. Follow the status in Briefing.', 'OPEN BRIEFING', 'operations', 'overview'],
    'LAUNCH BLOCKED': ['Launch gates incomplete', 'Participation remains closed until the operation passes its launch gates.', 'OPEN BRIEFING', 'operations', 'overview'],
    UPCOMING: ['Prepare for the operation', 'Your access is ready. Review Mission Files before participation opens.', 'VIEW MISSIONS', 'operations', 'missions'],
  };
  const [title, detail, action, screen, operationsView] = steps[lifecycle] || ['Check operation status', 'The operation status is being synchronized.', 'OPEN BRIEFING', 'operations', 'overview'];
  return { label: 'Next Step', title, detail, action, screen, operationsView, brand: 'q' };
}
