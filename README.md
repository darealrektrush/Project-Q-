# Project Q

Project Q is the Telegram, transparency, participation, and distribution layer
for FAWKQ. It includes the Project Q bot, admin menus, wallet and receipt views,
bagwork integrations, scheduled signals, distribution jobs, and the disabled
Bond the Duck campaign foundation.

## Production status

The application is deployed on Render, but the system is **not production
verified as a whole**.

- The web service is deployed from `main` with `/healthz` and `/version` routes.
- Distribution and signal cron services are deployed with explicit activation
  flags that default to `false`. The last pre-containment runs failed with
  Supabase `401 Unregistered API key`; a valid server credential still needs
  to be installed and verified without enabling either job.
- The Phase 1 schema reconciliation and foreign-key index migrations were
  applied to the shared production database on 2026-08-19. Required tables,
  RLS, role grants, and advisor results were verified after apply.
- Money-moving distributions and scheduled signal publishing are disabled by
  default in `render.yaml`. They require explicit production enablement after
  credentials, schema, tests, wallets, and user flows are verified.
- Bond the Duck remains `DRAFT`, unfunded, and inactive. Campaign XP,
  allocations, campaign raid events, and treasury transactions remain empty.

See [Production status](docs/PRODUCTION-STATUS.md),
[architecture](docs/ARCHITECTURE.md), and
[deployment](docs/DEPLOYMENT.md) before release work. The draft reusable
[Earn to Burn engine](docs/EARN-TO-BURN.md) has its own custody boundary and
release checklist.

## Runtime

- Node.js 24 LTS
- Express
- Supabase Postgres/Data API
- Telegram Bot API
- Solana Web3/Helius for on-chain data and approved distribution operations
- Render web and cron services

## Local development

```bash
npm ci
npm test
npm run dev
```

Create `.env.local` from the environment-variable names documented in
`docs/DEPLOYMENT.md`. Never commit populated environment files, wallet secrets,
bot tokens, webhook secrets, or Supabase secret/service-role keys.

## Release rule

Conversation approval is not release evidence. A feature is not production
verified until the exact deployed commit, required migrations, configuration,
permissions, critical user/admin paths, logs, and rollback path have all been
verified and recorded.
