# Bond the Duck — human test packet

Use this with three trusted testers in the Campaign Testing topic. The current public app is a **prelaunch preview**. It is safe to review its wording and navigation, but that preview does **not** satisfy the isolated-staging beta gate.

## Phase A: public preview, available now

Open https://project-q-8k3a.onrender.com/campaign-app/ on a real phone and, if available, a second browser. The optional `Bond isolated public preview` GitHub Actions workflow only prints a temporary URL after its external reachability and read-only checks pass. Its Cloudflare tunnel failed that check on September 25; do not give testers a URL from a failed run. Do not connect a wallet, submit votes, link X, or provide private information for this phase.

1. Start at Home. Can you tell that the campaign is **PRE-LAUNCH** and that September 29 at 8:00 AM Pacific is a target awaiting approval? Does anything imply rewards are already available?
2. Open Missions and each visible lane. Can you explain what actions would count, what is closed until launch, and where to find the source details? Check that a disabled action does not promise XP.
3. Open XP, every Rank tab, Rewards, Earn to Burn, and Profile. Can you tell confirmed receipts from planned allocations and burns? Check that empty histories stay empty.
4. Find your next action and the explanation of Telegram, X, and wallet eligibility. Go back to Home without losing your place.
5. Report any clipped buttons, hard-to-read text, broken images, dead links, misleading countdowns, or terms you cannot explain. Include device, browser, screen, expected behavior, and actual behavior. Screenshots are useful; never include seed phrases, wallet signatures, OAuth tokens, or private identities.

**Result:** post `PASS`, `CONFUSING`, or `BROKEN` for each area and a brief explanation. This is feedback, not launch qualification evidence.

## Phase B: isolated staging, required for launch qualification

The intended test bots are `@testingCQ_bot` (Project Q) and the existing `@Oracle_Dev_cs_Bot` (Oracle dev). The founder also supplied `@testingCQO_bot`, but no separate Oracle bot is required for this test; keep it unused. These are reported handles; verify each selected bot's identity with Bot API `getMe` using its own token in protected configuration before the live beta. Do not paste tokens into Git, this document, or the testing topic. The operator first confirms a current campaign build with a **separate test database, bot, OAuth configuration, and wallets**, and that no production data or assets can be touched. The production campaign must remain `DRAFT`. Do not direct testers to the old suspended `project-q-dev` deployment or use production for these account-based scenarios.

### Lock-in checklist before inviting testers to the live beta

- [ ] Operator records the exact Git commit and reachable HTTPS Mini App URL, and confirms the URL loads on a tester's phone. The suspended free Render service and an unverified temporary tunnel do not qualify.
- [ ] Operator verifies the test database is separate from production, applies the current migrations, and confirms writes and resets cannot reach the production project. No production user export or real treasury credentials go into staging.
- [ ] Founder uses `@testingCQ_bot` as the Project Q beta bot and supplies its token through protected environment configuration, never in the testing topic or Git. Operator checks `getMe`, `/startq`, Mini App launch and webhook identity against that bot.
- [ ] Operator provides an isolated Oracle identity and wallet-event route plus a test X OAuth client/redirect. The production Oracle identity service and production X account links must not be changed for this beta. If that integration is unavailable, `x-oauth-link` and the authenticated beta remain `PENDING`.
- [ ] Operator verifies the existing `@Oracle_Dev_cs_Bot` through `getMe`, `/linkx`, its X callback and a separate Oracle beta database. Confirm that the dev worker's effective token resolves to that bot and not production before resuming it. Its OAuth redirect must target the beta endpoint and its token must never be configured in production. The existing `crabstar-oracle-bot-dev` is suspended and the Oracle Blueprint says it shares the production Telegram token; do not resume or treat it as a beta bot. `@testingCQ_bot` is the Project Q test bot only and cannot substitute for Oracle `/linkx`.
- [ ] Operator configures Devnet-only test wallets and token fixtures, with live transfer, distribution, burn and production posting flags off. No member supplies a seed phrase, signs a mainnet transaction, or funds a mainnet vault.
- [ ] Three testers join the Campaign Testing topic, each using their own Telegram and X test identity and an empty test wallet. Record only device/browser and a tester label in the topic.

