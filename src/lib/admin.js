import * as telegram from './telegram.js';
import { getMenuContent, upsertMenuContent } from './menuContent.js';
import { supabase } from './supabase.js';
import { getCampaignReadiness } from '../campaign/service.js';
import { buildCampaignReadinessText } from '../campaign/ui.js';
import {
  buildSourceCertificationAdminText,
  getVerificationSourceCertificationState,
} from '../campaign/sourceCertifications.js';
import {
  buildCampaignReadinessApprovalKeyboard,
  buildCampaignReadinessApprovalText,
  getCampaignReadinessApprovalStatus,
  readinessDecisionIdempotencyKey,
  recordCampaignReadinessDecision,
} from '../campaign/readinessApprovals.js';
import {
  buildRulesGovernanceKeyboard,
  buildRulesGovernanceText,
  finalizeApprovedRules,
  getCampaignRulesGovernanceState,
  recordFinalRulesDecision,
  rulesGovernanceIdempotencyKey,
} from '../campaign/rulesGovernance.js';
import {
  decideWebsiteVoteReview,
  getWebsiteVoteReviewEvidence,
  getWebsiteVoteReviewQueue,
} from '../campaign/websiteVoteReviewQueue.js';
import { getEarnToBurnSummary } from '../earnToBurn/service.js';
import { buildEarnToBurnAdminText } from '../earnToBurn/ui.js';
import {
  buildBurnProposalReview,
  buildBurnWorkflowAdminText,
  buildBurnWorkflowKeyboard,
  buildPublicationDraftReview,
} from '../earnToBurn/adminUi.js';
import { DEFAULT_EARN_TO_BURN_PROGRAM_ID } from '../earnToBurn/service.js';
import {
  approvePublicationDraft,
  getBurnWorkflowState,
  recordFounderDecision,
} from '../earnToBurn/workflow.js';
import {
  campaignReadinessApprovalsEnabled,
  campaignRulesGovernanceEnabled,
  earnToBurnEnabled,
  websiteVoteReviewEnabled,
} from './featureFlags.js';

const EDITABLE_KEYS = [
  ['home', 'Home menu'],
  ['help', 'Help'],
  ['market', 'Market'],
  ['leaderboard', 'Leaderboard'],
  ['money', 'Eyes On The Money'],
  ['events', 'Events'],
  ['links', 'Official Links'],
  ['about', 'About FawkQ'],
  ['rewards', 'Rewards'],
  ['bagwork', 'Bagwork'],
  ['bagworkboard', 'Bag Workers Leaderboard'],
  ['receipts', 'Receipts'],
  ['wallets', 'Wallets'],
  ['missions', 'Missions'],
  ['meme', 'Meme'],
  ['feed', 'Feed'],
  ['ask', 'Ask'],
  ['spaces', 'Spaces'],
  ['door', 'Door'],
];
const LABELS = Object.fromEntries(EDITABLE_KEYS);

const PENDING_TTL_MS = 5 * 60 * 1000;
// `${chatId}:${userId}` -> { key, field, stage: 'input' | 'confirm', draft, expires }
// stage 'input': waiting for the admin to send new text/photo.
// stage 'confirm': draft received, waiting for Publish/Discard on the preview.
const pending = new Map();

function pendingKey(chatId, userId) {
  return `${chatId}:${userId}`;
}

export function hasPendingEdit(chatId, userId) {
  const entry = pending.get(pendingKey(chatId, userId));
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    pending.delete(pendingKey(chatId, userId));
    return false;
  }
  return true;
}

export function cancelPendingEdit(chatId, userId) {
  pending.delete(pendingKey(chatId, userId));
  return telegram.sendMessage(chatId, 'Admin edit cancelled.', {});
}

