import { supabase } from './supabase.js';
import * as telegram from './telegram.js';
import { isGroupAdmin } from './admin.js';

const PENDING_TTL_MS = 10 * 60 * 1000; // more fields than a menu edit, give it more room
// `${chatId}:${userId}` -> { stage, kind, title, description, link, startsAt, expires }
const pending = new Map();

function pendingKey(chatId, userId) {
  return `${chatId}:${userId}`;
}

export function hasPendingAddEvent(chatId, userId) {
  const entry = pending.get(pendingKey(chatId, userId));
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    pending.delete(pendingKey(chatId, userId));
    return false;
  }
  return true;
}

export function cancelPendingAddEvent(chatId, userId) {
  pending.delete(pendingKey(chatId, userId));
  return telegram.sendMessage(chatId, '❌ Cancelled — no event was added.', {});
}

function kindKeyboard() {
  return {
    inline_keyboard: [[
      { text: '🎙 Space', callback_data: 'addevent:kind:space' },
      { text: '🗓 Event', callback_data: 'addevent:kind:event' },
    ]],
  };
}

function confirmKeyboard() {
  return {
    inline_keyboard: [[
      { text: '✅ Publish', callback_data: 'addevent:confirm' },
      { text: '❌ Cancel', callback_data: 'addevent:cancel' },
    ]],
  };
}

export async function handleAddEventCommand(message) {
  const chatId = message.chat.id;
  const threadId = message.message_thread_id;
  const userId = message.from.id;

  if (!(await isGroupAdmin(chatId, userId))) {
    return telegram.sendMessage(chatId, '🚫 Only group admins can use /addevent.', { threadId });
  }

  pending.set(pendingKey(chatId, userId), { stage: 'kind', expires: Date.now() + PENDING_TTL_MS });
  return telegram.sendMessage(chatId, '📅 Adding a new Space or Event — which is it?', {
    threadId,
    replyMarkup: kindKeyboard(),
  });
}

export async function handleAddEventCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const threadId = callbackQuery.message.message_thread_id;
  const userId = callbackQuery.from.id;

  if (!(await isGroupAdmin(chatId, userId))) {
    return telegram.sendMessage(chatId, '🚫 Only group admins can use /addevent.', { threadId });
  }

  const entryKey = pendingKey(chatId, userId);
  const entry = pending.get(entryKey);
  const [, action, arg] = callbackQuery.data.split(':');

  if (action === 'cancel') {
    pending.delete(entryKey);
    return telegram.sendMessage(chatId, '❌ Cancelled — no event was added.', { threadId });
  }

  if (action === 'kind') {
    if (!entry || entry.stage !== 'kind') {
      return telegram.sendMessage(chatId, 'This setup expired — start again with /addevent.', { threadId });
    }
    entry.kind = arg; // 'space' | 'event'
    entry.stage = 'title';
    entry.expires = Date.now() + PENDING_TTL_MS;
    return telegram.sendMessage(chatId, '✏️ Send the title.', { threadId });
  }

  if (action === 'confirm') {
    if (!entry || entry.stage !== 'confirm' || Date.now() > entry.expires) {
      pending.delete(entryKey);
      return telegram.sendMessage(chatId, 'This preview expired — start again with /addevent.', { threadId });
    }
    pending.delete(entryKey);
    await supabase.insert('scheduled_events', [{
      kind: entry.kind,
      title: entry.title,
      description: entry.description ?? null,
      link: entry.link ?? null,
      starts_at: entry.startsAt.toISOString(),
      created_by: userId,
    }]);
    return telegram.sendMessage(chatId, `✅ Published — new ${entry.kind} added.`, { threadId });
  }
}

function buildPreview(entry) {
  const label = entry.kind === 'space' ? '🎙 Space' : '🗓 Event';
  const when = entry.startsAt.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  const lines = [`👀 *Preview — ${label}*`, '', `*${entry.title}*`, when];
  if (entry.description) lines.push(entry.description);
  if (entry.link) lines.push(entry.link);
  return lines.join('\n');
}

export async function handleAddEventMessage(message) {
  const chatId = message.chat.id;
  const threadId = message.message_thread_id;
  const userId = message.from.id;
  const entryKey = pendingKey(chatId, userId);
  const entry = pending.get(entryKey);
  if (!entry) return;

  if (message.text?.trim() === '/admincancel') {
    return cancelPendingAddEvent(chatId, userId);
  }

  if (entry.stage === 'title') {
    if (!message.text) {
      return telegram.sendMessage(chatId, 'Please send text for the title, or /admincancel to abort.', { threadId });
    }
    entry.title = message.text.trim();
    entry.stage = 'description';
    entry.expires = Date.now() + PENDING_TTL_MS;
    return telegram.sendMessage(chatId, '📝 Send a description, or /skip.', { threadId });
  }

  if (entry.stage === 'description') {
    entry.description = message.text?.trim() === '/skip' ? null : (message.text?.trim() ?? null);
    entry.stage = 'link';
    entry.expires = Date.now() + PENDING_TTL_MS;
    return telegram.sendMessage(chatId, '🔗 Send a link (Space/Telegram/etc.), or /skip.', { threadId });
  }

  if (entry.stage === 'link') {
    entry.link = message.text?.trim() === '/skip' ? null : (message.text?.trim() ?? null);
    entry.stage = 'starts_at';
    entry.expires = Date.now() + PENDING_TTL_MS;
    return telegram.sendMessage(
      chatId,
      '🕒 Send the start date & time in UTC, like `2026-08-01 18:00`.',
      { threadId }
    );
  }

  if (entry.stage === 'starts_at') {
    const raw = message.text?.trim();
    const parsed = raw ? new Date(`${raw.replace(' ', 'T')}:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return telegram.sendMessage(
        chatId,
        "Couldn't parse that — please use the format `2026-08-01 18:00` (UTC), or /admincancel to abort.",
        { threadId }
      );
    }
    entry.startsAt = parsed;
    entry.stage = 'confirm';
    entry.expires = Date.now() + PENDING_TTL_MS;
    return telegram.sendMessage(chatId, buildPreview(entry), { threadId, replyMarkup: confirmKeyboard() });
  }
}
