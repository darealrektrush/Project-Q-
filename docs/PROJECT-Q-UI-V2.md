# Project Q UI/UX V2

Project Q V2 positions the campaign Mini App as a premium participation operating system rather than a promotional microsite. The implementation remains mobile-first, configuration-driven and fail-closed during Bond the Duck readiness mode.

## Interface hierarchy

1. Participant identity and eligibility state
2. Current campaign state and readiness
3. Verified XP, rank, completed missions and allocation
4. The participant's next available actions
5. Campaign details, commitments and supporting artwork

The full Bond the Duck campaign poster and Creator Awards artwork are supporting details, not primary interface surfaces.

## Design system

- Spacing: `4 / 8 / 12 / 16 / 24 / 32 / 48`
- Surfaces: base, raised and interactive graphite
- Gold: active navigation, primary action, reward and rank emphasis only
- Green: verified or successful state only
- Red: failure or risk only
- Typography: native interface text for every operational label and value
- Effects: thin borders, restrained shadows and minimal glow

## Primary navigation

`Home · Missions · XP · Rank · Rewards · Profile`

Profile is available from both the labeled navigation destination and the account control in the upper-right. The Missions destination contains all nine Bond the Duck lanes: eight individual earning missions and one clearly separated Earn to Burn collective mission. Earn to Burn also remains available from the Home utility surface and direct `#burns` route.

## Mission architecture

- Individual: Oracle X Raids, Website Voting, Trending Bots, Bagwork, Buy-to-Earn, Participation XP and Verified Referrals
- Collective: Earn to Burn

Individual missions can contribute XP, SOL or campaign reward eligibility according to their published rules. Earn to Burn does not allocate its 15,000,000 FAWKQ reserve to participants; verified campaign XP advances shared milestones whose burns require the separate approval and on-chain proof workflow.

Verified Referrals is evidence-gated: a new participant must enter through an opaque personal link, verify Telegram/X/wallet, complete a verified post-referral FAWKQ purchase of at least USD $2 and earn positive campaign XP. The referrer bonus amount remains unset until it is approved and added to the hashed campaign rules.

Community Pulse is the eighth individual lane. It rewards sustained, meaningful activity rather than raw message volume: 5 qualifying messages, 3 distinct 30-minute windows, 2 genuine replies and a 2-hour span. The daily maximum is 8 XP and remains subject to the participation and overall caps.

Verified Referrals also contains a one-time X invite bonus for a verified reply to the official pinned campaign post that mentions exactly three distinct interested people. It remains disabled until the pinned post ID, Oracle verification path and bonus XP amount are configured.

## Data integrity

The V2 UI does not invent activity, rankings, allocations or participant identities. Empty and pre-launch states say what is unavailable and why. Campaign activation, wallet verification and Earn to Burn controls retain their existing server-side gates.