export function isConfiguredPrivateAdmin(userId) {
  const configured = (process.env.TELEGRAM_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return configured.includes(String(userId));
}

export async function isGroupAdmin(chatId, userId) {
  try {
    const member = await telegram.getChatMember(chatId, userId);
    return member.status === 'creator' || member.status === 'administrator';
  } catch (err) {
    console.error('isGroupAdmin check failed', err);
    return false;
  }
}

export function isAuthorizedAdmin(chatId, userId, chatType) {
  if (chatType === 'private') return Promise.resolve(isConfiguredPrivateAdmin(userId));
  return isGroupAdmin(chatId, userId);
}

export function buildAdminRootKeyboard() {
  const rows = EDITABLE_KEYS.map(([key, label]) => [
    { text: label, callback_data: `admin:item:${key}` },
  ]);
  return {
    inline_keyboard: [
      [{ text: '🦆 Campaigns', callback_data: 'admin:campaign' }],
      ...rows,
    ],
  };
}

export function buildCampaignAdminKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🦆 Bond the Duck', callback_data: 'admin:campaign:bond' }],
      [{ text: '⬅️ Back to Admin', callback_data: 'admin:back' }],
    ],
  };
}

export function buildBondAdminKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📋 Readiness', callback_data: 'admin:readiness' }],
      [{ text: '🛡 Source Certifications', callback_data: 'admin:sourcecerts' }],
      [{ text: '🗳 Website Vote Reviews', callback_data: 'admin:votequeue:0' }],
      [{ text: '🔐 Launch Approvals', callback_data: 'admin:launchapprovals' }],
      [{ text: '📜 Final Rules', callback_data: 'admin:rulesflow' }],
      [{ text: '🔥 Earn to Burn', callback_data: 'admin:burn' }],
      [{ text: '🧾 Burn Workflow', callback_data: 'admin:burnflow' }],
      [{ text: '⬅️ Back to Campaigns', callback_data: 'admin:campaign' }],
    ],
  };
}

export function buildWebsiteVoteReviewQueueText(queue, { offset = 0, pageSize = 10 } = {}) {
  const start = Math.max(0, Number(offset) || 0);
  const items = queue.items.slice(start, start + pageSize);
  const lines = [
    '🗳 *Website Vote Review Queue*',
    '',
    `${queue.items.length} pending private proof${queue.items.length === 1 ? '' : 's'}`,
    'Oldest evidence is reviewed first. Opening a proof does not approve it.',
    '',
  ];
  if (!items.length) lines.push('_No website vote proofs are waiting for review._');
  for (const item of items) {
    const risks = item.riskFlags.length ? ` · ${item.riskFlags.length} gate${item.riskFlags.length === 1 ? '' : 's'}` : '';
    lines.push(`*#${item.id} · ${telegram.escapeMarkdown(item.sourceName)}*`);
    lines.push(`${telegram.escapeMarkdown(item.participantTag)} · ${item.ageMinutes ?? '—'}m waiting${risks}`);
  }
  lines.push('', '_Private founder review · no evidence URLs are exposed_');
  return lines.join('\n');
}

export function buildWebsiteVoteReviewQueueKeyboard(queue, { offset = 0, pageSize = 10 } = {}) {
  const start = Math.max(0, Number(offset) || 0);
  const items = queue.items.slice(start, start + pageSize);
  const rows = items.map((item) => [{
    text: `Review #${item.id} · ${item.sourceName}`,
    callback_data: `admin:votereview:${item.id}`,
  }]);
  const pagination = [];
  if (start > 0) pagination.push({ text: '← Newer', callback_data: `admin:votequeue:${Math.max(0, start - pageSize)}` });
  if (start + pageSize < queue.items.length) pagination.push({ text: 'Older →', callback_data: `admin:votequeue:${start + pageSize}` });
  if (pagination.length) rows.push(pagination);
  rows.push([{ text: '🔄 Refresh', callback_data: `admin:votequeue:${start}` }]);
  rows.push([{ text: '⬅️ Back to Bond the Duck', callback_data: 'admin:campaign:bond' }]);
  return { inline_keyboard: rows };
}

export function buildWebsiteVoteReviewCaption(item) {
  const risks = item.riskFlags.length
    ? item.riskFlags.map((flag) => `• ${flag.replaceAll('_', ' ')}`).join('\n')
    : '• No automated gate warnings';
  return [
    `🗳 *Website Vote Proof #${item.id}*`,
    '',
    `Source: *${telegram.escapeMarkdown(item.sourceName)}*`,
    `Participant: ${telegram.escapeMarkdown(item.participantTag)}`,
    `Submitted: ${telegram.escapeMarkdown(item.submittedAt || 'Unavailable')}`,
    `Waiting: ${item.ageMinutes ?? '—'} minutes`,
    `Proof hash: \`${item.proofSha256.slice(0, 12)}…\``,
    '',
    '*Automated gates*',
    risks,
    '',
    '_Compare the visible source, FAWKQ identity and post-vote/cooldown state before deciding._',
  ].join('\n');
}

