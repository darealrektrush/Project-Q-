# Project Q Campaign Dossier

Approved visual direction: the user supplied Campaign Dossier render, archived at `docs/design/campaign-dossier-reference.jpg`. The reference contains illustrative participant values. No example XP, rank, wallet, reputation, or impact totals may be displayed as real state.

## Identity boundary

One person has one Universal CrabStar ID. Oracle owns canonical identity, lifetime Crab Army XP, its rank ladder, and settled cross-ecosystem receipts. Project Q owns campaign XP, mission outcomes, standings, campaign reward release records, and current-operation presentation. Project Q may show Oracle's rank only after Oracle provides a confirmed identity and rank response; a Project Q leaderboard position must be called **Campaign Standing**.

## Dossier composition

1. Signed Telegram portrait, name, and username. The header shows the campaign designation. A missing Oracle rank is explicitly pending.
2. Four primary tabs: Dossier, Activity, Rewards, Identity. Wallet and Referrals remain reachable from Identity without becoming bottom navigation destinations.
3. Campaign clearance uses the five configured campaign requirements with a compact verified/pending count. Identity explains each provider and the next step.
4. Campaign record shows backed values for campaign XP, standing, completed mission codes, current cycle, recent verified entries, and next scheduled release. `recentActivity` is limited to 25 rows, so its count must not be presented as an all-time action count.
5. Contribution breakdown shows the four real campaign XP buckets. Buy-to-Earn eligibility or conservation impact must not be derived from XP buckets.
6. Reward position summarizes allocated, scheduled, and distributed FAWKQ, linking to the full receipt pipeline.
7. Reputation and individual impact require separate reviewed evidence and settlement. Until then the Dossier describes their pending status without invented grades, streaks, or impact totals.

## Deferred data contracts

- An Oracle-confirmed profile read with Crab Army rank, level, lifetime XP, and a valid Universal Profile destination is needed before showing a rank insignia or `View Universal Profile` link.
- Authoritative total verified action count, streaks, badge awards, reputation determinations, and confirmed personal impact receipts need dedicated, auditable sources. Recent entries and campaign XP do not stand in for them.
- Award settlement, retry protection, and founder exclusions follow `CRABSTAR-ID-PROJECT-Q-INTEGRATION.md`.

## Review sizes and states

Review at 320px, 390px, and 430px in the public preview, then in a signed Telegram Mini App session. Check upcoming, active, review, scheduled, delivered, recovery, unavailable Oracle, and unverified identity states. Compare header geometry, portrait, tabs, clearance, dossier metrics, contribution rows, reward summary, and the fixed bottom dock against the reference. Validate real reward receipts and mission actions with synthetic Dev records only.
