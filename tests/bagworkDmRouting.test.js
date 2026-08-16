import test from 'node:test';
import assert from 'node:assert/strict';

import { isFeedbackReply } from '../src/lib/bagwork.js';

const prompt = { prompt_message_id: 10 };

test('private commands are not consumed as bagwork feedback', () => {
  const message = { chat: { type: 'private' }, text: '/start' };
  assert.equal(isFeedbackReply(message, prompt), false);
});

test('plain private replies still answer an open bagwork feedback prompt', () => {
  const message = { chat: { type: 'private' }, text: 'The platform worked well.' };
  assert.equal(isFeedbackReply(message, prompt), true);
});
