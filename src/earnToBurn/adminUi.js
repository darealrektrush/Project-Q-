import { formatTokenBaseUnits } from './economics.js';

export function buildBurnWorkflowAdminText(state, { controlsEnabled = false } = {}) {
  if (!state.program) {
    return [
      '🔥 *EARN TO BURN // WORKFLOW*',
      '',
      'Program: Not configured',
      'No proposal, approval, signature or burn action is available.',
    ].join('\n');
  }
  const approvedSources = state.sourceAccounts.filter(({ approved, verified_at, evidence_url }) =>
    approved && verified_at && evidence_url
  ).length;
  const latest = state.proposals[0] ?? null;
  const latestReceipt = state.receipts[0] ?? null;
  const drafts = latestReceipt?.publicationDrafts ?? [];
  const approvals = latest?.approvals.filter(({ decision }) => decision === 'APPROVE').length ?? 0;
  return [
    '🔥 *EARN TO BURN // WORKFLOW*',
    controlsEnabled
      ? '_Founder review controls enabled • Project Q still has no signer_'
      : '_Read-only operational state • Project Q has no signer_',
    '',
    `*Program:* ${state.program.state}`,
    `*Approved sources:* ${approvedSources}/${state.sourceAccounts.length}`,
    `*Milestones:* ${state.milestones.length}`,
    `*Unlocked:* ${state.milestones.filter(({ state: milestoneState }) => milestoneState === 'UNLOCKED').length}`,
    `*Proposals:* ${state.proposals.length}`,
    '',
    latest ? [
      `*Latest proposal:* #${latest.id}`,
      `*State:* ${latest.state}`,
      `*Amount:* ${formatTokenBaseUnits(latest.amount_base_units, state.program.decimals)} FAWKQ`,
      `*Founder approvals:* ${approvals}/2`,
      `*External signature:* ${latest.transaction_signature ? 'Attached' : 'Not attached'}`,
    ].join('\n') : '*Latest proposal:* None',
    '',
    latestReceipt ? [
      `*Latest receipt:* ${latestReceipt.receipt_code}`,
      `*Publication drafts:* ${drafts.length}`,
      `*Approved:* ${drafts.filter(({ state: draftState }) => draftState === 'APPROVED').length}`,
      `*Published:* ${drafts.filter(({ state: draftState }) => draftState === 'PUBLISHED').length}`,
    ].join('\n') : '*Latest receipt:* None',
    '',
    controlsEnabled
      ? '_Review actions record decisions only. Project Q cannot sign or execute a burn._'
      : '_Milestone creation, founder decisions and signature attachment remain unavailable from this read-only panel._',
  ].join('\n');
}

function findProposal(state, proposalId) {
  return state.proposals.find(({ id }) => String(id) === String(proposalId)) ?? null;
}

function findDraft(state, draftId) {
  for (const receipt of state.receipts) {
    const draft = receipt.publicationDrafts.find(({ id }) => String(id) === String(draftId));
    if (draft) return { draft, receipt };
  }
  return null;
}

export function buildBurnWorkflowKeyboard(state, { controlsEnabled = false } = {}) {
  const rows = [];
  if (controlsEnabled) {
    const proposal = state.proposals.find(({ state: proposalState }) =>
      ['PENDING_APPROVAL', 'HELD'].includes(proposalState)
    );
    if (proposal) rows.push([{
      text: `🔎 Review Proposal #${proposal.id}`,
      callback_data: `admin:burnreview:${proposal.id}`,
    }]);
    const drafts = state.receipts.flatMap(({ publicationDrafts }) => publicationDrafts)
      .filter(({ state: draftState }) => ['DRAFT', 'HELD', 'FAILED'].includes(draftState))
      .slice(0, 4);
    for (const draft of drafts) {
      rows.push([{
        text: `📝 Review ${draft.platform} Draft`,
        callback_data: `admin:burnpubreview:${draft.id}`,
      }]);
    }
  }
  rows.push([{ text: '🔄 Refresh', callback_data: 'admin:burnflow' }]);
  rows.push([{ text: '⬅️ Back to Earn to Burn', callback_data: 'admin:burn' }]);
  return { inline_keyboard: rows };
}

