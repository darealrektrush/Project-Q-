import * as telegram from './telegram.js';
import { getAllMenuContent, getMenuContent, upsertMenuContent } from './menuContent.js';
import { supabase } from './supabase.js';
import { getCampaignReadiness } from '../campaign/service.js';
import { buildCampaignReadinessText } from '../campaign/ui.js';
import {
  buildCampaignTimeline,
  buildCampaignTimelineText,
  getCampaignTimeline,
  saveDraftCampaignTimeline,
} from '../campaign/timeline.js';
import { buildFundingVaultText, getFundingVaultStatus } from '../campaign/funding.js';
import { buildVerificationSourceText, getVerificationSourceStatus } from '../campaign/verificationSources.js';
import { buildLaunchSystemText, getLaunchSystemStatus } from '../campaign/launchSystems.js';
import { buildRehearsalReadinessText, getRehearsalReadiness } from '../campaign/rehearsal.js';
import {
  buildActivationApprovalText,
  getActivationApprovalStatus,
  isConfiguredFounder,
  recordActivationApproval,
} from '../campaign/activationApprovals.js';

// These are the actual Project Q surfaces. Keep Oracle-only features out of
// this list so the private Project Q operator panel cannot accidentally expose
// or edit the wrong product's content.
const EDITABLE_KEYS = [
  ['home', 'Home menu'],
  ['help', 'Help'],
  ['about', 'About Project Q'],
  ['campaign', 'Bond the Duck campaign'],
  ['missions', 'Campaign missions'],
  ['market', 'Market'],
  ['leaderboard', 'XP leaderboard'],
  ['bagwork', 'Bagwork'],
  ['bagworkboard', 'Bagwork leaderboard'],
  ['money', 'Eyes On The Money'],
  ['rewards', 'Rewards'],
  ['receipts', 'Receipts'],
  ['wallets', 'Wallets'],
  ['events', 'Events'],
  ['spaces', 'Spaces'],
  ['links', 'Official Links'],
  ['door', 'The Door'],
];
const LABELS = Object.fromEntries(EDITABLE_KEYS);

const SECTIONS = [
  { key: 'home', label: '🏠 Home & Brand', items: ['home', 'help', 'about'] },
  { key: 'campaign', label: '🦆 Campaign', items: ['campaign', 'missions'] },
  {
    key: 'economy',
    label: '💰 Economy',
    items: ['market', 'leaderboard', 'bagwork', 'bagworkboard', 'money', 'rewards', 'receipts', 'wallets'],
  },
  { key: 'community', label: '📣 Community', items: ['events', 'spaces', 'links', 'door'] },
];

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

export function isEditableAdminKey(key) {
  return Object.hasOwn(LABELS, key);
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

// The operator panel is deliberately DM-only. Group administrators retain
// their operational commands, but cannot open an editor in a community topic.
export function isPrivateAdminPanelUser(userId, chatType) {
  return chatType === 'private' && isConfiguredPrivateAdmin(userId);
}

export function buildAdminPanelKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🏠 Home & Brand', callback_data: 'admin:section:home' },
        { text: '🦆 Campaign', callback_data: 'admin:section:campaign' },
      ],
      [
        { text: '💰 Economy', callback_data: 'admin:section:economy' },
        { text: '📣 Community', callback_data: 'admin:section:community' },
      ],
      [
        { text: '🖼 Content & Media', callback_data: 'admin:section:all' },
        { text: '📋 Live Menu Map', callback_data: 'admin:map' },
      ],
    ],
  };
}

function panelText() {
  return [
    '🛠 *PROJECT Q // ADMIN CONTROL*',
    '_Private operator workspace • content, media and live views_',
    '',
    'Choose a system to manage.',
  ].join('\n');
}

function sectionKeyboard(sectionKey) {
  const section = SECTIONS.find((candidate) => candidate.key === sectionKey);
  const keys = sectionKey === 'all' ? EDITABLE_KEYS.map(([key]) => key) : section?.items ?? [];
  const rows = keys.map((key) => [{ text: LABELS[key], callback_data: `admin:item:${key}` }]);
  rows.push([{ text: '⬅️ Admin Control', callback_data: 'admin:back' }]);
  return { inline_keyboard: rows };
}

