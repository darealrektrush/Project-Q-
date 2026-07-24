import * as telegram from './telegram.js';
import { getMenuContent, upsertMenuContent } from './menuContent.js';

const EDITABLE_KEYS = [
  ['home', 'Home menu'],
  ['market', 'Market'],
  ['leaderboard', 'Leaderboard'],
  ['rewards', 'Rewards'],
  ['bagwork', 'Bagwork'],
  ['receipts', 'Receipts'],
  ['wallets', 'Wallets'],
  ['missions', 'Missions'],
  ['meme', 'Meme'],
  ['signal', 'Signal'],
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

export async function isGroupAdmin(chatId, userId) {
  try {
    const member = await telegram.getChatMember(chatId, userId);
    return member.status === 'creator' || member.status === 'administrator';
  } catch (err) {
    console.error('isGroupAdmin check failed', err);
    return false;
  }
}

function listKeyboard() {
  const rows = EDITABLE_KEYS.map(([key, label]) => [
    { text: label, callback_data: `admin:item:${key}` },
  ]);
  return { inline_keyboard: rows };
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

  if (!(await isGroupAdmin(chatId, userId))) {
    return telegram.sendMessage(chatId, '🚫 Only group admins can use /adminf.', { threadId });
  }

  return telegram.sendMessage(chatId, '🛠 *Admin panel* — choose a menu/command to edit:', {
    threadId,
    replyMarkup: listKeyboard(),
  });
}

export async function handleAdminCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const threadId = callbackQuery.message.message_thread_id;
  const userId = callbackQuery.from.id;
  const messageId = callbackQuery.message.message_id;

  if (!(await isGroupAdmin(chatId, userId))) {
    return telegram.sendMessage(chatId, '🚫 Only group admins can use /adminf.', { threadId });
  }

  const [, action, arg1, arg2] = callbackQuery.data.split(':');

  if (action === 'back') {
    pending.delete(pendingKey(chatId, userId));
    return telegram.editMessageText(chatId, messageId, '🛠 *Admin panel* — choose a menu/command to edit:', {
      replyMarkup: listKeyboard(),
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
