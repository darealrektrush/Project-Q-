# Project Q contributions in CrabStar ID

## Product decision

CrabStar ID is the member's permanent ecosystem identity. Oracle owns its canonical identity, lifetime Crab Army XP ledger, and existing 1–50 rank ladder. Project Q owns campaign participation, campaign XP, campaign standings, mission badges, reward allocations, and campaign receipts. Project Q must not create a second Crab Army rank ladder or infer lifetime XP from campaign XP.

The current Project Q `participantRank` comes from its **campaign leaderboard**. The Record screen calls it **Standing**. Neither `totalXp` nor `participantRank` in the current Project Q session response represents Crab Army lifetime XP or level. The current Oracle identity resolver returns a canonical profile ID and verification state; it does not return the lifetime ledger or rank.

## Award contract for a later Oracle integration

1. Project Q settles a verified campaign action under the campaign's own rules. Pending or rejected evidence does not earn lifetime XP.
2. A mission-specific, versioned award rule may produce a separate Crab Army XP contribution. No universal campaign-XP conversion applies. Holding tokens alone must not grant a Crab Army level.
3. Deliver an event to Oracle containing the canonical profile ID, campaign and mission identifiers, a unique immutable event ID, source settlement/receipt reference, rule version, lifetime XP amount, and settlement time. Exclude secrets and raw private evidence.
4. Oracle validates the event, rejects duplicates by event ID, applies existing eligibility and founder/admin exclusions, and records the lifetime XP entry. Oracle remains the authority for resulting level and rank.
5. A retry of the same event may return the previous result but must never award twice. A correction uses a linked reversal or adjustment event with an audit trail; Project Q must not silently overwrite a settled lifetime award.
6. Project Q reads Oracle's confirmed award receipt and current Crab Army rank before displaying them. If Oracle is unavailable or the award is pending, show the campaign outcome independently and label the lifetime contribution pending or unavailable. Never synthesize a rank.

## Screen mapping

| Screen | Campaign data from Project Q | Lifetime data from Oracle |
| --- | --- | --- |
| Terminal | Current operation and next action | Compact CrabStar ID rank strip only after canonical data is available |
| Record | Campaign XP ledger, standing, and mission outcomes | Confirmed Crab Army XP receipts associated with settled mission events |
| Rewards | Allocations, release schedule, and distribution receipts | No XP or rank blended into payout amounts |
| Profile | Campaign badges and linked identity state | Current Crab Army level, insignia, and earned lifetime XP progress |

Verified campaign impact, such as a confirmed conservation contribution, should have its own evidence and receipt; it is not inferred from XP, purchases, or a displayed reward. Existing Crab Army XP and levels remain intact throughout this integration.

## Verification before enabling the UI

- Oracle exposes an authenticated, canonical read of current level, lifetime XP, rank title, and confirmed award receipts.
- The Project Q → Oracle award channel is authenticated, idempotent, auditable, and tested with duplicate delivery, delayed delivery, correction, and service outage cases.
- Mission award rules explicitly define eligibility and amount; founder/admin exclusions are applied at the authority boundary.
- Mobile UI distinguishes **Campaign XP / Standing** from **Crab Army XP / Level** in both empty and earned states.
