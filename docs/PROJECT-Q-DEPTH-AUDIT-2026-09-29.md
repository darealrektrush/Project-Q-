# Project Q depth, flow and recognition audit

Reviewed September 29, 2026. Baseline: Dev branch `project-q-operations-ui`, draft PR #148, commit `3a6cf1c85a542da597699831deb576f714bf4fd0`. Production `main` is outside this change. Skills applied: CrabStar project context, premium web UI, Telegram bot architecture and release validation. The approved premium mobile render and campaign-passport direction remain the visual and product specification.

**Assessment:** The new information architecture improves orientation, but the last pass removed useful depth along with duplicate navigation. Keep the five destinations and one full clearance checklist. Restore campaign context, contribution intelligence and earned recognition through compact summaries and purposeful detail views.

**Coverage and limits:** Compared the previous dossier implementation against current source, configuration, participant service and the live Dev preview. Inspected Terminal, Operations and MF-02 details, Record/Badges, Rewards, Profile, the bell and Ocean Impact. Responsive inspection includes 320, 390 and 768px layouts. The 560 existing automated tests pass after the profile-shortcut change. This is a product/UI and implementation audit, not evidence of a completed signed-in Telegram, live payout or wallet-signing rehearsal. Web preview is currently pre-launch, with identity and personal awards unavailable. No XP, badge, notification or payout rules were activated by this audit.

## Findings and priorities

| Priority | Finding | Evidence / recommendation |
| --- | --- | --- |
| P1 | Header identity is not interactive | `account-control` was a div with a default cursor. Convert to a native button using canonical Profile navigation. This is the only immediate product change in this audit. |
| P1 | Profile is now mostly setup | The previous operation summary, cycle context, contribution breakdown and pending Universal Record explanation were removed. Restore a campaign passport with compact summaries; retain one full clearance list. |
| P1 | Badge gallery is not an achievement system | `badgeGallery()` always renders `locked` and `Planned`; the profile's achievements array is not populated from an authoritative award source. Visual improvements alone cannot make these earned awards. |
| P1 | Two files disappeared without explanation | Configuration still has nine entries. The selector filters MF-06 and MF-09. Preserve their visibility as progress files linked to their canonical pages. |
| P1 | Receipt date can imply false verification timing | A delivery receipt labels `release.scheduledAt` as `Verified`, although the service supplies `confirmedBlockTime`. Separate scheduled time, confirmation time and evidence state. |
| P1 | Verification and progress states need stronger explanations | Locked missions should distinguish missing clearance, operation not open, source unavailable and cooldown. Keep readable instructions and official website browsing available without presenting visits as verified XP. |
| P2 | Record lost cumulative contribution intelligence | `xpByBucket` is loaded but no longer displayed as the old contribution breakdown. Add source totals, today's caps and current-cycle context with clearly different labels. |
| P2 | XP history is only a recent window | The participant service returns the latest 25 ledger rows; add pagination before treating the screen as a complete history. The separate 1,000-row contribution query also needs an aggregation/completeness strategy as the engine grows. |
| P2 | Bell is an operation-status dialog | It has no personal event inbox, unread count, read state or delivery preferences. Build these from verified events, not UI-generated announcements. |
| P2 | Badge art is unreadable at current size | Rich portrait artwork with embedded text is compressed into roughly 42–46px thumbnails. Use purpose-built medallions and readable HTML names, with large detail previews. |
| P2 | Empty and pending screens dominate the preview | Some repetition is due to genuine pre-launch state. Use concise pending explanations, last checked time and one meaningful next action, then validate populated states with fixtures and signed-in testers. |

## Screen recommendations

