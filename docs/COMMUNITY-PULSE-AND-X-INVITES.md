# Community Pulse and verified X invites

These additions complete the Bond the Duck participation loop without rewarding raw message volume or unverified social claims. Both features remain in readiness mode and fail closed.

## Community Pulse

Community Pulse is a daily individual mission for meaningful activity in one explicitly configured official FAWKQ Telegram community. Telegram does not provide reliable passive “time online,” so Project Q measures activity spread instead.

A participant qualifies for the daily base award only when all four conditions are met:

- at least 5 qualifying messages;
- activity in at least 3 distinct 30-minute windows;
- at least 2 genuine replies to other members; and
- at least 120 minutes between the first and last qualifying message.

Qualification awards 2 base XP. The daily Top 5 receive an additional 6, 5, 4, 3 or 2 XP respectively, for a maximum of 8 Community Pulse XP per day. Awards use the existing participation and overall daily caps.

Commands, bot messages, configured team accounts, short or low-content messages, self-replies and repeated normalized content do not count. The bot records an HMAC content fingerprint and scoring metadata; it does not store raw message text in the campaign tables. Evidence and settled scores are server-only under RLS.

## One-time X invite bonus

The X invite is a bonus action inside Verified Referrals, not another top-level mission. A participant must reply once to the configured official pinned FAWKQ campaign post and mention exactly three distinct people who would genuinely be interested.

The CrabStar Oracle must verify and forward structured evidence showing:

- the reply author matches the participant’s linked, verified X identity;
- `conversation_id` is the configured campaign post ID;
- the X `referenced_tweets` evidence is type `replied_to` and directly references that same campaign post;
- exactly three distinct mentioned X user IDs remain after excluding the participant and official FAWKQ account; and
- the reply and participant have not already been used.

Repeated entries, copied campaign replies and automated mention farming are explicitly outside the mission rules. The action is intentionally one-time to support authentic introductions and reduce platform-spam risk.

## Readiness and launch inputs

The implementation is disabled by default. Before launch, founders must:

1. publish the official campaign post and configure `FAWKQ_BOND_CAMPAIGN_POST_ID` and `FAWKQ_OFFICIAL_X_USER_ID`;
2. approve and publish the X invite bonus XP amount;
3. configure the official Telegram chat ID, HMAC secret and excluded team accounts;
4. connect the Oracle’s X verifier to `POST /oracle/campaign-x-invite` using the shared Oracle secret;
5. apply the migration to a non-production Supabase branch and test replay, identity, cap and privacy controls; and
6. enable ingestion and settlement only after the campaign enters `ACTIVE` state.

No production database migration, Render deployment or X campaign post is performed by this repository change.