function sectionText(sectionKey) {
  if (sectionKey === 'all') return '🖼 *Content & Media*\nChoose any live Project Q screen to manage.';
  const section = SECTIONS.find((candidate) => candidate.key === sectionKey);
  return `${section?.label ?? '🛠 Admin'}\nChoose a screen to manage.`;
}

export function buildAdminItemKeyboard(key) {
  const campaignControls = key === 'campaign'
    ? [
        [
          { text: '📋 Readiness', callback_data: 'admin:readiness' },
          { text: '🗓 Timeline', callback_data: 'admin:timeline' },
        ],
        [{ text: '💰 Funding & Vaults', callback_data: 'admin:funding' }],
        [{ text: '🔎 Verification Sources', callback_data: 'admin:sources' }],
        [{ text: '⚙️ Launch Systems', callback_data: 'admin:systems' }],
        [{ text: '🧪 Rehearsal', callback_data: 'admin:rehearsal' }],
        [{ text: '🛡 Founder Approvals', callback_data: 'admin:approval' }],
      ]
    : [];
  return {
    inline_keyboard: [
      ...campaignControls,
      [
        { text: '✏️ Edit text', callback_data: `admin:editbio:${key}` },
        { text: '🖼 Set media', callback_data: `admin:editmedia:${key}` },
      ],
      [
        { text: '👁 View live', callback_data: `admin:live:${key}` },
        { text: '🗑 Remove media', callback_data: `admin:removemedia:${key}` },
      ],
      [{ text: '⬅️ All content', callback_data: 'admin:section:all' }],
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

// Shows the proposed text/media change before publishing. The separate
// "View live" action runs the actual member-facing screen and is the source
// of truth for dynamic content, buttons and data.
async function sendPreview(chatId, threadId, key, field, draft) {
  const content = await getMenuContent(key);
  const label = LABELS[key] ?? key;

  const text =
    field === 'bio'
      ? draft
      : content?.bio_text || `_(live default text for ${label} will show here instead)_`;
  const mediaFileId = field === 'media' ? draft : field === 'remove_media' ? null : content?.media_file_id;

  const preview = `👀 *Preview — ${label}*\n\n${text}`;
  const replyMarkup = confirmKeyboard(field, key);

  if (mediaFileId && preview.length <= 1024) {
    return telegram.sendPhoto(chatId, mediaFileId, preview, { threadId, replyMarkup });
  }
  if (mediaFileId) {
    await telegram.sendPhoto(chatId, mediaFileId, '', { threadId });
  }
  return telegram.sendMessage(chatId, preview, { threadId, replyMarkup });
}

export async function handleAdminCommand(message) {
  const chatId = message.chat.id;
  const threadId = message.message_thread_id;
  const userId = message.from.id;

  if (!isPrivateAdminPanelUser(userId, message.chat.type)) {
    return telegram.sendMessage(chatId, '🔒 Project Q Admin Control is available only in the bot’s private DM.', { threadId });
  }

  return telegram.sendMessage(chatId, panelText(), {
    threadId,
    replyMarkup: buildAdminPanelKeyboard(),
  });
}

export async function handleAdminCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const threadId = callbackQuery.message.message_thread_id;
  const userId = callbackQuery.from.id;
  const messageId = callbackQuery.message.message_id;

  if (!isPrivateAdminPanelUser(userId, callbackQuery.message.chat.type)) {
    return telegram.sendMessage(chatId, '🔒 Project Q Admin Control is available only in the bot’s private DM.', { threadId });
  }

  const [, action, arg1, arg2] = callbackQuery.data.split(':');

  if (action === 'back') {
    pending.delete(pendingKey(chatId, userId));
    return telegram.editMessageText(chatId, messageId, panelText(), {
      replyMarkup: buildAdminPanelKeyboard(),
    });
  }

  if (action === 'section') {
    return telegram.editMessageText(chatId, messageId, sectionText(arg1), {
      replyMarkup: sectionKeyboard(arg1),
    });
  }

  if (action === 'map') {
    const allContent = await getAllMenuContent();
    const lines = [
      '📋 *LIVE MENU MAP*',
      '_Saved overrides currently active in Project Q_',
      '',
      ...EDITABLE_KEYS.map(([key, label]) => {
        const content = allContent[key];
        const text = content?.bio_text ? 'text ✓' : 'text: default';
        const media = content?.media_file_id ? 'media ✓' : 'media: none';
        return `• *${label}* — ${text} · ${media}`;
      }),
    ];
    return telegram.editMessageText(chatId, messageId, lines.join('\n'), {
      replyMarkup: { inline_keyboard: [[{ text: '⬅️ Admin Control', callback_data: 'admin:back' }]] },
    });
  }

  if (action === 'item') {
    const key = arg1;
    if (!isEditableAdminKey(key)) {
      return telegram.sendMessage(chatId, 'That screen is no longer managed by Project Q. Open /adminf to continue.', { threadId });
    }
    const content = await getMenuContent(key);
    const label = LABELS[key] ?? key;
    const lines = [
      `🛠 *${label}*`,
      content?.bio_text ? `Current bio: ${content.bio_text}` : 'Current bio: _(default)_',
      content?.media_file_id ? 'Media: set' : 'Media: _(none)_',
    ];
    return telegram.editMessageText(chatId, messageId, lines.join('\n'), {
      replyMarkup: buildAdminItemKeyboard(key),
    });
  }

  if (action === 'readiness') {
    try {
      const readiness = await getCampaignReadiness(supabase);
      return telegram.editMessageText(chatId, messageId, buildCampaignReadinessText(readiness), {
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🔄 Refresh', callback_data: 'admin:readiness' }],
            [
              { text: '🗓 Timeline', callback_data: 'admin:timeline' },
              { text: '💰 Funding', callback_data: 'admin:funding' },
            ],
            [
              { text: '🔎 Sources', callback_data: 'admin:sources' },
              { text: '⚙️ Systems', callback_data: 'admin:systems' },
            ],
            [{ text: '⬅️ Bond the Duck campaign', callback_data: 'admin:item:campaign' }],
          ],
        },
      });
    } catch (err) {
      console.error('campaign readiness unavailable', err.message);
      return telegram.sendMessage(chatId, 'Campaign readiness is unavailable. No campaign controls were changed.', { threadId });
    }
  }

  if (action === 'timeline') {
    const timeline = await getCampaignTimeline(supabase);
    const text = timeline.length
      ? buildCampaignTimelineText(timeline, 'Bond the Duck // Current Timeline')
      : '🗓 *Bond the Duck // Timeline*\n\nNo campaign dates are scheduled. The campaign remains DRAFT.';
    return telegram.editMessageText(chatId, messageId, text, {
      replyMarkup: { inline_keyboard: [
        [{ text: timeline.length ? '✏️ Reschedule' : '➕ Set start date', callback_data: 'admin:timelineedit' }],
        [{ text: '⬅️ Bond the Duck campaign', callback_data: 'admin:item:campaign' }],
      ] },
    });
  }

  if (action === 'funding') {
    try {
      const status = await getFundingVaultStatus(supabase);
      return telegram.editMessageText(chatId, messageId, buildFundingVaultText(status), {
        replyMarkup: { inline_keyboard: [
          [{ text: '🔄 Refresh', callback_data: 'admin:funding' }],
          [{ text: '⬅️ Bond the Duck campaign', callback_data: 'admin:item:campaign' }],
        ] },
      });
    } catch (err) {
      console.error('campaign funding dashboard unavailable', err.message);
      return telegram.sendMessage(chatId, 'Funding evidence is unavailable. No vault or campaign controls were changed.', { threadId });
    }
  }

  if (action === 'sources') {
    try {
      const status = await getVerificationSourceStatus(supabase);
      return telegram.editMessageText(chatId, messageId, buildVerificationSourceText(status), {
        replyMarkup: { inline_keyboard: [
          [{ text: '🔄 Refresh', callback_data: 'admin:sources' }],
          [{ text: '⬅️ Bond the Duck campaign', callback_data: 'admin:item:campaign' }],
        ] },
      });
    } catch (err) {
      console.error('campaign verification sources unavailable', err.message);
      return telegram.sendMessage(chatId, 'Verification-source status is unavailable. Campaign XP remains disabled.', { threadId });
    }
  }

  if (action === 'systems') {
    const status = getLaunchSystemStatus();
    return telegram.editMessageText(chatId, messageId, buildLaunchSystemText(status), {
      replyMarkup: { inline_keyboard: [
        [{ text: '🔄 Refresh', callback_data: 'admin:systems' }],
        [{ text: '⬅️ Bond the Duck campaign', callback_data: 'admin:item:campaign' }],
      ] },
    });
  }

  if (action === 'rehearsal') {
    try {
      const status = await getRehearsalReadiness(supabase);
      return telegram.editMessageText(chatId, messageId, buildRehearsalReadinessText(status), {
        replyMarkup: { inline_keyboard: [
          [{ text: '🔄 Refresh', callback_data: 'admin:rehearsal' }],
          [{ text: '⬅️ Bond the Duck campaign', callback_data: 'admin:item:campaign' }],
        ] },
      });
    } catch (err) {
      console.error('campaign rehearsal readiness unavailable', err.message);
      return telegram.sendMessage(chatId, 'Rehearsal status is unavailable. The campaign remains safely closed.', { threadId });
    }
  }

  if (action === 'approval') {
    try {
      const status = await getActivationApprovalStatus(supabase);
      const viewerApproved = status.approvals.some(({ founderUserId }) => founderUserId === String(userId));
      const actions = [];
      if (isConfiguredFounder(userId) && status.readyToCollect && !viewerApproved) {
        actions.push([{ text: '🛡 Review my approval', callback_data: 'admin:approvalreview' }]);
      }
      if (isConfiguredFounder(userId) && viewerApproved) {
        actions.push([{ text: '↩️ Revoke my approval', callback_data: 'admin:approvalrevoke' }]);
      }
      actions.push([{ text: '🔄 Refresh', callback_data: 'admin:approval' }]);
      actions.push([{ text: '⬅️ Bond the Duck campaign', callback_data: 'admin:item:campaign' }]);
      return telegram.editMessageText(chatId, messageId, buildActivationApprovalText(status, userId), {
        replyMarkup: { inline_keyboard: actions },
      });
    } catch (err) {
      console.error('activation approval dashboard unavailable', err.message);
      return telegram.sendMessage(chatId, 'Founder approval status is unavailable. The campaign remains locked.', { threadId });
    }
  }

  if (action === 'approvalreview') {
    if (!isConfiguredFounder(userId)) {
      return telegram.sendMessage(chatId, 'Only a configured founder can approve activation.', { threadId });
    }
    const status = await getActivationApprovalStatus(supabase);
    if (!status.readyToCollect) {
      return telegram.sendMessage(chatId, 'Approval collection is locked because readiness or campaign state changed.', { threadId });
    }
    return telegram.editMessageText(chatId, messageId, [
      '⚠️ *Confirm Founder Approval*',
      '',
      `You are approving readiness report \`${status.readiness.reportHash.slice(0, 12)}…\`.`,
      'This records approval only. It does not activate the campaign or move funds.',
    ].join('\n'), { replyMarkup: { inline_keyboard: [
      [{ text: '✅ Confirm approval', callback_data: 'admin:approvalconfirm' }],
      [{ text: '❌ Cancel', callback_data: 'admin:approval' }],
    ] } });
  }

  if (action === 'approvalconfirm' || action === 'approvalrevoke') {
    try {
      const status = await recordActivationApproval(supabase, userId, action === 'approvalconfirm');
      return telegram.editMessageText(chatId, messageId, buildActivationApprovalText(status, userId), {
        replyMarkup: { inline_keyboard: [
          [{ text: '🔄 Refresh', callback_data: 'admin:approval' }],
          [{ text: '⬅️ Bond the Duck campaign', callback_data: 'admin:item:campaign' }],
        ] },
      });
    } catch (err) {
      console.error('activation approval write rejected', err.message);
      return telegram.sendMessage(chatId, `🔒 Approval not recorded: ${err.message}`, { threadId });
    }
  }

  if (action === 'timelineedit') {
    pending.set(pendingKey(chatId, userId), {
      key: 'campaign', field: 'timeline', stage: 'input', expires: Date.now() + PENDING_TTL_MS,
    });
    return telegram.sendMessage(chatId, [
      '🗓 Send the new campaign start in *Vancouver time*.',
      'Format: `YYYY-MM-DD HH:MM`',
      'Example: `2026-09-01 08:00`',
      '',
      'The bot will preview five consecutive 48-hour cycles before saving. Use /admincancel to abort.',
    ].join('\n'), { threadId });
  }

  if (action === 'timelineconfirm' || action === 'timelinediscard') {
    const entryKey = pendingKey(chatId, userId);
    const entry = pending.get(entryKey);
    if (!entry || entry.field !== 'timeline' || entry.stage !== 'confirm' || Date.now() > entry.expires) {
      pending.delete(entryKey);
      return telegram.sendMessage(chatId, 'This timeline preview expired. Open /adminf and try again.', { threadId });
    }
    pending.delete(entryKey);
    if (action === 'timelinediscard') {
      return telegram.sendMessage(chatId, '❌ Timeline discarded. No campaign dates were changed.', { threadId });
    }
    try {
      await saveDraftCampaignTimeline(supabase, entry.draft, userId);
      return telegram.sendMessage(chatId, '✅ Timeline saved. The campaign is still DRAFT and has not been activated.', {
        threadId,
        replyMarkup: { inline_keyboard: [[{ text: '🗓 View timeline', callback_data: 'admin:timeline' }]] },
      });
    } catch (err) {
      console.error('campaign timeline save failed', err.message);
      return telegram.sendMessage(chatId, `🔒 Timeline not saved: ${err.message}`, { threadId });
    }
  }

  if (action === 'editbio') {
    const key = arg1;
    if (!isEditableAdminKey(key)) return;
    pending.set(pendingKey(chatId, userId), { key, field: 'bio', stage: 'input', expires: Date.now() + PENDING_TTL_MS });
    return telegram.sendMessage(
      chatId,
      `✏️ Send the new bio text for *${LABELS[key] ?? key}* (or /admincancel to abort). Expires in 5 minutes.`,
      { threadId }
    );
  }

  if (action === 'editmedia') {
    const key = arg1;
    if (!isEditableAdminKey(key)) return;
    pending.set(pendingKey(chatId, userId), { key, field: 'media', stage: 'input', expires: Date.now() + PENDING_TTL_MS });
    return telegram.sendMessage(
      chatId,
      `🖼 Send the new image for *${LABELS[key] ?? key}* (or /admincancel to abort). Expires in 5 minutes.`,
      { threadId }
    );
  }

  if (action === 'removemedia') {
    const key = arg1;
    if (!isEditableAdminKey(key)) return;
    const content = await getMenuContent(key);
    if (!content?.media_file_id) {
      return telegram.sendMessage(chatId, `🖼 *${LABELS[key] ?? key}* has no custom media to remove.`, { threadId });
    }
    pending.set(pendingKey(chatId, userId), {
      key,
      field: 'remove_media',
      draft: null,
      stage: 'confirm',
      expires: Date.now() + PENDING_TTL_MS,
    });
    return sendPreview(chatId, threadId, key, 'remove_media', null);
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
    const message = field === 'bio'
      ? `✅ Published — *${label}* text updated.`
      : field === 'remove_media'
        ? `✅ Published — *${label}* media removed.`
        : `✅ Published — *${label}* media updated.`;
    return telegram.sendMessage(chatId, message, {
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

  if (message.text?.trim().split(/\s+/)[0].split('@')[0] === '/admincancel') {
    return cancelPendingEdit(chatId, userId);
  }

  if (entry.stage !== 'input') {
    return telegram.sendMessage(
      chatId,
      'Please tap ✅ Publish or ❌ Discard on the preview above, or /admincancel to abort.',
      { threadId }
    );
  }

  if (entry.field === 'timeline') {
    if (!message.text) {
      return telegram.sendMessage(chatId, 'Send the start as YYYY-MM-DD HH:MM in Vancouver time.', { threadId });
    }
    try {
      entry.draft = buildCampaignTimeline(message.text);
      entry.stage = 'confirm';
      entry.expires = Date.now() + PENDING_TTL_MS;
      return telegram.sendMessage(chatId, buildCampaignTimelineText(entry.draft), {
        threadId,
        replyMarkup: { inline_keyboard: [[
          { text: '✅ Save dates', callback_data: 'admin:timelineconfirm' },
          { text: '❌ Discard', callback_data: 'admin:timelinediscard' },
        ]] },
      });
    } catch (err) {
      return telegram.sendMessage(chatId, `⚠️ ${err.message}`, { threadId });
    }
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
