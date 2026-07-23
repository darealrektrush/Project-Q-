import * as telegram from './telegram.js';
import { getMenuContent, upsertMenuContent } from './menuContent.js';

const EDITABLE_KEYS = [
  ['home', 'Home menu'],
  ['market', 'Market'],
  ['leaderboard', 'Leaderboard'],
  ['rewards', 'Rewards'],
  ['bagwork', 'Bagwork'],
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
const pending = new Map(); // `${chatId}:${userId}` -> { key, field, expires }

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

  const [, action, key] = callbackQuery.data.split(':');

  if (action === 'back') {
    pending.delete(pendingKey(chatId, userId));
    return telegram.editMessageText(chatId, messageId, '🛠 *Admin panel* — choose a menu/command to edit:', {
      replyMarkup: listKeyboard(),
    });
  }

  if (action === 'item') {
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
    pending.set(pendingKey(chatId, userId), { key, field: 'bio', expires: Date.now() + PENDING_TTL_MS });
    return telegram.sendMessage(
      chatId,
      `✏️ Send the new bio text for *${LABELS[key] ?? key}* (or /admincancel to abort). Expires in 5 minutes.`,
      { threadId }
    );
  }

  if (action === 'editmedia') {
    pending.set(pendingKey(chatId, userId), { key, field: 'media', expires: Date.now() + PENDING_TTL_MS });
    return telegram.sendMessage(
      chatId,
      `🖼 Send the new image for *${LABELS[key] ?? key}* (or /admincancel to abort). Expires in 5 minutes.`,
      { threadId }
    );
  }
}

export async function handlePendingEditMessage(message) {
  const chatId = message.chat.id;
  const threadId = message.message_thread_id;
  const userId = message.from.id;
  const entry = pending.get(pendingKey(chatId, userId));
  if (!entry) return;

  if (entry.field === 'bio') {
    if (!message.text) {
      return telegram.sendMessage(chatId, 'Please send text for the bio, or /admincancel to abort.', { threadId });
    }
    await upsertMenuContent(entry.key, { bio_text: message.text.trim() }, userId);
    pending.delete(pendingKey(chatId, userId));
    return telegram.sendMessage(chatId, `✅ Bio updated for *${LABELS[entry.key] ?? entry.key}*.`, { threadId });
  }

  if (entry.field === 'media') {
    const photos = message.photo;
    if (!photos || !photos.length) {
      return telegram.sendMessage(chatId, 'Please send an image, or /admincancel to abort.', { threadId });
    }
    const largest = photos[photos.length - 1];
    await upsertMenuContent(entry.key, { media_file_id: largest.file_id }, userId);
    pending.delete(pendingKey(chatId, userId));
    return telegram.sendMessage(chatId, `✅ Media updated for *${LABELS[entry.key] ?? entry.key}*.`, { threadId });
  }
}
