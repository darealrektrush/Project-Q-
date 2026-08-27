# Bond the Duck Verified Referrals

Verified Referrals is a participant-acquisition mission, not a click or invite counter. Every Project Q participant receives one opaque Telegram bot deep link. The bot records first-touch attribution, while reward qualification remains closed until all required evidence exists.

## Qualification rules

A referral qualifies only when:

1. a new participant starts Project Q through the referrer's personal `?start=ref_<code>` link;
2. the referred Telegram ID was not already enrolled and is not the referrer;
3. the referred participant completes verified Telegram, Oracle X and reward-wallet identity;
4. Project Q receives proof of at least USD $2 of FAWKQ purchased after referral acceptance;
5. the referred participant earns positive, verified campaign XP after referral acceptance; and
6. no duplicate X identity, reward wallet, purchase reference or participant attribution exists.

The founder-approved referral reward is **10 XP per qualified new participant**. The value is locked in the reviewed DRAFT rules; no XP is awarded until the campaign is finalized, activated and the idempotent settlement path is enabled.

## One-time X invite bonus

Verified Referrals also contains a separate one-time bonus action: reply to the official pinned FAWKQ Bond the Duck post and mention exactly three distinct people who would genuinely be interested. The Oracle must verify the linked X author, conversation ID, directly referenced post and mention user IDs. The participant and official FAWKQ account are excluded from the three mentions, and each participant and reply can qualify only once.

The founder-approved one-time X invite reward is **5 XP**. The official pinned FAWKQ campaign post ID still must be published and locked before the rules can become FINAL. Repeated entries, copied replies and automated mention farming do not qualify.

## Participant experience

- The Telegram Missions centre includes Verified Referrals and displays the participant's personal link and current totals.
- The Mini App has a labeled Profile destination containing identity, XP, rank, eligibility and a referral dashboard.
- The referral funnel shows invited, qualified and bonus-awarded totals without exposing referred-user identities.
- A referred participant sees a confirmation when first-touch attribution is accepted.

## Integrity model

- Opaque codes prevent Telegram user IDs from being exposed in links.
- One code is stable per campaign participant.
- One referred Telegram ID can have only one first-touch attribution per campaign.
- Existing campaign participants and self-referrals are rejected atomically.
- Existing unique identity constraints continue to prevent one X account or wallet from backing multiple participants.
- A dedicated purchase-proof row must reference a post-referral acquisition of at least USD $2; a balance snapshot alone does not prove a purchase.
- Bonus XP will use an idempotent `xp_ledger` key and remains subject to the overall campaign XP policy when settlement is enabled.

## Current implementation state

The repository contains the referral data model, atomic capture RPC, bot deep-link capture, participant profile API, Mini App Profile UI, Telegram mission screen and deterministic qualification evaluator. The 10 XP referral value and 5 XP X invite value are locked in the reviewed DRAFT rules. Purchase-proof ingestion and bonus-XP settlement remain fail-closed until the Buy-to-Earn verifier, official pinned X post ID and final campaign rules are ready.

## Rollout and rollback

1. Lock the official pinned X post ID and finalize the complete campaign rules hash through founder governance.
2. Connect the Buy-to-Earn verifier to `campaign_referral_purchase_proofs`.
3. Apply the migration to a non-production branch and test self-referrals, existing users, duplicate identities, duplicate wallets, replayed links and purchases below USD $2.
4. Rehearse qualification and one idempotent XP award.
5. Apply to production only after the campaign readiness review.

Rollback is feature-level: hide the mission and stop capture/settlement while retaining attribution rows for audit. Do not delete awarded XP or referral evidence; corrections must be additive.
