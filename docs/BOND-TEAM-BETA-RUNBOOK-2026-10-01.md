# Bond the Duck — Tester Readiness Runbook

Updated October 1, 2026. This runbook is for **isolated Project Q Dev only**. It does not activate production, move treasury assets, create production rewards, or certify launch evidence.

## Current staging entry points

- Project Q Dev Mini App bot: `@testingCQ_bot`
- Project Q Dev service: `https://project-q-dev.onrender.com`
- Oracle Dev bot: `@Oracle_Dev_cs_bot`
- Project Q Dev database: isolated `project-q-dev` Supabase project
- Production Project Q remains outside this test.

The Project Q Dev → Oracle Dev identity resolver is configured and has returned successful resolver responses. The Project Q Dev Telegram webhook is also reconciling cleanly.

## What is ready to test now

Human beta should test the real participant experience that does not require production campaign activation:

1. Signed Telegram Mini App launch and identity.
2. Terminal, Operations, Record, Rewards and Profile navigation.
3. First-open guide, safe areas, back navigation and reopening.
4. Oracle X connection/recovery reflected back into Project Q.
5. Oracle reward-wallet continuity reflected back into Project Q.
6. FAWKQ token-account and minimum-holder clearance presentation.
7. Profile → Achievements → verified-history navigation.
8. Reward states that distinguish allocation, schedule, release and confirmed receipt.
9. Non-destructive session/retry/recovery behavior.
10. User comprehension without coaching.

## What must remain blocked during team beta

Do **not** force these green for human beta. They are production-readiness gates and require real evidence:

- FINAL Bond rules and official pinned X campaign post ID.
- Final five-cycle database schedule.
- Verified 17.5M FAWKQ Squads funding evidence.
- Deployment/vault registry finalization.
- Verification-source certifications.
- Five deterministic draw commitments.
- Earn-to-Burn creator-wallet source evidence and provisioning.
- Burn progress/on-chain verification activation.
- Production settlement/financial activation.
- Founder launch approvals.

The Dev readiness screen should show these as explicit blockers instead of implying they are complete.

## Required three-tester run

Each tester should use a real phone and launch from `@testingCQ_bot`.

### A. Telegram navigation

Pass only when:

- Terminal loads without a broken splash or clipped layout.
- Five bottom-nav destinations are usable.
- Guided tour begins only after the interface settles.
- Mission File open/back behavior is predictable.
- Telegram BackButton returns to the parent view before leaving Q.
- Reopening the Mini App returns to a coherent state.

### B. Oracle X identity

Pass only when:

- tester opens Oracle Dev from Project Q;
- connects or recovers their intended X account;
- returns to Project Q;
- Refresh Verification shows the canonical X state;
- no duplicate Project Q identity is created.

### C. Wallet session

Pass only when:

- one reward wallet is verified through Oracle Dev;
- Project Q shows the same wallet as the reward destination;
- wallet refresh works;
- FAWKQ token-account and holder state are understandable;
- reopening Project Q resolves the same canonical wallet.

### D. Comprehension and recovery

Without prompting, ask the tester:

- Where are you?
- What is happening?
- What should you do next?
- How do you know whether an action counted?
- Where do you see an allocation, release or confirmed receipt?

Exercise a safe Retry/recovery state. The tester should be able to recover using the UI.

## Evidence

Copy `config/bond-team-beta-evidence.template.json` and fill it only with observed results.

Qualification requires:

- at least 3 completed testers;
- all four required scenarios marked `PASSED`;
- zero unresolved critical issues;
- zero unresolved high issues;
- `productionDataTouched: false`;
- completion within the previous 48 hours.

Validate with:

```bash
npm run validate:bond-team-beta -- ./path/to/team-beta-evidence.json
```

## After team beta

Only after the human beta is clean should launch provisioning continue:

1. finalize the official campaign post ID and FINAL rules;
2. schedule the locked five Oct 5–15 cycles;
3. certify verification sources;
4. finalize deployment/vault registry;
5. provision Earn-to-Burn with verified creator-wallet evidence;
6. record five pre-open draw commitments;
7. verify the 17.5M FAWKQ campaign funding commitment and separate SOL commitments;
8. run the full 175-release Devnet rehearsal;
9. generate fresh launch qualification evidence;
10. perform the two-founder activation process.

Production activation must remain fail-closed until those gates are actually evidenced.