export function buildWebsiteVoteReviewDecisionKeyboard(item) {
  return {
    inline_keyboard: [
      [{ text: '✅ Approve verified vote', callback_data: `admin:votedecide:${item.id}:a` }],
      [
        { text: '❌ Unclear proof', callback_data: `admin:votedecide:${item.id}:r-format` },
        { text: '❌ Wrong source', callback_data: `admin:votedecide:${item.id}:r-source` },
      ],
      [
        { text: '❌ Timing', callback_data: `admin:votedecide:${item.id}:r-timing` },
        { text: '❌ Duplicate', callback_data: `admin:votedecide:${item.id}:r-duplicate` },
      ],
      [{ text: '🔒 Privacy resubmit', callback_data: `admin:votedecide:${item.id}:r-privacy` }],
      [{ text: '⬅️ Back to queue', callback_data: 'admin:votequeue:0' }],
    ],
  };
}

async function getLaunchApprovalPanel(userId, chatType) {
  const readiness = await getCampaignReadiness(supabase);
  const status = await getCampaignReadinessApprovalStatus(supabase, {
    campaignId: readiness.campaignId,
    reportVersion: readiness.reportVersion,
    reportHash: readiness.reportHash,
    readinessReady: readiness.ready,
    campaignState: readiness.state,
  });
  const controlsEnabled = chatType === 'private'
    && campaignReadinessApprovalsEnabled()
    && status.founders.some(({ founderUserId }) => String(founderUserId) === String(userId));
  return { readiness, status, controlsEnabled };
}

async function getRulesGovernancePanel(userId, chatType) {
  const state = await getCampaignRulesGovernanceState(
    supabase,
    process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? 'bond-the-duck-2026'
  );
  const controlsEnabled = chatType === 'private'
    && campaignRulesGovernanceEnabled()
    && state.founders.some(({ founderUserId }) => String(founderUserId) === String(userId));
  return { state, controlsEnabled };
}

function itemKeyboard(key) {
  return {
    inline_keyboard: [
      [
        { text: '✏️ Edit bio', callback_data: `admin:editbio:${key}` },
        { text: '🖼 Edit media', callback_data: `admin:editmedia:${key}` },
      ],
      [{ text: '⬅️ Back', callback_data: 'admin:back' }],
    ],
  };
}

function confirmKeyboard(field, key) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Publish', callback_data: `admin:confirm:${field}:${key}` },
        { text: '❌ Discard', callback_data: `admin:discard:${field}:${key}` },
      ],
    ],
  };
}

// Renders exactly what the live command will look like with the draft
// change applied (merged with whatever's already saved), so an admin can
// see it before publishing. Attaches Publish/Discard buttons.
async function sendPreview(chatId, threadId, key, field, draft) {
  const content = await getMenuContent(key);
  const label = LABELS[key] ?? key;

  const text =
    field === 'bio'
      ? draft
      : content?.bio_text || `_(live default text for ${label} will show here instead)_`;
  const mediaFileId = field === 'media' ? draft : content?.media_file_id;

  const preview = `👀 *Preview — ${label}*\n\n${text}`;
  const replyMarkup = confirmKeyboard(field, key);

  if (mediaFileId) {
    return telegram.sendPhoto(chatId, mediaFileId, preview, { threadId, replyMarkup });
  }
  return telegram.sendMessage(chatId, preview, { threadId, replyMarkup });
}

export async function handleAdminCommand(message) {
  const chatId = message.chat.id;
  const threadId = message.message_thread_id;
  const userId = message.from.id;

  if (!(await isAuthorizedAdmin(chatId, userId, message.chat.type))) {
    return telegram.sendMessage(chatId, '🚫 You are not authorized to use the Project Q admin panel.', { threadId });
  }

  return telegram.sendMessage(chatId, '🛠 *Admin panel* — choose a menu/command to edit:', {
    threadId,
    replyMarkup: buildAdminRootKeyboard(),
  });
}

