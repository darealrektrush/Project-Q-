# Runbook: Project Q Supabase 401

## Symptom

Render logs contain `401 Unregistered API key` for Supabase REST calls.

## Immediate containment

1. Keep `PROJECT_Q_DISTRIBUTIONS_ENABLED=false`.
2. Keep `PROJECT_Q_SIGNALS_ENABLED=false`.
3. Confirm Bond the Duck remains `DRAFT`, unfunded, and without reward or
   treasury activity.
4. Do not paste any key into chat, logs, source, a ticket, or a document.

## Diagnosis

1. Confirm `SUPABASE_URL` names the intended production project.
2. Confirm the Render service has a non-empty server key variable.
3. Confirm the key belongs to the same Supabase project as the URL and has not
   been revoked or mistyped.
4. Prefer a dedicated Supabase secret key for each backend service when rotating
   from legacy service-role keys. Keep it server-side.
5. Test a harmless `select=id&limit=1` request against a service-only table.
6. If authentication succeeds but the request returns a missing-relation error,
   complete the schema reconciliation before enabling jobs.

## Recovery verification

- A harmless authenticated read returns HTTP 200.
- Required tables and RPCs exist.
- Both cron flags remain false during verification.
- Signal publishing is rehearsed against an approved test target.
- Distribution is rehearsed on devnet and receives explicit value-moving
  approval before production enablement.

## Escalation

If the key cannot be matched to the intended project, rotate it in Supabase and
replace only the affected Render service variable. Do not rotate unrelated
applications simultaneously unless a compromise is suspected.