export function buildBurnProposalReview(state, proposalId) {
  const proposal = findProposal(state, proposalId);
  if (!proposal || !['PENDING_APPROVAL', 'HELD'].includes(proposal.state)) {
    throw new Error('burn proposal is no longer accepting founder decisions');
  }
  const milestone = state.milestones.find(({ id }) => id === proposal.milestone_id);
  const decisions = proposal.approvals.map(({ decision }) => decision);
  return {
    proposal,
    text: [
      `🔥 <b>BURN PROPOSAL #${escapeHtml(proposal.id)}</b>`,
      '<i>Review the exact terms before recording a founder decision.</i>',
      '',
      `<b>Milestone:</b> ${escapeHtml(milestone?.label ?? proposal.milestone_id)}`,
      `<b>State:</b> ${escapeHtml(proposal.state)}`,
      `<b>Type:</b> ${escapeHtml(proposal.burn_type)}`,
      `<b>Amount:</b> ${escapeHtml(formatTokenBaseUnits(proposal.amount_base_units, state.program.decimals))} FAWKQ`,
      `<b>Source account:</b> <code>${escapeHtml(proposal.source_token_account)}</code>`,
      `<b>Mint:</b> <code>${escapeHtml(state.program.mint)}</code>`,
      `<b>Rules hash:</b> <code>${escapeHtml(proposal.rules_hash)}</code>`,
      `<b>Recorded approvals:</b> ${decisions.filter((decision) => decision === 'APPROVE').length}/2`,
      `<b>Holds:</b> ${decisions.filter((decision) => decision === 'HOLD').length}`,
      `<b>Cancellations:</b> ${decisions.filter((decision) => decision === 'CANCEL').length}/2`,
      '',
      '<i>Approve records consent; it does not sign or execute a transaction.</i>',
    ].join('\n'),
    keyboard: {
      inline_keyboard: [
        [{ text: '✅ Approve Terms', callback_data: `admin:burndecide:${proposal.id}:APPROVE` }],
        [{ text: '⏸ Hold', callback_data: `admin:burndecide:${proposal.id}:HOLD` }],
        [{ text: '🛑 Cancel', callback_data: `admin:burndecide:${proposal.id}:CANCEL` }],
        [{ text: '⬅️ Back to Workflow', callback_data: 'admin:burnflow' }],
      ],
    },
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);
}

export function buildPublicationDraftReview(state, draftId) {
  const result = findDraft(state, draftId);
  if (!result || !['DRAFT', 'HELD', 'FAILED'].includes(result.draft.state)) {
    throw new Error('publication draft is no longer accepting approval');
  }
  const { draft, receipt } = result;
  const text = [
    `<b>🔥 BURN PUBLICATION REVIEW</b>`,
    `<i>Review the exact stored content before approval.</i>`,
    '',
    `<b>Receipt:</b> ${escapeHtml(receipt.receipt_code)}`,
    `<b>Platform:</b> ${escapeHtml(draft.platform)}`,
    `<b>State:</b> ${escapeHtml(draft.state)}`,
    `<b>Content hash:</b> <code>${escapeHtml(draft.body_hash)}</code>`,
    '',
    `<pre>${escapeHtml(draft.body)}</pre>`,
    '',
    `<i>Approval applies only to this exact content hash. Publishing remains a separate action.</i>`,
  ].join('\n');
  if (text.length > 4000) {
    throw new Error('publication draft exceeds the safe Telegram review limit');
  }
  return {
    draft,
    text,
    keyboard: {
      inline_keyboard: [
        [{ text: '✅ Approve Exact Draft', callback_data: `admin:burnpubapprove:${draft.id}` }],
        [{ text: '⬅️ Back to Workflow', callback_data: 'admin:burnflow' }],
      ],
    },
  };
}
