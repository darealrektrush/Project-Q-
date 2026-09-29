# Ocean Impact recognition — proposal 1

Project Q Dev displays this program as **proposed**. No transfer, receipt, badge, XP, leaderboard entry, multiplier or shout-out is activated by this document. Project Q owns campaign rules and receipts; Oracle owns the permanent CrabStar identity, lifetime Crab Army XP and the existing rank ladder.

## Evidence and identity

1. The member has a valid signed Telegram Mini App session and an Oracle verified wallet. A read-only signature check can match a finalized mainnet transfer from that wallet to the founder-confirmed conservation vault `J9J6MsSxicqmwTuzJGHitVUuUhRwP4iaDdTRgMAUDj4p`. The approved FAWKQ Token-2022 and native USDC receiving accounts are validated separately. A pasted signature alone never earns credit.
2. Before launch, store immutable contribution receipts with a unique network/signature/asset/source key, wallet, vault destination, original integer units, finalized slot/time, mint/program, proof version and identity. Replay returns the original receipt; changed terms fail. Reconcile through a server-controlled transaction verifier, never a client-supplied amount.
3. A contribution to the vault is **funds received**. Conservation commitments, expenditure and documented work require separate evidence and public records. A balance is neither received-total history nor completed impact.
4. Only verified community wallets enter community boards. Founder/project-funded deposits remain visible in a separate section. Exclude founder/admin profiles from campaign XP and the general participation leaderboard.

## Recognition proposed for approval

| Element | Draft rule | Gate |
| --- | --- | --- |
| Ocean Supporter | One distinct UTC day with a verified contribution | Saved receipt |
| Ocean Protector | Three distinct contribution days | Saved receipts |
| Ocean Guardian | Ten distinct contribution days | Saved receipts |
| Ocean Steward | Twenty-five distinct contribution days | Saved receipts |
| First Contributor / Repeat Contributor | First receipt / three distinct days | Saved receipts |
| Campaign Contributor | Verified contribution during an active campaign | Approved campaign rule and receipt |
| Campaign XP | One priced, qualifying contribution per Vancouver campaign day; base 4 XP, 5 XP after a repeat day, 6 XP after five prior days; maximum 12 ocean XP per campaign | USD floor and historical price source approved; 75/day overall campaign cap also applies; no existing XP awarded retroactively without policy |
| Crab Army XP | Separate rule-bound Oracle lifetime award after Q settlement | Oracle confirms identity, unique event and award receipt; no automatic XP conversion |

The 4/5/6 XP amounts describe a **draft participation multiplier** of 1× / 1.25× / 1.5× on a 4 XP base. It rewards consistency, not donation size. Proposed awards cannot run until a minimum qualifying value, pricing method, campaign-day limits, founder handling and ruleset version are approved and tested. Deposits below the eventual XP floor still receive a verified impact receipt and count as contributions.

## Community views

- **All-time contributors:** total verified community contributors and transaction count; anonymous members count in aggregates.
- **Current campaign:** only qualifying receipts with a campaign association created under approved rules; older/later contributions stay in lifetime history.
- **Participation board:** distinct contribution days, then receipt count. Only `PUBLIC` or `ALIAS` profiles appear with a name. `ANONYMOUS` never displays an identity. No donation amount increases general campaign standing directly.
- **Top-value board:** requires original asset amount plus a historical USD quote captured and versioned at contribution time. No cross-asset comparison using raw SOL/USDC/FAWKQ units or current prices. Show the original asset on each receipt.
- **Recent contributors:** opt-in names or aliases only, with aggregate anonymous count. Project and founder deposits have their own visible record.

## Privacy and shout-outs

New members start anonymous until they explicitly choose public profile or alias. Alias text needs length, character and moderation limits. Shout-out permission is a separate opt-in: an in-app thank-you is private by default; an external daily roll-up and individual milestones require recorded consent and the specific destination/channel. A withdrawn opt-in prevents future posts, but cannot undo content previously published. Posting services use a deduplicated delivery outbox and do not retry ambiguous results automatically.

## Deployment boundary

The current connected Supabase tool exposes only the production Oracle project; it does not expose Project Q Dev's isolated database. Do not run Project Q schema changes against Oracle production. The next implementation stage needs Dev schema/migrations for immutable receipts, privacy preferences, historical pricing evidence and publication outbox; then end-to-end test with a signed Telegram session and controlled mainnet transfers. Wallet signing, transaction preparation, persistent receipt issuance, campaign settlement, Oracle awards, public leaderboards and social posting remain closed until these gates pass.
