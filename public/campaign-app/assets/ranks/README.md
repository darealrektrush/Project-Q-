# Crab Army rank web pack

This directory is the web presentation target for Oracle's canonical 50-rank Crab Army insignias.

## Contract

Project Q does not define rank order, thresholds, names, divisions or lifetime XP.

Oracle owns the lifetime rank ladder and returns a validated `badgeAssetKey` from
`crab_army_rank_01` through `crab_army_rank_50`.

Project Q resolves that key to:

`/campaign-app/assets/ranks/<badgeAssetKey>.webp`

If a file is absent or fails to load, the Universal Profile keeps the existing deterministic level medallion. Missing artwork never changes rank data or blocks the profile.

## Source artwork

Use the approved Oracle Telegram custom emoji pack:

`CrabStarRanks_by_CrabStar_Oraacle_Bot`

Pack order is canonical:
- sticker 1 = Level 1 Recruit
- sticker 50 = Level 50 Supreme Commander

Do not redraw, reorder or reinterpret ranks in Project Q.

Oracle's `scripts/export_crab_army_rank_web_pack.py` validates the complete pack and writes the web files using the canonical `badge_asset_key` names.

Generated rank binaries are intentionally added only after an authorized Oracle export validates the complete 50-sticker source pack.
