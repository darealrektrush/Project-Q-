import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBurnProposalReview,
  buildBurnWorkflowKeyboard,
  buildPublicationDraftReview,
} from '../src/earnToBurn/adminUi.js';

const rulesHash = 'a'.repeat(64);

function workflowState() {
  return {
    program: {
      id: 'bond-the-duck-earn-to-burn',
      decimals: 6,
      mint: 'GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump',
    },
    sourceAccounts: [],
    founders: [{ founder_user_id: 123, founder_label: 'Founder 1' }],
    milestones: [{ id: 'opening', label: 'Opening <Burn>', state: 'APPROVAL_PENDING' }],
    proposals: [{
      id: 7,
      milestone_id: 'opening',
      burn_type: 'RESERVE_BURN',
      source_token_account: 'CreatorWalletTokenAccount',
      amount_base_units: '15000000000000',
      rules_hash: rulesHash,
      state: 'PENDING_APPROVAL',
      transaction_signature: null,
      approvals: [{ founder_user_id: 123, decision: 'APPROVE' }],
    }],
    receipts: [{
      id: 11,
      receipt_code: 'ETB-0011',
      publicationDrafts: [{
        id: 19,
        platform: 'TELEGRAM',
        body: 'Burn verified: 15,000,000 FAWKQ <proof & receipt>',
        body_hash: 'b'.repeat(64),
        state: 'DRAFT',
      }],
    }],
  };
}

test('founder mutation controls stay absent unless explicitly enabled', () => {
  const disabled = buildBurnWorkflowKeyboard(workflowState());
  assert.deepEqual(
    disabled.inline_keyboard.flat().map(({ callback_data }) => callback_data),
    ['admin:burnflow', 'admin:burn']
  );

  const enabled = buildBurnWorkflowKeyboard(workflowState(), { controlsEnabled: true });
  assert.deepEqual(
    enabled.inline_keyboard.flat().map(({ callback_data }) => callback_data),
    ['admin:burnreview:7', 'admin:burnpubreview:19', 'admin:burnflow', 'admin:burn']
  );
  assert.ok(enabled.inline_keyboard.flat().every(({ callback_data }) =>
    !/sign|execute|publish/i.test(callback_data)
  ));
});

test('proposal review shows exact immutable terms and decision-only actions', () => {
  const review = buildBurnProposalReview(workflowState(), 7);
  assert.match(review.text, /15,000,000 FAWKQ/);
  assert.match(review.text, /CreatorWalletTokenAccount/);
  assert.match(review.text, new RegExp(rulesHash));
  assert.match(review.text, /Opening &lt;Burn&gt;/);
  assert.deepEqual(
    review.keyboard.inline_keyboard.flat().map(({ callback_data }) => callback_data),
    [
      'admin:burndecide:7:APPROVE',
      'admin:burndecide:7:HOLD',
      'admin:burndecide:7:CANCEL',
      'admin:burnflow',
    ]
  );
});

test('stale proposal review cannot produce founder decision buttons', () => {
  const state = workflowState();
  state.proposals[0].state = 'APPROVED';
  assert.throws(() => buildBurnProposalReview(state, 7), /no longer accepting/);
});

test('publication review displays the exact stored body and hash safely', () => {
  const state = workflowState();
  const review = buildPublicationDraftReview(state, 19);
  assert.match(review.text, /Burn verified: 15,000,000 FAWKQ &lt;proof &amp; receipt&gt;/);
  assert.match(review.text, new RegExp('b'.repeat(64)));
  assert.equal(
    review.keyboard.inline_keyboard[0][0].callback_data,
    'admin:burnpubapprove:19'
  );
});

test('oversized publication content is blocked instead of approving a partial review', () => {
  const state = workflowState();
  state.receipts[0].publicationDrafts[0].body = 'x'.repeat(4000);
  assert.throws(() => buildPublicationDraftReview(state, 19), /safe Telegram review limit/);
});
