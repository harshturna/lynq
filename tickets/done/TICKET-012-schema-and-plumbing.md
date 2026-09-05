# TICKET-012: Schema and plumbing

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
Create the analytics schema, the events table, its supporting tables, housekeeping, the database client, and the test infrastructure every later Phase 0 ticket builds on.

## Context
- Design §4 (events DDL and the three indexes), §4.2 (supporting tables, housekeeping function,
  guarded pg_cron job, websites.deleted_at), §12 (migration rules: re-runnable), §13 (CI jobs,
  unit-only verify), §14 (lib/db.ts with postgres.js, LYNQ_DB_POOLER_URL assertion, set local
  timeouts).
- Instance: Postgres 15.8, pg_cron available not installed, max_connections 60. pgcrypto is not
  needed (salts generated in Node).
- CLAUDE.md engineering rule about `npm test` in `verify` is amended here: verify runs unit tests
  only; `test:integration` and `test:e2e` are close evidence for tickets touching lib/ingest,
  lib/query, packages/tracker.
- Grants: `service_role` needs usage on the schema and default table privileges (§4); nothing in
  public gets new tables.

## Plan
- [x] Supabase migration: `analytics` schema and grants; `events` with three indexes; site_hostnames,
      site_settings, visitor_salts, identified_users, ingest_log; `housekeeping()` and the
      guarded cron schedule; `create extension pg_cron`; `websites.deleted_at`. Every statement
      re-runnable.
- [x] `lib/db.ts`: one postgres.js instance per §14 with the pooler assertion; `LYNQ_DB_POOLER_URL`
      and `LYNQ_IDENTITY_SECRET` added to .env and Vercel (owner supplies the pooler URL from
      the dashboard).
- [x] vitest set up; `npm run verify` gains unit tests; `test:integration` with a postgres:15
      container applying the migrations from empty; CI split into `verify` and `test` jobs.
- [x] First integration test: migrations apply from empty; `housekeeping()` runs; inserting a row and
      reading it back through lib/db.ts works with `set local statement_timeout`.
- [x] Amend CLAUDE.md as §13 says. Verify: `npm run verify`, `npm run test:integration`, `npx supabase
      db push` applied to production and the dump refreshed.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started. Owner added LYNQ_DB_POOLER_URL (transaction pooler, port 6543, host and
  user verified from the Management API); LYNQ_IDENTITY_SECRET generated with openssl.
  `postgres` (postgres.js) installed. Connection test failed with 28P01 password authentication
  failed: the URL shape is right, the password segment is 15 plain characters, so the database
  password itself is stale. Owner is resetting it in the dashboard.
- 2026-09-05 — Password reset; connection test passed (current_user postgres, set local
  statement_timeout = 2s inside a pooled transaction). Wrote migration
  20260905020000_analytics_schema.sql, lib/db.ts, vitest configs, tests/setup/database.ts,
  tests/integration/schema.integration.test.ts, lib/utils.test.ts, the two-job CI workflow,
  CLAUDE.md amendments. Local test database: the Supabase Postgres image the CLI had already
  pulled (public.ecr.aws/supabase/postgres:15.8.1.111), which carries the roles, auth schema
  and pg_cron, so the production dump and migrations apply unchanged.
- 2026-09-05 — Two setup bugs found by the first runs: vitest lacked the `@/` alias; the
  migration filter compared whole filenames instead of the 14-digit prefix, so the already
  dumped RLS migration replayed. Fixed. Setup now applies the dump only when public.websites is
  absent and replays only migrations newer than DUMP_INCLUDES_MIGRATIONS_THROUGH.
- 2026-09-05 — Pushed to production, verified, dump refreshed to include analytics, constant
  bumped, suite re-run from empty. Closed.

## Handoff
Closed. See Outcome.

## Verification
```
npx supabase db push
Applying migration 20260905020000_analytics_schema.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260905020000_analytics_schema.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}

node prod-check.mjs   # through LYNQ_DB_POOLER_URL
analytics tables: 6 | pg_cron: true | job: lynq_housekeeping 20 0 * * * select analytics.housekeeping() | websites.deleted_at: true
housekeeping() ran on production: ok (no data to touch yet)

npx supabase db dump --linked --schema public,analytics -f supabase/schema.sql   # 12 tables, 6 in analytics

TEST_DATABASE_URL=... npm run test:integration   # fresh container, dump + newer migrations from empty
 Test Files  1 passed (1)
      Tests  4 passed (4)

npm run verify
Found 44 warnings.
Ticket check passed (22 tickets).
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Outcome
Shipped: the `analytics` schema in production (events with three indexes, site_hostnames,
site_settings, visitor_salts, identified_users, ingest_log, housekeeping() on a nightly pg_cron
job, websites.deleted_at); `lib/db.ts` (postgres.js on the transaction pooler, `withTimeout`);
vitest with unit tests in `verify` and an integration suite against the Supabase Postgres
image; CI split into `verify` and `test` jobs; CLAUDE.md rules for tests. LYNQ_DB_POOLER_URL and
LYNQ_IDENTITY_SECRET in `.env` (Vercel gets them in TICKET-014).

Left out: nothing from the plan. The local container `lynq-test-db` is left running for the
next tickets; `docker rm -f lynq-test-db` removes it.

Follow-up tickets: none.
