# TICKET-012: Schema and plumbing

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
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
- [ ] Supabase migration: `analytics` schema and grants; `events` with three indexes; site_hostnames,
      site_settings, visitor_salts, identified_users, ingest_log; `housekeeping()` and the
      guarded cron schedule; `create extension pg_cron`; `websites.deleted_at`. Every statement
      re-runnable.
- [ ] `lib/db.ts`: one postgres.js instance per §14 with the pooler assertion; `LYNQ_DB_POOLER_URL`
      and `LYNQ_IDENTITY_SECRET` added to .env and Vercel (owner supplies the pooler URL from
      the dashboard).
- [ ] vitest set up; `npm run verify` gains unit tests; `test:integration` with a postgres:15
      container applying the migrations from empty; CI split into `verify` and `test` jobs.
- [ ] First integration test: migrations apply from empty; `housekeeping()` runs; inserting a row and
      reading it back through lib/db.ts works with `set local statement_timeout`.
- [ ] Amend CLAUDE.md as §13 says. Verify: `npm run verify`, `npm run test:integration`, `npx supabase
      db push` applied to production and the dump refreshed.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** what is built and working right now, what is half-done
- **Blocked on:** nothing | what
- **Next:** the next one to three concrete actions
- **Read first:** files to open before touching anything

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
