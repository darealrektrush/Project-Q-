# Project Q campaign navigation

Approved September 29, 2026 following the professional walkthrough review. This change applies to the Project Q campaign app and campaign bot launcher. Oracle, Universe, Universal ID and Crab Army lifetime scoring keep their existing responsibilities.

| Destination | Owns |
| --- | --- |
| Terminal | Operation artwork/status, shared next step, participant snapshot, Ocean Impact entry |
| Operations / Briefing | Operation story, rules, schedule/status, clearance summary, public launch-readiness entry |
| Operations / Missions | Seven actionable Mission Files, with instructions, verification and reward rules |
| Operations / Economics | Four pool detail views, collective burn progress, treasury disclosure |
| Record / XP | Today's source/cap progress and settled XP history |
| Record / Standing | One leaderboard filter and participant cycle XP totals |
| Record / Badges | One deduplicated list of configured badges, marked planned until an award source exists |
| Rewards | Personal allocations, six evidence-based stages, allocation/delivery receipts, one wallet action |
| Profile | Telegram identity, canonical ID, the sole full clearance checklist, refresh/replay/settings |
| Profile / Wallet | Reward destination, token account, observed balance and holding state, destination protection |

## Shared state

`public/campaign-app/participant-guidance.js` supplies the app and bot with the same display-only clearance checks and next-action rules. Bond uses Telegram, Oracle X, verified reward wallet, FAWKQ token account, and minimum $2 holding. The count is derived from configured requirements. Three identity connections alone do not imply five-item clearance. No display rule changes server-side eligibility, settlement or award rules.

## Stable Mission Files

Participation XP (MF-06) is reporting, now Record / XP. Earn-to-Burn (MF-09) is collective reporting, now Economics / Earn to Burn. Their configuration and ledger identifiers remain intact. Actionable files retain their original numbers, including MF-07 Community Pulse and MF-08 Verified Referrals. Referral details and copyable links live within MF-08; Community Pulse rules live within MF-07. Buy-to-Earn position lives within MF-05.

## Entry and return

General bottom/sidebar navigation always enters the canonical destination: Operations / Briefing, Record / XP, and Profile's identity/clearance page. Explicit actions named for a detail may open it directly: See the pools opens Economics; Open wallet opens Wallet. Pool details return to Economics. The notification bell opens an Updates list instead of navigating to Intel. The guide remains replayable from Profile.

## Bot

The campaign launcher exposes Open Campaign App, My Status, and How it Works. Enroll appears only when the authoritative runtime reports the operation operational. All operations is reserved for more than one supported operation. Existing callback handlers remain compatible with older messages. The main bot's other areas are unchanged.

## Truthful reporting limits

Allocation receipts use participant-filtered current allocation rows; delivery receipts require a recorded release/signature. Configured treasury commitments are not proof of deposited or delivered funds. A campaign-wide treasury receipt feed is not available yet and is labelled accordingly. Cycle results show the member's settled cycle XP; selection/payout results are not inferred. Historical operation history is limited to the supported operation and appears only after completion for a participant with an actual record. Oracle rank remains pending until the canonical rank read is available. Ocean Impact remains a permanent in-app destination with its existing gates.
