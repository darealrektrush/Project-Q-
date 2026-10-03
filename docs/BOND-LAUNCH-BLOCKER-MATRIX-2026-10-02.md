# Bond the Duck — Launch Blocker Matrix

Updated October 2, 2026.

This document is the pre-launch source of truth for Project Q / Bond the Duck. It separates:

- participant beta readiness;
- launch evidence / governance;
- financial and on-chain readiness;
- final activation.

Production must remain fail-closed until every required gate is evidenced.

## Current verified state

Observed from the live **Project Q Dev** database and current Project Q Operations branch.

### Green / already in place

- Campaign exists and remains `DRAFT`.
- Campaign funding recorded in Dev remains `0`.
- Participant allocations: `0`.
- Cycle winners: `0`.
- Two campaign founders are configured.
- All fourteen verification sources are registered.
- Ruleset history exists through version 3.
- Premium V5 participant UI is implemented.
- Wallet provider polish is implemented.
- Project Q can start X and wallet verification from the participant UI.
- Rewards can start wallet verification directly.
- Standard CI is green on the latest shipped participant-flow changes.
- Bond deterministic and disposable-Supabase safety rehearsals are required on every launch-sensitive PR.

These items are evidence that the system remains safely pre-launch. They are not permission to activate.

## Layer 1 — Round 2 participant beta

### Goal

Prove that a real participant can complete setup and understand the product without coaching.

### Required

- Minimum three real-phone testers.
- Launch from `@testingCQ_bot`.
- Project Q Dev only.
- Production data untouched.
- Evidence completed within 48 hours.
- Zero unresolved Critical issues.
- Zero unresolved High issues.

### Required scenarios

1. Telegram / Mini App navigation.
2. X connection / recovery started from Project Q.
3. Reward-wallet verification started from Project Q.
4. Comprehension + safe recovery.

### X acceptance

- Connect X begins from Project Q.
- Oracle Dev remains canonical authority behind the handoff.
- Correct X identity resolves on return.
- No duplicate Project Q profile is created.
- Next action advances from X to wallet.
- Terminal / Operations / Rewards / Profile do not disagree about X status.

### Wallet acceptance

- Verify Wallet begins from Project Q.
- Detected Wallet Standard providers appear first when available.
- Phantom / Solflare / Backpack are recognizable.
- Trust copy clearly states:
  - Signature only
  - 0 SOL
  - No claim transaction required
- The exact canonical wallet resolves after verification.
- Rewards changes from VERIFY WALLET to VIEW WALLET.
- FAWKQ token-account and minimum-holder checks remain automatic.
- Reopening the Mini App resolves the same wallet.
- No participant seed phrase / private key / transfer transaction is requested.

### Beta gate status

**PENDING HUMAN RUN.**

This is the next user-facing test milestone.

---

## Layer 2 — Final rules and schedule

### Current Dev state

- Ruleset versions: 1, 2, 3.
- Current campaign ruleset version: 3.
- Dev currently contains seven legacy September rehearsal cycles.
- Final launch requires five contiguous 48-hour cycles covering exactly ten active days.
- Existing legacy cycles must not be treated as launch schedule evidence.

### Required to clear

- Final pinned X campaign post ID.
- Final referral / X-invite values already represented truthfully in the immutable packet.
- Final Earn-to-Burn terms.
- Two-founder approval of the exact final rules proposal.
- Finalization of the next immutable rules version.
- Schedule the five real future cycles using the finalized rules hash.
- Confirm the legacy seven-cycle rehearsal data cannot be mistaken for the launch schedule.

### Status

**BLOCKED — governance + final schedule evidence required.**

---

## Layer 3 — Verification source certification

### Current Dev state

- 14 sources registered.
- 8 `PROOF_SUPPORTED` sources are pending certification.
- 1 `COMMUNITY_PROGRESS_ONLY` source is currently recorded with no participant receipt.
- 5 sources are currently unavailable / degraded classifications.
- Current launch certifications recorded: 0.

### Required to clear

- Review all 14 sources in the launch window.
- Record truthful health state for each source.
- Supply current evidence URL + SHA-256 evidence hash.
- Proof-supported sources must satisfy the current healthy requirement.
- Community-progress-only / unavailable sources must retain truthful classifications.
- Submit the full certification packet through the controlled founder flow.
- Certifications must remain fresh for launch.

### Status

**BLOCKED — current evidence packet required.**

---

## Layer 4 — Campaign funding

### Current Dev state

- Campaign funded base units: 0.
- Funding proposals: 0.
- Funding decisions: 0.
- Funding finalizations: 0.

### Required campaign funding evidence