| Area | Keep | Restore or improve |
| --- | --- | --- |
| Terminal | Approved hero, ocean card, next step, snapshot | A compact relevant achievement/operation milestone; readable next-step text and CTA at 320px. Keep the main overview focused. |
| Operations / Briefing | Rules, dates, cycle schedule, public readiness | A readable operation timeline and progress summary; a concise explanation of how contribution, selection and settlement connect. |
| Operations / Missions | Tappable command cards, state filters, full dossier detail | All nine file identities visible; seven action files plus two progress files. Preserve stable MF numbers and explicit return paths. |
| Operations / Economics | Four purposes separated, compact pool figures, collective burn view | Clear allocation split, funding evidence, pool rules and treasury receipts as they become available. Preserve exact amounts in detail without oversized figures crowding mobile layouts. |
| Record | XP / Standing / one recognition destination | Cumulative source breakdown, current cycle XP, paginated receipts, meaningful achievement progress. Distinguish cycle XP totals from official selection results. |
| Rewards | Personal money, six stages, one wallet action | Next actual scheduled release, allocation and delivery receipts, truthful confirmation dates, recovery state and readable release schedule. |
| Profile | Telegram identity, Oracle authority, one clearance checklist | Campaign passport, verified highlights, earned badge showcase, compact operation summary, pending Universal Record status and notification settings. |
| Ocean Impact | Permanent CrabStar mission; deposits distinct from completed work | Clear receipt history and recognition progress, with links from Profile. Maintain separate founder/project deposits and contribution leaderboard. |
| Opening guide / shell | Replayable tour, bottom navigation, canonical section entries | Show actual screen content while explaining it; keep controls reachable. Header avatar opens Profile; bell opens notifications; detail back returns to parent. |
| Campaign bot | Launcher, status, explanation, conditional enrollment | Consistent status counts and next step; optional reminders rather than a second competing app menu. Old callback compatibility remains. |

## Profile: proposed campaign passport

Keep Profile as one page with progressive disclosure rather than reinstating the old four duplicate tabs.

1. **Identity:** Telegram photo, name, handle, Universal ID, actual Oracle rank when available. Keep permanent Crab Army rank distinct from operation XP and standing.
2. **Active operation:** Bond the Duck designation, cycle, total and current-cycle XP, standing, supported mission progress. Only counts with defined, complete evidence qualify; recent ledger entries are not an all-time verified-action count.
3. **Recognition showcase:** Up to three earned badges, next achievable milestone and one link to the full Achievements collection in Record.
4. **Clearance:** Same five authoritative checks and inline actions. During setup show next requirement prominently; once complete allow the checklist to collapse to its summary. The complete checklist remains in one place.
5. **Contribution summary:** Compact XP by source, reward position/next confirmed schedule and Ocean Impact receipt summary. Each summary has at most one clearly named detail action. Avoid duplicating full ledgers.
6. **Universal Record:** Explain eligible contribution review/settlement, and show confirmed Oracle sync receipts when the integration exists. Do not invent reputation grades or infer lifetime XP.
7. **Settings:** Notification preferences, verification refresh, guide replay and managed identity connections.

## Badges and Achievements

An achievement defines an objective, evidence and progress; a badge is the visual recognition of a completed achievement. The Crab Army rank remains Oracle's separate lifetime ladder.

Recommended Record label: **Achievements**, replacing the current Badges label while retaining the same third navigation destination. Inside it use simple filters: All, In progress, Earned. Planned/unavailable rules must be identifiable and must not imply unlockable awards.

Every achievement should have a readable title, short requirement, progress where actually measurable, state (Locked, In progress, Earned, Under review or Planned), and a detail sheet with rule/version, date and evidence receipt. Awards should be server-issued once per defined scope and unique event, then projected into Profile, Record and notifications.

| Proposed family | Examples | Evidence / boundary |
| --- | --- | --- |
| Readiness | Operation Ready | All configured clearance checks pass; do not grant spending-based rank. |
| Participation | First Verified Action, consistent participation milestone | Settled eligible records and a defined day/timezone rule; thresholds require approval. |
| Mission mastery | Voting Contributor, Community Operator, Referral Contributor | Accepted source-specific results; a click or referral invitation is not a completion. |
| Operation completion | Bond the Duck Finisher | Defined participation criteria and finalized operation review. |
| Competitive distinction | Top 10%, Top 5%, Top 1%, Top 10, Champion | Finalized eligible leaderboard snapshot; minimum cohort and overlap rules must be defined. |
| Ocean contribution | First Contributor, Repeat Contributor, Ocean tiers | Verified deposits and approved recognition rules; donation XP capped, spending leaderboard separate. |

