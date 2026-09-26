# Bond the Duck — human test packet

Use this with three trusted testers in the Campaign Testing topic. The current public app is a **prelaunch preview**. It is safe to review its wording and navigation, but that preview does **not** satisfy the isolated-staging beta gate.

## Phase A: public preview, available now

Open https://project-q-8k3a.onrender.com/campaign-app/ on a real phone and, if available, a second browser. Do not connect a wallet, submit votes, link X, or provide private information for this phase.

1. Start at Home. Can you tell that the campaign is **PRE-LAUNCH** and that September 29 at 8:00 AM Pacific is a target awaiting approval? Does anything imply rewards are already available?
2. Open Missions and each visible lane. Can you explain what actions would count, what is closed until launch, and where to find the source details? Check that a disabled action does not promise XP.
3. Open XP, every Rank tab, Rewards, Earn to Burn, and Profile. Can you tell confirmed receipts from planned allocations and burns? Check that empty histories stay empty.
4. Find your next action and the explanation of Telegram, X, and wallet eligibility. Go back to Home without losing your place.
5. Report any clipped buttons, hard-to-read text, broken images, dead links, misleading countdowns, or terms you cannot explain. Include device, browser, screen, expected behavior, and actual behavior. Screenshots are useful; never include seed phrases, wallet signatures, OAuth tokens, or private identities.

**Result:** post `PASS`, `CONFUSING`, or `BROKEN` for each area and a brief explanation. This is feedback, not launch qualification evidence.

## Phase B: isolated staging, required for launch qualification

The operator first confirms a current campaign build with a **separate test database, bot, OAuth configuration, and wallets**, and that no production data or assets can be touched. The production campaign must remain `DRAFT`. Do not direct testers to the old suspended `project-q-dev` deployment or use production for these account-based scenarios.

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
