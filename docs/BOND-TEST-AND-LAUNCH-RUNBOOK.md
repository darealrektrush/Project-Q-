# Bond the Duck test and launch runbook

## Safety boundary

- Production remains `DRAFT` throughout rehearsal.
- Staging must not use the production Supabase project, FAWKQ mint, Squads vault, bot token, or webhook.
- Devnet keys are generated ephemerally and are never printed or persisted.
- The pinned campaign post remains the final launch input.
- No production transfer, burn, signature, activation, or publication is part of these rehearsals.

## Automated rehearsal

Run:

```bash
npm run rehearse:bond-automated
```

The command must prove five cycles, 25 winner slots, 175 unique release rows, exact 15M FAWKQ reconciliation, one-cycle winner cooldown, deterministic replay, recovery behavior, the 2.5M Diamond Duck reserve, five 3M Earn-to-Burn milestones, and separate 1 SOL and 0.10 SOL obligations. It intentionally reports `launchReady: false` until human and on-chain evidence exists.

## Isolated Devnet rehearsal

The public Devnet faucet is rate-limited. Use a dedicated Devnet RPC or a pre-funded ephemeral test environment when available. Never substitute mainnet.

```bash
BOND_REHEARSAL_NETWORK=devnet \
BOND_REHEARSAL_RPC_URL=https://api.devnet.solana.com \
BOND_REHEARSAL_ACK=TEST_ONLY_NO_PRODUCTION_ASSETS \
BOND_REHEARSAL_FULL_LEDGER=true \
npm run rehearse:bond-devnet
```

The full mode creates a disposable six-decimal Token-2022 mint and a fresh Squads 2-of-3 multisig, executes all 175 scheduled test transfers, executes five test burns, executes the separate test winner and conservation SOL payments, and reconciles balances and supply. Save the JSON output as short-lived evidence only after a successful run.

## Team beta

Use at least six trusted testers in an isolated staging deployment. Copy `config/bond-team-beta-template.json` outside the repository and record only pass/fail status—never wallet secrets, access tokens, private evidence, or personal identifiers.

Required roles and scenarios:

1. Eligible member: onboarding, identity, missions, XP, rank and rewards.
2. Ineligible member: below-$2 holder gate.
3. Duplicate identity: reused X, Telegram or wallet identity.
4. Founder/admin: exclusion from XP and ranking.
5. Evidence reviewer: approval, rejection and stale proof.
6. High-activity member: source cooldown and daily caps.
7. Referrer: qualified referral and three-person X invite.
8. Operations reviewer: outage, replay and payout recovery.

Any critical or high-severity issue resets the affected scenario to `PENDING` until the fix is deployed and retested. Evidence expires after 48 hours.

## Final qualification

```bash
BOND_TEAM_BETA_EVIDENCE_FILE=/secure/path/team-beta.json \
BOND_ONCHAIN_REHEARSAL_EVIDENCE_FILE=/secure/path/devnet.json \
BOND_PRODUCTION_READINESS_FILE=/secure/path/production-readiness.json \
npm run qualify:bond-launch
```

The campaign can be recommended for activation only when automated, team beta, full Devnet ledger, and production readiness gates all pass simultaneously. Funding and source evidence must also remain inside their 72-hour validity windows.

## Rollback and stop conditions

Stop the launch for any identity collision, unauthorized mutation, incorrect token program, base-unit mismatch, duplicate payment key, ambiguous signature, failed recovery, stale evidence, active mutation flag during rehearsal, or non-zero critical/high beta issue. Keep production `DRAFT`, disable mutation flags, and rerun the affected layer after correction.
