# Project Q Earn to Burn

Earn to Burn is a reusable Project Q campaign module. Individual verified activity can earn campaign rewards while aggregated, append-only progress advances collective burn milestones. Bond the Duck is the first planned program.

In the Bond the Duck Mini App, Earn to Burn appears in Missions as the ninth visible lane, separated from the eight individual earning missions and linked to its public ledger. This makes the campaign mechanic discoverable without presenting the burn reserve as an individual reward allocation.

## Current state

- The engine, public ledger UI, read-only admin view, proof verifier, publishing-draft builder and database migration are present on `main`.
- The Earn-to-Burn schema migration is applied to the Project Q Supabase project. No program, milestone, proposal, receipt or publication row is seeded, so production remains inert.
- `PROJECT_Q_EARN_TO_BURN_ENABLED` and `PROJECT_Q_BURN_VERIFICATION_ENABLED` default to `false`.
- No burn has been executed or confirmed by this module.
- The planned opening burn is an additional 15,000,000 FAWKQ from the FAWKQ creator wallet. It is not part of the 15,000,000 FAWKQ campaign reward pool, the 2,500,000 FAWKQ Diamond Duck bonus, or the 1 SOL top-contributor prize.
- The five campaign-wide XP thresholds and equal burn amounts are founder-approved product rules, but they are not yet finalized into a production rules hash or seeded into the live program.

## Trust boundary

Project Q never stores a treasury secret or holds signing authority. The approved target experience allows it to prepare the exact unsigned burn transaction only after dual approval; the creator wallet still provides the irreversible execution signature. Its responsibilities are limited to:

1. recording qualifying progress from approved, deduplicated sources;
2. enforcing program, milestone, source-account and hard-cap rules;
3. recording decisions from exactly two configured founders;
4. preparing the fixed burn transaction after both approvals and accepting the creator wallet's signed result;
5. verifying the finalized Token or Token-2022 burn instruction and exact account/supply deltas;
6. writing an immutable receipt and audit event; and
7. preparing platform-specific publishing drafts for separate approval.

The 15,000,000 FAWKQ reserve remains in the creator wallet. Squads is not part of this burn flow. The two-founder Project Q approval record is an application control; the creator-wallet signature is the on-chain authorization.

## FAWKQ identity and exact arithmetic

- Mint: `GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump`
- Token program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)
- Decimals: `6`
- Original/reference supply: `1,000,000,000` FAWKQ (`1000000000000000` base units)
- Supply observed during the 2026-08-24 audit: `999,999,999.658335` FAWKQ (`999999999658335` base units)
- Planned opening burn: `15,000,000` FAWKQ (`15000000000000` base units)

## Bond the Duck commitments

| Commitment | Amount | Role |
| --- | ---: | --- |
| Existing campaign reward pool | 15,000,000 FAWKQ (1.5%) | 7,500,000 from each public founder wallet; fully funded before campaign launch; independent of Streamflow unlocks |
| Diamond Duck bonus | 2,500,000 FAWKQ (0.25%) | 1,250,000 per founder from their public Streamflow supply after its actual on-chain unlock |
| Top contributor prize | 1 SOL | Awarded to the top Bond the Duck contributor |
| Additional Earn to Burn reserve | 15,000,000 FAWKQ (1.5%) | Sourced separately from the FAWKQ creator wallet and burned only through the approved milestone process |

The total token commitment represented by the campaign is 32,500,000 FAWKQ (3.25% of the original reference supply), but only the additional 15,000,000 FAWKQ creator-wallet reserve is designated for Earn to Burn. The other 17,500,000 FAWKQ remains reward and bonus supply.

The main campaign pool and Diamond Duck bonus must not share a funding gate. The main 15,000,000 FAWKQ pool must be fully funded before launch and does not wait for Streamflow. Diamond Duck funding starts only after the actual on-chain Streamflow unlock; each founder contributes 1,250,000 FAWKQ to the public Squads Diamond Duck Bonus Vault within 48 hours. Project Q must not calculate or pay the bonus until the full 2,500,000 FAWKQ is verified.

The one-billion value is a campaign reference, not a substitute for an on-chain pre-burn observation. If no other supply change occurs, the audited observed supply minus the planned opening amount is exactly `984,999,999.658335` FAWKQ. Every receipt must store the actual verified before/after base-unit values.

## Lifecycle

`DRAFT → LOCKED → UNLOCKED → PENDING_APPROVAL → APPROVED → AWAITING_CONFIRMATION → CONFIRMED`

`HELD`, `CANCELLED` and `FAILED` are explicit non-success states. A milestone cannot become a confirmed public claim from progress or approval alone; a reconciled on-chain proof is mandatory.

## Collective progress pipeline

When both the campaign and Earn to Burn program are enabled, the existing campaign XP settlement job can synchronize positive, verified `xp_ledger` awards into the append-only burn progress ledger. The current engine uses one verified campaign XP as one collective progress unit. Every source row is referenced by its immutable XP ledger ID, and a unique constraint plus one atomic database function prevents replay or double counting.

After synchronization, every still-locked milestone at or below the verified total becomes `UNLOCKED` and receives an audit event. No milestone rows are currently seeded, so this mechanism remains inert until the final shared rules hash is approved and provisioned.

| Milestone | Cumulative verified XP | Burn amount | Cumulative burn |
| --- | ---: | ---: | ---: |
| 1 | 2,000 | 3,000,000 FAWKQ | 3,000,000 FAWKQ |
| 2 | 5,000 | 3,000,000 FAWKQ | 6,000,000 FAWKQ |
| 3 | 9,000 | 3,000,000 FAWKQ | 9,000,000 FAWKQ |
| 4 | 14,000 | 3,000,000 FAWKQ | 12,000,000 FAWKQ |
| 5 | 20,000 | 3,000,000 FAWKQ | 15,000,000 FAWKQ |

## Proposal and confirmation workflow

1. An unlocked milestone and approved, evidenced creator-wallet token account are selected.
2. Project Q creates an immutable-term proposal and moves the milestone to approval pending.
3. Exactly two configured founders independently approve the same rules/readiness hash. Either can hold; cancellation requires both founders.
4. After approval, Project Q prepares the exact transaction. The connected creator wallet reviews and signs once; no Project Q server receives the private key.
5. Project Q waits for Solana finalization, validates the Token-2022 burn instruction (including Squads inner instructions), exact mint/source/amount, source-account delta and expected supply delta.
6. An immutable receipt is recorded and missing platform publishing drafts are prepared. Each draft carries a SHA-256 content hash; founder approval must match that exact reviewed hash, and the database rejects direct draft-to-published transitions. Existing approved or published drafts are never reset.

The Telegram admin workflow stays read-only while the Earn to Burn feature flag is off. When enabled, an allowlisted founder can use a private Project Q chat to review the exact immutable proposal terms and record an approve, hold or cancel decision. A founder can also review and approve the exact stored publication body and SHA-256 hash. Transaction preparation and connected-wallet execution remain a separate implementation step and are not available in production today.

## Release checklist

- Reconcile the production migration history before applying the migration.
- Approve and hash the immutable program rules.
- Evidence and approve the exact source token account.
- Configure exactly two founder identities.
- Set a hard cap and maximum single-burn limit.
- Decide and test milestone thresholds and amounts.
- Rehearse proposal, dual approval, external signing, confirmation and draft approval on a non-production fixture.
- Verify the public receipt links, Solana explorer links, audit log and rollback/hold behavior.
- Enable flags only after the exact deployed commit and database state pass release review.