The existing XP Earned, XP Master and six leaderboard badge definitions are retained. XP Master still lacks a concrete published threshold in the display configuration. Competitive badges need finalization and cohort rules before issuing awards. New names above are proposals, not activated mechanics.

Visual specification: one coherent insignia family, consistent silhouette and materials, gold earned treatment, blue verified progress and restrained muted locked state. Target 80–96px recognisable artwork in the collection and a large preview in detail. Use HTML for titles and requirements; avoid unreadable text baked into tiny art. Keep badge illustration separate from the achievement progress component.

## Campaign notifications

The bell should open a personal inbox with unread count, timestamps, read/unread state, a preferences control and context-aware actions. Preserve navigation history when an event opens a detail. Public announcements and participant events should be visibly distinct.

Recommended preference categories: mission availability/cooldown reminders; verified XP and submissions; cycle deadlines and selection results; allocation and delivery; earned achievements; Ocean Impact receipts/updates; operation announcements. Let users choose immediate or daily digest where relevant, quiet hours and Telegram delivery. High-frequency XP events should default to a digest rather than a DM for every action.

In-app events and outbound Telegram reminders are separate channels. Telegram supports `requestWriteAccess()` to request bot-message permission; the app must also honour category preferences and the user's Telegram/OS settings. A category toggle cannot guarantee a push alert or override a muted bot.

Persist preferences against the canonical profile and operation scope where applicable. Use unique verified source-event IDs to avoid duplicate notifications, maintain delivery attempts and blocked-DM handling, and honour opt-out/quiet hours. Never generate reward-paid, badge-earned or mission-verified alerts from front-end guesses. No third-party paid notification service is required for an initial in-app plus Telegram implementation on the existing stack.

Technical source: https://core.telegram.org/bots/webapps#initializing-mini-apps

## Nine files: proposed visible catalogue

| File | Type | Canonical detail |
| --- | --- | --- |
| MF-01 Oracle X Raids | Action | Mission detail |
| MF-02 Website Voting | Action | Mission detail and source cards |
| MF-03 Trending Bots | Action | Mission detail |
| MF-04 Bagwork | Action | Mission detail |
| MF-05 Buy-to-Earn | Action / eligible position | Mission detail |
| MF-06 Participation XP | Progress | Record / XP |
| MF-07 Community Pulse | Action | Mission detail |
| MF-08 Verified Referrals | Action | Mission detail |
| MF-09 Earn-to-Burn | Collective progress | Operations / Economics / Earn-to-Burn |

Recommended display: **9 operation files · 7 action missions · 2 progress files**. Keep MF-06 and MF-09 visible in a compact Progress Files group under the selector, with View XP / View burn progress actions. Do not imply that opening a ledger submits a mission or grants extra XP. Canonical data and award rules remain unchanged.

## Implementation order for approval

1. Immediate profile-photo shortcut (included), restore visible nine-file catalogue, correct receipt time labels and remaining glossary collisions.
2. Restore compact campaign-passport depth and cumulative Record contribution breakdown; make history completeness clear and add pagination.
3. Approve achievement rules, implement the authoritative achievement/award record, then rebuild art, collection and Profile showcase.
4. Implement personal inbox/read state and saved preferences, then add opted-in Telegram delivery, digest and quiet-hour handling.
5. Test empty, populated, pending, unavailable, failed and settled states at 320, 390, 430, 768 and desktop sizes, plus real Telegram identity and bot permission flows on Dev.

Approval of this plan should not silently activate new XP/multiplier rules, final leaderboard badges, donation recognition or message delivery. Review the actual achievement criteria and delivery defaults as part of their implementation. Project Q campaign scope stays separate from Oracle's identity authority and Crab Army lifetime rank.
