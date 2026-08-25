import * as telegram from './telegram.js';
import { getMenuContent, upsertMenuContent } from './menuContent.js';
import { supabase } from './supabase.js';
import { getCampaignReadiness } from '../campaign/service.js';
import { buildCampaignReadinessText } from '../campaign/ui.js';
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
import { earnToBurnEnabled } from './featureFlags.js';

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
      [{ text: '🔥 Earn to Burn', callback_data: 'admin:burn' }],
      [{ text: '🧾 Burn Workflow', callback_data: 'admin:burnflow' }],
      [{ text: '⬅️ Back to Campaigns', callback_data: 'admin:campaign' }],
    ],
  };
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