export async function handleAdminCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const threadId = callbackQuery.message.message_thread_id;
  const userId = callbackQuery.from.id;
  const messageId = callbackQuery.message.message_id;

  if (!(await isAuthorizedAdmin(chatId, userId, callbackQuery.message.chat.type))) {
    return telegram.sendMessage(chatId, '🚫 You are not authorized to use the Project Q admin panel.', { threadId });
  }

  const [, action, arg1, arg2] = callbackQuery.data.split(':');

  if (action === 'campaign') {
    if (arg1 === 'bond') {
      return telegram.editMessageText(chatId, messageId, [
        '🦆 *Bond the Duck // Campaign Controls*',
        '',
        'Review launch readiness without scheduling, funding or activating the campaign.',
      ].join('\n'), { replyMarkup: buildBondAdminKeyboard() });
    }
    return telegram.editMessageText(chatId, messageId, '🦆 *Campaigns* — choose a campaign:', {
      replyMarkup: buildCampaignAdminKeyboard(),
    });
  }

  if (action === 'readiness') {
    try {
      const readiness = await getCampaignReadiness(supabase);
      return telegram.editMessageText(chatId, messageId, buildCampaignReadinessText(readiness), {
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🔄 Refresh', callback_data: 'admin:readiness' }],
            [{ text: '⬅️ Back to Bond the Duck', callback_data: 'admin:campaign:bond' }],
          ],
        },
      });
    } catch (err) {
      console.error('campaign readiness unavailable', err.message);
      return telegram.sendMessage(chatId, 'Campaign readiness is unavailable. No campaign controls were changed.', { threadId });
    }
  }

  if (action === 'sourcecerts') {
    try {
      const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? 'bond-the-duck-2026';
      const state = await getVerificationSourceCertificationState(supabase, campaignId);
      return telegram.editMessageText(chatId, messageId, buildSourceCertificationAdminText(state), {
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🔄 Refresh', callback_data: 'admin:sourcecerts' }],
            [{ text: '⬅️ Back to Bond the Duck', callback_data: 'admin:campaign:bond' }],
          ],
        },
      });
    } catch (err) {
      console.error('verification source certifications unavailable', err.message);
      return telegram.sendMessage(
        chatId,
        'Verification source certifications are unavailable. No source, campaign state or reward setting was changed.',
        { threadId }
      );
    }
  }

  if (action === 'votequeue') {
    if (callbackQuery.message.chat.type !== 'private' || !websiteVoteReviewEnabled()) {
      return telegram.sendMessage(
        chatId,
        'Website vote evidence review is available only to an authorized founder in a private Project Q chat while review controls are enabled.',
        { threadId }
      );
    }
    try {
      const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? 'bond-the-duck-2026';
      const queue = await getWebsiteVoteReviewQueue(supabase, {
        campaignId, reviewerUserId: userId,
      });
      const offset = Math.max(0, Number(arg1) || 0);
      const text = buildWebsiteVoteReviewQueueText(queue, { offset });
      const replyMarkup = buildWebsiteVoteReviewQueueKeyboard(queue, { offset });
      if (callbackQuery.message.photo) {
        return telegram.sendMessage(chatId, text, { threadId, replyMarkup });
      }
      return telegram.editMessageText(chatId, messageId, text, { replyMarkup });
    } catch (err) {
      console.error('website vote review queue unavailable', err.message);
      return telegram.sendMessage(
        chatId,
        'The private website vote queue is unavailable or unauthorized. No evidence or reward record was changed.',
        { threadId }
      );
    }
  }

  if (action === 'votereview') {
    if (callbackQuery.message.chat.type !== 'private' || !websiteVoteReviewEnabled()) {
      return telegram.sendMessage(chatId, 'Private website vote review is disabled or unauthorized.', { threadId });
    }
    try {
      const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? 'bond-the-duck-2026';
      const { item, evidence } = await getWebsiteVoteReviewEvidence(supabase, {
        campaignId, reviewerUserId: userId, attemptId: arg1,
      });
      return telegram.sendPhotoBytes(
        chatId,
        evidence.bytes,
        evidence.contentType,
        buildWebsiteVoteReviewCaption(item),
        {
          threadId,
          replyMarkup: buildWebsiteVoteReviewDecisionKeyboard(item),
          filename: `website-vote-${item.id}.${evidence.extension}`,
        }
      );
    } catch (err) {
      console.error('website vote evidence preview unavailable', err.message);
      return telegram.sendMessage(
        chatId,
        'That proof is stale, unavailable, unauthorized or failed its integrity check. No decision was recorded.',
        { threadId }
      );
    }
  }

  if (action === 'votedecide') {
    if (callbackQuery.message.chat.type !== 'private' || !websiteVoteReviewEnabled()) {
      return telegram.sendMessage(chatId, 'Private website vote review is disabled or unauthorized.', { threadId });
    }
    try {
      const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? 'bond-the-duck-2026';
      const approve = arg2 === 'a';
      const rejectionCode = String(arg2 || '').startsWith('r-') ? String(arg2).slice(2) : null;
      if (!approve && !rejectionCode) throw new Error('invalid website vote review decision');
      await decideWebsiteVoteReview(supabase, {
        campaignId,
        reviewerUserId: userId,
        attemptId: arg1,
        decision: approve ? 'APPROVE' : 'REJECT',
        rejectionCode,
      });
      const decisionText = approve ? 'APPROVED' : 'REJECTED';
      const confirmation = `✅ *Website vote proof #${Number(arg1)} ${decisionText}*\n\nThe append-only review decision was recorded. XP remains subject to settlement and campaign caps.`;
      if (callbackQuery.message.photo) {
        await telegram.editMessageCaption(chatId, messageId, confirmation, { replyMarkup: { inline_keyboard: [] } });
      } else {
        await telegram.editMessageText(chatId, messageId, confirmation, { replyMarkup: { inline_keyboard: [] } });
      }
      const queue = await getWebsiteVoteReviewQueue(supabase, { campaignId, reviewerUserId: userId });
      return telegram.sendMessage(chatId, buildWebsiteVoteReviewQueueText(queue), {
        threadId,
        replyMarkup: buildWebsiteVoteReviewQueueKeyboard(queue),
      });
    } catch (err) {
      console.error('website vote review decision failed', err.message);
      return telegram.sendMessage(
        chatId,
        'This proof is stale, already decided, unauthorized or no longer actionable. No new decision was recorded.',
        { threadId }
      );
    }
  }

  if (action === 'launchapprovals') {
    try {
      const { status, controlsEnabled } = await getLaunchApprovalPanel(
        userId,
        callbackQuery.message.chat.type
      );
      return telegram.editMessageText(
        chatId,
        messageId,
        buildCampaignReadinessApprovalText(status),
        {
          replyMarkup: buildCampaignReadinessApprovalKeyboard(status, {
            controlsEnabled,
            viewerUserId: userId,
          }),
        }
      );
    } catch (err) {
      console.error('campaign launch approvals unavailable', err.message);
      return telegram.sendMessage(
        chatId,
        'Campaign launch approvals are unavailable. No decision or campaign state was changed.',
        { threadId }
      );
    }
  }

  if (action === 'launchdecision') {
    if (callbackQuery.message.chat.type !== 'private') {
      return telegram.sendMessage(
        chatId,
        'Founder launch decisions are available only in an authorized private Project Q chat.',
        { threadId }
      );
    }
    if (!campaignReadinessApprovalsEnabled()) {
      return telegram.sendMessage(
        chatId,
        'Campaign launch approvals are disabled. No decision was recorded.',
        { threadId }
      );
    }
    try {
      const { readiness, status, controlsEnabled } = await getLaunchApprovalPanel(userId, 'private');
      if (!controlsEnabled || !status.acceptingDecisions) {
        throw new Error('campaign readiness decision is not currently authorized');
      }
      const idempotencyKey = readinessDecisionIdempotencyKey({
        callbackQueryId: callbackQuery.id,
        campaignId: readiness.campaignId,
        founderUserId: userId,
      });
      await recordCampaignReadinessDecision(supabase, {
        campaignId: readiness.campaignId,
        founderUserId: userId,
        reportVersion: readiness.reportVersion,
        reportHash: readiness.reportHash,
        decision: arg1,
        idempotencyKey,
      });
      const refreshed = await getLaunchApprovalPanel(userId, 'private');
      return telegram.editMessageText(
        chatId,
        messageId,
        buildCampaignReadinessApprovalText(refreshed.status),
        {
          replyMarkup: buildCampaignReadinessApprovalKeyboard(refreshed.status, {
            controlsEnabled: refreshed.controlsEnabled,
            viewerUserId: userId,
          }),
        }
      );
    } catch (err) {
      console.error('campaign launch decision failed', err.message);
      return telegram.sendMessage(
        chatId,
        'This readiness report is blocked, stale, unauthorized or no longer actionable. No decision was recorded; refresh launch approvals.',
        { threadId }
      );
    }
  }

  if (action === 'rulesflow') {
    try {
      const { state, controlsEnabled } = await getRulesGovernancePanel(
        userId,
        callbackQuery.message.chat.type
      );
      return telegram.editMessageText(chatId, messageId, buildRulesGovernanceText(state), {
        replyMarkup: buildRulesGovernanceKeyboard(state, { controlsEnabled, viewerUserId: userId }),
      });
    } catch (err) {
      console.error('campaign rules governance unavailable', err.message);
      return telegram.sendMessage(
        chatId,
        'Final-rules governance is unavailable. No proposal, decision or campaign setting was changed.',
        { threadId }
      );
    }
  }

  if (['rulesdecide', 'rulesfinalize'].includes(action)) {
    if (callbackQuery.message.chat.type !== 'private') {
      return telegram.sendMessage(
        chatId,
        'Final-rules decisions are available only in an authorized private Project Q chat.',
        { threadId }
      );
    }
    if (!campaignRulesGovernanceEnabled()) {
      return telegram.sendMessage(
        chatId,
        'Final-rules governance is disabled. No decision or campaign setting was changed.',
        { threadId }
      );
    }
    try {
      const { state, controlsEnabled } = await getRulesGovernancePanel(userId, 'private');
      const proposal = state.proposals.find(({ id }) => String(id) === String(arg1));
      if (!controlsEnabled || !proposal || proposal.finalized || !proposal.semanticRulesValid) {
        throw new Error('final rules proposal is stale or unauthorized');
      }
      if (action === 'rulesdecide') {
        await recordFinalRulesDecision(supabase, {
          proposalId: proposal.id,
          founderUserId: userId,
          decision: arg2,
          idempotencyKey: rulesGovernanceIdempotencyKey({
            action: `rules-${arg2}`,
            callbackQueryId: callbackQuery.id,
            campaignId: state.campaign.id,
            founderUserId: userId,
          }),
        });
      } else {
        if (!proposal.finalizable) throw new Error('final rules do not have two current approvals');
        await finalizeApprovedRules(supabase, {
          proposalId: proposal.id,
          founderUserId: userId,
        });
      }
      const refreshed = await getRulesGovernancePanel(userId, 'private');
      return telegram.editMessageText(chatId, messageId, buildRulesGovernanceText(refreshed.state), {
        replyMarkup: buildRulesGovernanceKeyboard(refreshed.state, {
          controlsEnabled: refreshed.controlsEnabled,
          viewerUserId: userId,
        }),
      });
    } catch (err) {
      console.error('campaign rules governance action failed', err.message);
      return telegram.sendMessage(
        chatId,
        'This final-rules proposal is stale, blocked, unauthorized or no longer actionable. No campaign state, funding or reward setting was changed.',
        { threadId }
      );
    }
  }

  if (action === 'burn') {
    try {
      const campaignId = process.env.BOND_THE_DUCK_CAMPAIGN_ID ?? 'bond-the-duck-2026';
      const summary = await getEarnToBurnSummary(supabase, campaignId);
      return telegram.editMessageText(chatId, messageId, buildEarnToBurnAdminText(summary), {
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🔄 Refresh', callback_data: 'admin:burn' }],
            [{ text: '⬅️ Back to Bond the Duck', callback_data: 'admin:campaign:bond' }],
          ],
        },
      });
    } catch (err) {
      console.error('Earn to Burn dashboard unavailable', err.message);
      return telegram.sendMessage(chatId, 'Earn to Burn is unavailable. No proposal, approval or burn was changed.', { threadId });
    }
  }

  if (action === 'burnflow') {
    try {
      const programId = process.env.PROJECT_Q_EARN_TO_BURN_PROGRAM_ID ?? DEFAULT_EARN_TO_BURN_PROGRAM_ID;
      const workflow = await getBurnWorkflowState(supabase, programId);
      const controlsEnabled = callbackQuery.message.chat.type === 'private'
        && earnToBurnEnabled()
        && workflow.founders.some(({ founder_user_id: founderUserId }) => String(founderUserId) === String(userId));
      return telegram.editMessageText(chatId, messageId, buildBurnWorkflowAdminText(workflow, { controlsEnabled }), {
        replyMarkup: buildBurnWorkflowKeyboard(workflow, { controlsEnabled }),
      });
    } catch (err) {
      console.error('Earn to Burn workflow unavailable', err.message);
      return telegram.sendMessage(chatId, 'Earn to Burn workflow is unavailable. No workflow state was changed.', { threadId });
    }
  }

  if (['burnreview', 'burndecide', 'burnpubreview', 'burnpubapprove'].includes(action)) {
    if (callbackQuery.message.chat.type !== 'private') {
      return telegram.sendMessage(chatId, 'Founder burn reviews are available only in an authorized private Project Q chat.', { threadId });
    }
    if (!earnToBurnEnabled()) {
      return telegram.sendMessage(chatId, 'Earn to Burn founder controls are disabled. No decision was recorded.', { threadId });
    }
    try {
      const programId = process.env.PROJECT_Q_EARN_TO_BURN_PROGRAM_ID ?? DEFAULT_EARN_TO_BURN_PROGRAM_ID;
      let workflow = await getBurnWorkflowState(supabase, programId);
      if (!workflow.founders.some(({ founder_user_id: founderUserId }) => String(founderUserId) === String(userId))) {
        throw new Error('founder is not configured for this burn program');
      }
      if (action === 'burnreview') {
        const review = buildBurnProposalReview(workflow, arg1);
        return telegram.editMessageText(chatId, messageId, review.text, {
          replyMarkup: review.keyboard,
          parseMode: 'HTML',
        });
      }
      if (action === 'burndecide') {
        const review = buildBurnProposalReview(workflow, arg1);
        await recordFounderDecision(supabase, {
          proposalId: review.proposal.id,
          founderUserId: userId,
          decision: arg2,
          readinessHash: review.proposal.rules_hash,
        });
        workflow = await getBurnWorkflowState(supabase, programId);
        return telegram.editMessageText(
          chatId,
          messageId,
          `✅ *${arg2} recorded for proposal #${arg1}.*\n\n${buildBurnWorkflowAdminText(workflow, { controlsEnabled: true })}`,
          { replyMarkup: buildBurnWorkflowKeyboard(workflow, { controlsEnabled: true }) }
        );
      }
      if (action === 'burnpubreview') {
        const review = buildPublicationDraftReview(workflow, arg1);
        return telegram.editMessageText(chatId, messageId, review.text, {
          replyMarkup: review.keyboard,
          parseMode: 'HTML',
        });
      }
      const review = buildPublicationDraftReview(workflow, arg1);
      await approvePublicationDraft(supabase, {
        draftId: review.draft.id,
        founderUserId: userId,
        expectedBodyHash: review.draft.body_hash,
      });
      workflow = await getBurnWorkflowState(supabase, programId);
      return telegram.editMessageText(
        chatId,
        messageId,
        `✅ *Exact ${review.draft.platform} draft approved.*\n\n${buildBurnWorkflowAdminText(workflow, { controlsEnabled: true })}`,
        { replyMarkup: buildBurnWorkflowKeyboard(workflow, { controlsEnabled: true }) }
      );
    } catch (err) {
      console.error('founder Earn to Burn review failed', err.message);
      return telegram.sendMessage(
        chatId,
        'This review is stale, unauthorized or no longer actionable. No decision was recorded; refresh the workflow.',
        { threadId }
      );
    }
  }

  if (action === 'back') {
    pending.delete(pendingKey(chatId, userId));
    return telegram.editMessageText(chatId, messageId, '🛠 *Admin panel* — choose a menu/command to edit:', {
      replyMarkup: buildAdminRootKeyboard(),
    });
  }

  if (action === 'item') {
    const key = arg1;
    const content = await getMenuContent(key);
    const label = LABELS[key] ?? key;
    const lines = [
      `🛠 *${label}*`,
      content?.bio_text ? `Current bio: ${content.bio_text}` : 'Current bio: _(default)_',
      content?.media_file_id ? 'Media: set' : 'Media: _(none)_',
    ];
    return telegram.editMessageText(chatId, messageId, lines.join('\n'), {
      replyMarkup: itemKeyboard(key),
    });
  }

  if (action === 'editbio') {
    const key = arg1;
    pending.set(pendingKey(chatId, userId), { key, field: 'bio', stage: 'input', expires: Date.now() + PENDING_TTL_MS });
    return telegram.sendMessage(
      chatId,
      `✏️ Send the new bio text for *${LABELS[key] ?? key}* (or /admincancel to abort). Expires in 5 minutes.`,
      { threadId }
    );
  }

  if (action === 'editmedia') {
    const key = arg1;
    pending.set(pendingKey(chatId, userId), { key, field: 'media', stage: 'input', expires: Date.now() + PENDING_TTL_MS });
    return telegram.sendMessage(
      chatId,
      `🖼 Send the new image for *${LABELS[key] ?? key}* (or /admincancel to abort). Expires in 5 minutes.`,
      { threadId }
    );
  }

  if (action === 'confirm' || action === 'discard') {
    const field = arg1;
    const key = arg2;
    const entryKey = pendingKey(chatId, userId);
    const entry = pending.get(entryKey);

    if (!entry || entry.key !== key || entry.field !== field || entry.stage !== 'confirm' || Date.now() > entry.expires) {
      pending.delete(entryKey);
      return telegram.sendMessage(chatId, 'This preview expired or was already handled — start again with /adminf.', {
        threadId,
      });
    }

    pending.delete(entryKey);
    const label = LABELS[key] ?? key;

    if (action === 'discard') {
      return telegram.sendMessage(chatId, `❌ Discarded — *${label}* was not changed.`, { threadId });
    }

    const patch = field === 'bio' ? { bio_text: entry.draft } : { media_file_id: entry.draft };
    await upsertMenuContent(key, patch, userId);
    return telegram.sendMessage(chatId, `✅ Published — *${label}* ${field === 'bio' ? 'bio' : 'media'} updated.`, {
      threadId,
    });
  }
}

