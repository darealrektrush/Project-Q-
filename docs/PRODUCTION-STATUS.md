# Production Status

Last reconciled: 2026-08-19 UTC.

| Area | Status | Evidence | Blocker |
| --- | --- | --- | --- |
| Project Q web service | PRODUCTION DEPLOYED | Containment release and schema-recording releases deployed; `/healthz` configured | No external endpoint or authenticated user-flow smoke record |
| Telegram admin menus | PRODUCTION DEPLOYED | Code and service deployed | No controlled live admin-flow verification |
| Phase 1 database schema | PRODUCTION DEPLOYED | Migrations `20260819052417` and `20260819052558` applied; 12 tables, RLS, grants, and FK indexes verified | No application credential verification |
| Distribution cron | PRODUCTION DEPLOYED | Fail-closed release deployed; flag defaults off | Last pre-containment run was Supabase 401; first disabled runtime run not yet observed |
| Signal cron | PRODUCTION DEPLOYED | Fail-closed release deployed; flag defaults off | Last pre-containment run was Supabase 401; first disabled runtime run not yet observed |
| Bond the Duck foundation | IMPLEMENTED | Schema, state machine, UI, tests | Must remain DRAFT and unfunded |
| Oracle raid campaign bridge | IMPLEMENTED | Authenticated ingest route and tests | Campaign disabled; no production events |
| Oracle identity bridge receiver | PLANNED | No receiver route on `main` | Do not enable publisher |

## Status definitions

- `IDEA`: discussion only.
- `PLANNED`: approved written scope and acceptance criteria.
- `IN DEVELOPMENT`: active implementation branch or pull request.
- `IMPLEMENTED`: code exists in the intended integration branch.
- `TESTED`: required checks passed at the exact commit.
- `STAGING VERIFIED`: exact artifact and migrations passed critical staging flows.
- `PRODUCTION DEPLOYED`: exact artifact is live.
- `PRODUCTION VERIFIED`: live artifact passed health, permissions, data, user,
  admin, logs, and rollback checks.

`PRODUCTION DEPLOYED` does not imply healthy or tested.

## Activation constraints

Do not set `PROJECT_Q_DISTRIBUTIONS_ENABLED=true` until all distribution gates
in `docs/DEPLOYMENT.md` are complete. Do not set
`PROJECT_Q_SIGNALS_ENABLED=true` until the signal tables, Supabase server key,
Telegram target, and posting flow are verified.

Bond the Duck must remain `DRAFT` with funding and reward ledgers at zero until
an explicitly approved release has passed staging and production verification.
