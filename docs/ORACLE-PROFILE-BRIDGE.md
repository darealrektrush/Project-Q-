# Oracle profile bridge

`POST /oracle/profile` provides a private read-only Profile V2 projection for the Oracle bot. It requires the existing `x-oracle-campaign-secret` / `ORACLE_CAMPAIGN_SECRET` pair. Missing or incorrect credentials return 401 before any participant read. The body must contain only a positive safe-integer `telegram_user_id` derived by Oracle from an authorized private Telegram update.

The response includes the same actor ID, campaign ID, enrollment, wallet/X verification booleans, total campaign XP, recorded mission count, up to three recent release summaries and an observation timestamp. It deliberately excludes reward-wallet addresses, OAuth data and unrelated account fields. Responses use `Cache-Control: no-store`; unavailable data returns 503 without exposing upstream details.

This bridge currently supports the `bond-the-duck-2026` FAWKQ campaign only. It does not enroll members, activate the campaign, verify wallets, release rewards or create claimable funds. The existing participant service remains authoritative, including its existing bounded activity/mission/allocation windows. A recent release is an accounting record, not a promise of immediate payment. Existing signed wallet verification continues inside Project Q's own authenticated Telegram application.

Deploy this endpoint before enabling Oracle's `PROJECT_Q_PROFILE_ENABLED` flag. Oracle points `PROJECT_Q_PROFILE_URL` at this server's `/oracle/profile`, and uses the existing corresponding server-side secret. A Project Q bot/app link must open Project Q's Telegram context; opening its Mini App as an Oracle web_app button would use the wrong bot signature. Never expose the bridge secret in a browser, Telegram callback or URL.

Run `node --test tests/oracleProfile.test.js` and repository CI. Rollback to `fb7cbcecc646dcf8479cdaf8a36b5e6abaae0b94`, disabling Oracle's profile bridge flag first. No schema changes are needed in Project Q.
