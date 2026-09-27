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

Using Oracle:

- connect or recover the tester's X identity;
- return to Q;
- refresh verification status;
- confirm X shows verified;
- confirm Oracle remains the identity authority and Q only consumes the verified state.

### 3. wallet-session

Using Oracle and the verified reward wallet:

- connect/verify the reward wallet;
- return to Q;
- confirm reward destination;
- refresh wallet balance;
- confirm FAWKQ token-account state;
- confirm minimum-holder clearance state;
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
