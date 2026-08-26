# Project Q UI V3 — Command Center

Project Q V3 adopts the approved **Q Command Center × Bond OS** direction. It uses the supplied black/gold mobile reference as the visual target while keeping every operational value native, responsive and evidence-bound.

## Product hierarchy

- **FAWKQ attracts attention.** The Bond mascot and cinematic campaign artwork create the entry moment.
- **Bond the Duck creates participation.** Missions, daily progress, referrals, Community Pulse and Earn to Burn define the campaign loop.
- **Project Q proves and operates everything.** Identity, XP, caps, rankings, allocations and receipts remain native system records.
- **Oracle helps execute.** The supplied blue robotic crab is the canonical Oracle mark for X identity, raids and Oracle-verified evidence.

## Primary navigation

`Home · Missions · XP · Rank · Rewards`

Project Q ID/Profile is accessed from the persistent account control in the upper-right. Earn to Burn is a collective mission and receipt utility, not another primary navigation destination.

## Visual rules

- Near-black background with graphite command surfaces.
- Thin warm-gold borders and restrained illumination.
- Gold signals primary actions, rewards, rank and Project Q state.
- Oracle blue signals Oracle identity and verification only.
- Green signals completed verification or claimable state only.
- Native HTML text and controls are used for all operational information.
- Campaign art is dynamically cropped; it never contains the source of truth for XP, rank, readiness or allocations.
- Mobile touch targets, safe areas and reduced-motion preferences are supported.

## Screen model

- **Home:** cinematic Bond hero, real readiness, Project Q ID CTA, participant status, next action and collective burn access.
- **Missions:** all eight individual lanes plus a separately styled Earn to Burn collective lane. Authenticated cards show privacy-safe verified, pending and rejected evidence totals where a verifier exists.
- **XP:** verified XP account, daily-cap progress, Community Pulse, ledger and achievements.
- **Rank:** authenticated Overall, rolling 48H, Missions and Community standings; top 20 plus the signed-in participant; rank achievements.
- **Rewards:** recorded allocation, scheduled and distributed release totals, participant payout timeline, campaign commitments and recovery warnings.
- **Profile:** Telegram/Oracle X/wallet identity, eligibility, personal referral link and the one-time verified X invite bonus.

## Integrity

The reference artwork contains illustrative figures, but the implementation does not copy those figures into the product. Readiness, XP, rank, allocation, identities and receipts remain empty or unavailable until returned by verified Project Q services.

Leaderboard responses include only anonymized display rows. Telegram and X identifiers never leave the backend. Only Oracle-X-verified identities are ranked, deterministic ties use the internal Telegram ID before identifiers are removed, and the Earn-to-Burn ranking remains unavailable until its distinct contributor-attribution rule is finalized.

Mission evidence follows the same boundary. Oracle raids and trending-bot counts are daily; website-voting progress counts unique accepted sources across the campaign. The Mini App receives aggregate counts only, while source keys, evidence references, raw rejection reasons and participant identifiers remain server-side. Pre-launch states do not query or expose participant evidence.

Every mission card opens a native responsive detail sheet before any external navigation. The sheet shows the exact reward class, frequency, personal progress, verification method, requirements and one gated action. Read-only destinations such as XP, profile position, referrals and the public burn ledger remain inspectable during readiness; submission destinations remain disabled until their source gate opens. Website Voting reflects the implemented settlement maximum of 11 XP: 1 XP for each of nine accepted sources plus a one-time 2 XP completion bonus, subject to the 15 XP participation and 75 XP overall caps. Trending Bots uses a dedicated 20 XP bucket: 2 XP for each bot's first accepted daily vote, 1 XP for later votes after its certified cooldown, and one uncapped Trending Push for every accepted receipt. The Trending leaderboard measures those pushes without allowing hourly votes to take over the XP-based overall ranking.

Participant rewards use the authenticated Telegram identity and verified reward wallet to select owned allocation rows. Project Q keeps only the latest calculation version for each category, cycle and wallet, performs totals in exact token base units, and derives payout state from recorded releases. `paid` and `recovered` are distributed; `scheduled`, `proposed` and `reserve` remain scheduled; `failed` is shown as requiring recovery. The browser never receives reward-wallet identifiers, Telegram IDs, allocation IDs or payment keys, and exposes no claim, signing or transfer control.

V3 changes only the local application source and assets. It does not activate the campaign, apply Supabase migrations, deploy Render services or publish any external campaign state.
