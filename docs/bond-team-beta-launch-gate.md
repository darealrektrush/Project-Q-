# Bond the Duck — Team Beta Launch Gate

This smoke test produces evidence for the existing `bond-team-smoke-v2` launch qualification gate. It does **not** change qualification rules and must run against isolated staging only.

## Before testing

- Use the Project Q staging / dev Mini App, not production data.
- Use at least **3 human testers**.
- Start from `config/bond-team-beta-evidence.template.json`.
- Keep every scenario `PENDING` until it was actually completed.
- Critical issues and high issues must both be zero before launch qualification.
- Evidence expires after **48 hours**.

## Required scenarios

### 1. telegram-navigation

Each tester launches Project Q from the official Telegram Mini App entry point and verifies:

- Operations Terminal loads at full mobile width.
- Bottom navigation exposes Terminal, Operations, Record, Rewards and Profile.
- Guided-tour welcome does not ambush the user before the UI settles.
- Begin Tour / Explore on My Own work.
- Telegram BackButton closes a Mission File first, then navigates backward inside Q.
- No horizontal overflow or clipped safe-area content.

### 2. x-oauth-link

From Project Q:

- start the visible **Connect X** action;
- complete or recover the tester's intended X identity through the Oracle Dev authority flow;
- return to Q;
- confirm X shows verified and the primary next action advances;
- confirm no duplicate profile is created;
- confirm the tester never needs to understand which service owns the identity record.

### 3. wallet-session

From Project Q:

- start **Verify Wallet** from Terminal, Rewards, or Profile;
- confirm detected Wallet Standard wallets are prioritized and major branded providers are recognizable;
- confirm the trust copy states **Signature only · 0 SOL · No claim transaction required**;
- complete reward-wallet verification through the Oracle authority flow;
- return to Q and confirm the same reward destination;
- confirm Rewards changes to **VIEW WALLET** after verification;
- refresh wallet balance;
- confirm FAWKQ token-account and minimum-holder checks remain automatic;
- reopen the Mini App and verify the same canonical wallet is resolved.

### 4. comprehension-recovery

Without coaching, each tester must be able to answer:

- Where am I?
- What is happening?
- What do I do next?
- Did my action count?
- Where will I see the result/receipt?

Then simulate or observe a non-destructive sync/error condition and verify the tester can recover using the visible status and Retry / next-action controls.

## Recording evidence

Set:

- `testerCount` to the number of testers who completed the run;
- `completedAt` to an ISO timestamp after the final scenario;
- each required scenario to `PASSED` only if the scenario passed;
- `criticalIssues` and `highIssues` to actual unresolved counts;
- `productionDataTouched` must remain `false`.

Validate locally:

```bash
npm run validate:bond-team-beta -- ./path/to/team-beta-evidence.json
```

A valid file exits successfully. A non-qualifying but well-formed file exits with code 2 and prints the blockers.

## Full launch qualification

The team beta is only one launch gate. Final qualification also requires:

- automated rehearsal green;
- full 175-release Devnet on-chain rehearsal evidence;
- production readiness green.

Run the full on-chain rehearsal with:

```bash
npm run rehearse:bond-devnet-full
```

Capture its JSON output to the evidence file used by `BOND_ONCHAIN_REHEARSAL_EVIDENCE_FILE`.


## Round 2 acceptance emphasis

The current participant contract is **Project Q owns the experience; Oracle owns canonical verification**.

Across Terminal, Operations, Rewards and Profile:

- the same X state must be shown;
- the same reward wallet must be shown;
- automatic checks must never look like additional setup tasks;
- READY must mean the two participant actions and all authoritative automatic checks are complete;
- no screen may instruct the participant to run a bot command for normal onboarding;
- no screen may expose Render/server implementation detail.

Treat any contradiction between these screens as a High issue.