- 17,500,000 FAWKQ Squads campaign commitment.
- Verified Squads vault ownership / threshold evidence.
- 2-of-3 approval model reconciled.
- 1 SOL Top Contributor prize commitment.
- Conservation contribution commitment.
- Conservation vault identity.
- Total SOL commitment reconciliation.
- Evidence URL + SHA-256.
- Fresh verification timestamp.
- Founder proposal / decisions / finalization.

Funding finalization must reconcile exactly to the configured campaign amount. A proposal alone is not funding.

### Status

**BLOCKED — funding evidence and founder governance required.**

---

## Layer 5 — Earn to Burn provisioning

### Current Dev state

- Earn-to-Burn program: not provisioned.
- Burn source accounts: 0.
- Burn founders: 0.
- Burn milestones: 0.

### Required to clear

- Final rules hash must already be locked.
- Provision the exact 15,000,000 FAWKQ creator-wallet burn reserve.
- Record verified source-account evidence.
- Bind the program to the final rules hash.
- Configure approved founders.
- Configure all five burn milestones.
- Reconcile hard cap and per-burn limits.
- Audit provisioning before enabling any burn mutation flag.

### Status

**BLOCKED — provisioning intentionally not started.**

---

## Layer 6 — Draw commitments

### Current Dev state

- Five-cycle launch commitments required.
- Current draw commitments: 0.
- Existing legacy cycle rows do not satisfy this gate.

### Required to clear

- Final five launch cycles must exist first.
- Create one deterministic pre-open commitment for each cycle.
- Bind commitments to exact future cycle identity.
- Verify commitment packet before campaign opening.

### Status

**BLOCKED — depends on finalized rules + five-cycle schedule.**

---

## Layer 7 — Full Devnet financial rehearsal

### Required

Run the full `FULL_175_RELEASE_LEDGER` rehearsal and preserve fresh evidence.

The evidence must prove all launch-qualification gates, including:

- isolated Devnet;
- correct token program / mint behavior;
- 2-of-3 Squads threshold;
- planned 175 transfers;
- exact 15M reward ledger;
- full reward ledger execution;
- vault balance reconciliation;
- exact 15M burn execution;
- supply-burn reconciliation;
- impact payments remain separate from participant rewards.

Evidence expires after 48 hours for final qualification.

### Status

**PENDING — run after funding / burn / schedule configuration is aligned.**

---

## Layer 8 — Production readiness

The twelve production readiness checks must all pass against the exact launch state.

Minimum categories:

- final rules;
- funding;
- deployment registry;
- source certifications;
- final schedule;
- draw commitments;
- Mini App access;
- wallet verification;
- campaign XP settlement;
- Earn-to-Burn configuration;
- burn progress accounting;
- burn on-chain verification.

The readiness report fingerprint must be available and stable.

### Status

**BLOCKED by Layers 2–7.**

---

## Layer 9 — Final launch qualification

Final launch qualification requires all four top-level gates:

1. Automated rehearsal — green.
2. Team beta — green and fresh.
3. Full on-chain rehearsal — green and fresh.
4. Production readiness — green.

No single gate substitutes for another.

### Status

**NOT YET QUALIFIED.**

---

## Layer 10 — Two-founder activation

Only after the full readiness report is green:

- obtain the exact readiness report version;
- obtain the complete SHA-256 readiness fingerprint;
- Founder 1 records APPROVE against that exact report;
- Founder 2 records APPROVE against that exact report;
- confirm no later HOLD exists;
- activation runs as a distinct gated action.

Any material readiness change invalidates prior approvals and requires fresh decisions.

### Status

**FINAL STEP — DO NOT PERFORM EARLY.**

---

# Recommended execution order

## Now

1. Finish Round 2 beta packet.
2. Run three real-phone testers.
3. Fix any Critical / High beta issue.
4. Re-run beta until evidence is clean and fresh.

## Immediately after beta

5. Lock final pinned X post.
6. Prepare and approve final rules packet.
7. Replace legacy schedule with the exact five future 48-hour cycles.
8. Certify all 14 verification sources.
9. Finalize deployment / vault registry.
10. Produce and finalize campaign funding evidence.
11. Provision Earn to Burn against the final rules hash.
12. Record five pre-open draw commitments.

## Final rehearsal

13. Run the full 175-release Devnet rehearsal.
14. Generate fresh production readiness.
15. Generate final launch qualification.
16. Resolve every blocker until the report is fully green.

## Activate

17. Two founders review the exact final readiness fingerprint.
18. Record two current approvals.
19. Execute the separately gated DRAFT / SCHEDULED -> ACTIVE process only when the approved launch window begins.

---

# Freeze rule

From this point until launch:

**No broad feature expansion.**

Allowed work:

- Critical / High beta fixes.
- UX continuity fixes that reduce participant failure.
- launch evidence / governance tooling;
- testing;
- security / correctness fixes;
- deployment / readiness fixes;
- launch-blocker resolution.

Anything else goes to post-launch backlog.
