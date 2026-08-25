# Deployment and Verification

## Production mapping

| Component | Render service | Branch | Command |
| --- | --- | --- | --- |
| Web/Telegram webhook | `project-q` | `main` | `npm start` |
| Distribution scheduler | `project-q-distribute` | `main` | `npm run distribute` |
| Campaign XP scheduler | `project-q-settle-campaign-xp` | `main` | `npm run settle-campaign-xp` |
| Community Pulse scheduler | `project-q-settle-community-activity` | `main` | `npm run settle-community-activity` |
| Signal scheduler | `project-q-signal` | `main` | `npm run post-signal` |

`project-q-dev` exists as a direct Render service and is not yet represented by
the production Blueprint. Reconcile ownership before changing the Blueprint;
do not create a duplicate service with the same purpose.

## Environment-variable names

Shared server configuration:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_TOPIC_IDS`

Web-only/authenticated ingress:

- `TELEGRAM_WEBHOOK_SECRET`
- `BAGWORK_SECRET`
- `ORACLE_CAMPAIGN_SECRET`
- `FAWKQ_WEBSITE_URL`
- `FAWKQ_BAGWORK_URL`
- `XP_PER_SOL`
- `PROJECT_Q_COMMUNITY_ACTIVITY_ENABLED` — defaults to `false`
- `PROJECT_Q_COMMUNITY_CHAT_ID`
- `PROJECT_Q_COMMUNITY_ACTIVITY_HASH_SECRET`
- `PROJECT_Q_ACTIVITY_EXCLUDED_TELEGRAM_IDS`
- `FAWKQ_BOND_CAMPAIGN_POST_ID`
- `FAWKQ_OFFICIAL_X_USER_ID`

Community Pulse settlement-only:

- `PROJECT_Q_COMMUNITY_ACTIVITY_SETTLEMENT_ENABLED` — defaults to `false`

Distribution-only:

- `PROJECT_Q_DISTRIBUTIONS_ENABLED` — defaults to `false`
- `HELIUS_API_KEY`
- `HELIUS_RPC_URL`
- `TOKEN_MINT`
- `CREATOR_WALLET_SECRET`
- `CREATOR_WALLET_PUBLIC`
- `COMMUNITY_WALLET_SECRET`
- `COMMUNITY_WALLET_PUBLIC`
- `DEV_WALLET_PUBLIC`
- `OCEAN_WALLET_PUBLIC`
- `BAG_WALLET_PUBLIC`
- `BUYBACK_RESERVE_WALLET_PUBLIC`
- `DISTRIBUTION_RESERVE_LAMPORTS`
- `STAGE2_RESERVE_LAMPORTS`

Signal-only:

- `PROJECT_Q_SIGNALS_ENABLED` — defaults to `false`

Never place values in this document or source control.

## Release sequence

1. Confirm the target commit and rollback commit.
2. Run `npm ci`, `npm test`, and `git diff --check` at the exact commit.
3. Review the migration and create a backup/rollback plan.
4. Apply the migration with both activation flags still `false`.
5. Verify required tables, RLS, grants, functions, and views.
6. Replace the invalid Project Q Supabase server credential with a valid key
   for the same project. Do not print or copy it through chat.
7. Verify `/healthz` and `/version`, then Telegram webhook/admin/user flows.
8. Run the signal job once with publishing directed to an approved test target;
   inspect the row, Telegram message, and logs before enabling its schedule.
9. For distributions, verify wallet public addresses, network, reserves,
   balances, holder exclusions, and a devnet rehearsal. Obtain explicit
   value-moving approval before setting the flag to `true`.
10. Observe logs and database writes, record the evidence, and retain rollback.

## Rollback

- Set both activation flags to `false` first.
- Roll the Render service back to the last known-good commit.
- Do not delete distribution records or reverse on-chain transfers as a generic
  rollback. Reconcile any partially completed run using its run and transaction
  records.
- The reconciliation migration is additive; leave unused tables in place until
  a separately reviewed data-retention decision authorizes removal.

## Health and smoke checks

- `GET /healthz` returns HTTP 200 and `{ "ok": true }`.
- `GET /version` returns the intended Render commit and branch.
- Telegram rejects an absent/incorrect webhook secret.
- Oracle campaign ingress rejects an absent/incorrect shared secret.
- `/start`, admin authorization, campaign DRAFT UI, wallet/receipt reads, and
  error states work from the intended Telegram contexts.
- Logs contain no secrets, wallet private material, or persistent retry storm.