export async function handlePendingEditMessage(message) {
  const chatId = message.chat.id;
  const threadId = message.message_thread_id;
  const userId = message.from.id;
  const entryKey = pendingKey(chatId, userId);
  const entry = pending.get(entryKey);
  if (!entry) return;

  if (entry.stage !== 'input') {
    return telegram.sendMessage(
      chatId,
      'Please tap ✅ Publish or ❌ Discard on the preview above, or /admincancel to abort.',
      { threadId }
    );
  }

  if (entry.field === 'bio') {
    if (!message.text) {
      return telegram.sendMessage(chatId, 'Please send text for the bio, or /admincancel to abort.', { threadId });
    }
    const draft = message.text.trim();
    entry.draft = draft;
    entry.stage = 'confirm';
    entry.expires = Date.now() + PENDING_TTL_MS; // give a fresh window to review
    return sendPreview(chatId, threadId, entry.key, 'bio', draft);
  }

  if (entry.field === 'media') {
    const photos = message.photo;
    if (!photos || !photos.length) {
      return telegram.sendMessage(chatId, 'Please send an image, or /admincancel to abort.', { threadId });
    }
    const draft = photos[photos.length - 1].file_id;
    entry.draft = draft;
    entry.stage = 'confirm';
    entry.expires = Date.now() + PENDING_TTL_MS;
    return sendPreview(chatId, threadId, entry.key, 'media', draft);
  }
}