### Short-cycle session, after the checklist is complete

Budget 10 minutes for setup and baseline; 35 minutes for Telegram, X and wallet identity; 25 minutes for missions, vote/trend cooldown feedback, eligibility and receipts; and 20 minutes for ranks, rewards, recoveries and issue triage. Run the same build on three real mobile Telegram clients. A test-only fixture may present pre-launch, active, review and completed screens within the session; it must not change the five 48-hour cycle production rules or masquerade as actual elapsed time.

| Coverage | Human check | Separate automated or Devnet proof |
| --- | --- | --- |
| Telegram and identity | `/startq`, navigation, reopening, receipt; verify wrong bot and duplicate account fail safely. | Auth/session and identity collision tests. |
| X and wallet | Consent, cancellation, expiry, reconnect, rejected signing and wrong network. | Oracle integration and wallet binding checks on isolated data. |
| Holder and missions | Explain $2 eligibility, lower balance, raids, vote/trend link and cooldown messages, buy-to-earn, referrals and proof states. | Eligibility, caps, source certification and settlement tests. Real third-party sources need separate current certification. |
| XP and ranking | Inspect credited versus pending XP, founder exclusion, rank and leaderboard text. | Five-cycle winner selection, one-cycle cooldown and replay checks. |
| Rewards and impact | Distinguish scheduled, released, burn, 1 SOL winner prize and 0.10 SOL conservation obligation from completed receipts. | 175 release rows, 15M reward reconciliation, 2.5M reserve, 15M burn and both SOL obligations in the offline rehearsal; actual 175 transfers and five burns require the full isolated Devnet run. |

Record `PASS`, `FAIL`, or `PENDING` for each row and fix any high or critical defect before repeating the affected path. A 90-minute session verifies human behavior and screen comprehension; it cannot compress real 48-hour third-party cooldowns, ten days of activity, or mainnet payments. The automated rehearsal already simulates all five cycles without signing, but the full Devnet ledger and current source evidence remain independent gates.

Run one 60–90 minute session with at least three trusted testers on real mobile Telegram clients. Each tester records pass/fail and a short issue description without credentials or personal identifiers.

| Scenario ID | Tester action | Pass condition |
| --- | --- | --- |
| `telegram-navigation` | Send `/startq`, launch the Mini App, move through Home, Missions, Profile, and back, then inspect a test receipt. | Correct test bot and account, usable navigation, accurate receipt/status, and recovery after reopening. |
| `x-oauth-link` | Start X link, review consent, return to the Mini App, and try a cancelled or expired flow. | Only the intended test identity links; cancellation/expiry has clear recovery text; no account collision. |
| `wallet-session` | Connect and reconnect a test wallet, reject a signature, and try the wrong network. | Address and network are clear, rejection does not count as verification, and recovery does not expose secrets. |
| `comprehension-recovery` | Without coaching, explain the $2 FAWKQ holder requirement, next action, proof/result state, and how to recover from a failed step. | All three testers can identify those points and do not mistake planned rewards for delivered rewards. |

Stop and mark the affected scenario `PENDING` for any critical or high issue. Fix and retest before recording `PASSED`. Never mark a scenario passed solely from automated tests or the public preview.

## Recording the result

Keep the completed evidence file outside Git and the testing topic. Copy `config/bond-team-beta-template.json` to a protected location. Fill `testerCount`, UTC `completedAt`, issue counts, and the four scenario statuses only after the staging session. Set `productionDataTouched` to `false` only after checking isolation. Evidence expires after 48 hours; run `npm run qualify:bond-launch` with `BOND_TEAM_BETA_EVIDENCE_FILE` pointing to the protected file. The qualifier also requires the separate full Devnet and production-readiness evidence.
