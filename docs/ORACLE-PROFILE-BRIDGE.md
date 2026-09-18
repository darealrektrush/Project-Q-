# Oracle profile bridge

## Permanent identity at campaign entry

The Telegram Mini App is the first production client of CrabStar ID; the Universe is a later client, not a launch dependency. After Project Q validates Telegram `initData`, `POST /campaign-app/api/session` calls the service-role-only `ensure_project_q_campaign_profile` function. That function atomically resolves or creates the member's permanent Oracle `profile_id`, records Telegram as verified and attaches the existing campaign enrollment to the profile. The response exposes the bounded identity projection as `identity.profileId`, `identity.profileState` and `identity.telegramVerified`.

Project Q continues to own campaign rules, scoring, allocations, burns, settlement and distribution. Oracle remains the authority for cross-ecosystem identity and the only place a member connects or verifies a wallet. Verified Oracle X and payout-wallet events are mirrored into Project Q's campaign enrollment only as bounded references. Project Q never creates a wallet challenge, requests a wallet signature, replaces the canonical wallet or writes `wallet_connections`. Conflicting or already-allocated payout references fail closed.

`participant.campaignReady` means the current campaign enrollment has a permanent profile plus verified X and wallet facts. It is intentionally different from the future Universe-level `Fully Connected` state, which will also require a Google or Apple auth identity. Early Telegram campaigns therefore preserve the final identity model without waiting for Universe authentication.

The migration is additive and does not award XP, activate campaigns, move funds or distribute rewards. Existing Telegram-keyed records remain readable through `identity_links`; later migrations can add direct `profile_id` foreign keys to economic ledgers without changing the member's identity.

## Private Oracle read projection

`POST /oracle/profile` provides a private read-only Profile V2 projection for the Oracle bot. It requires `x-oracle-campaign-secret` matching `ORACLE_PROFILE_SECRET` (falling back to `ORACLE_CAMPAIGN_SECRET` only when no dedicated profile secret is set). The production rollout isolates this bridge with matching `ORACLE_PROFILE_SECRET` / Oracle `PROJECT_Q_PROFILE_SECRET`, preserving existing campaign integrations. Missing or incorrect credentials return 401 before any participant read. The body must contain only a positive safe-integer `telegram_user_id` derived by Oracle from an authorized private Telegram update.

`POST /oracle/profile-app` requires the same credential and resolves the actual bot's Telegram URL using getMe. It returns no bot token, caches the validated URL for the process lifetime and uses a five-second Telegram timeout. This lets operators configure Oracle's Project Q button without guessing a username.

The response includes the same actor ID, campaign ID, enrollment, wallet/X verification booleans, total campaign XP, recorded mission count, up to three recent release summaries and an observation timestamp. It deliberately excludes reward-wallet addresses, OAuth data and unrelated account fields. Responses use `Cache-Control: no-store`; unavailable data returns 503 without exposing upstream details.

This read projection currently supports the `bond-the-duck-2026` FAWKQ campaign only. It does not activate the campaign, release rewards or create claimable funds. The existing participant service remains authoritative, including its existing bounded activity/mission/allocation windows. A recent release is an accounting record, not a promise of immediate payment. Wallet ownership verification happens only in Oracle; Project Q's Mini App displays the resulting campaign payout reference and directs unconnected members back to Oracle.

Deploy this endpoint before enabling Oracle's `PROJECT_Q_PROFILE_ENABLED` flag. Oracle points `PROJECT_Q_PROFILE_URL` at this server's `/oracle/profile`, and uses the existing corresponding server-side secret. A Project Q bot/app link must open Project Q's Telegram context; opening its Mini App as an Oracle web_app button would use the wrong bot signature. Never expose the bridge secret in a browser, Telegram callback or URL.

Run `npm test` and repository CI. Apply the identity migration before deploying code that calls `ensure_project_q_campaign_profile`. For rollback, revert the application deployment first; the additive nullable `profile_id` column and canonical identity rows can remain in place so no identity data is lost.
