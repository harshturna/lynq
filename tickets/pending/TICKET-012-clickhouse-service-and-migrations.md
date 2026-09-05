# TICKET-012: ClickHouse service, roles, migration runner and CI

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
Stand up ClickHouse and the migration discipline so every later Phase 0 ticket has a store to write to and a CI container to test against.

## Context
- Design §4 (events DDL), §4.2 (ingest_rejects, migrations), §12 (migration runner rules), §13 (CI
  jobs), §14 (three roles, read profile constraints, credentials).
- ClickHouse Cloud account and service are created by the owner; credentials for lynq_ingest and
  lynq_read go to Vercel env and .env, lynq_admin only to .env.
- CLAUDE.md engineering rule about `npm test` in `verify` is amended here: verify runs unit tests
  only; integration and e2e are separate scripts required as close evidence for tickets touching
  lib/ingest, lib/query, lib/clickhouse, packages/tracker.
- Nothing depends on this being production-tuned; the smallest tier with idle scaling on.

## Plan
- [ ] Owner creates the ClickHouse Cloud service; record the URL in the ticket, secrets in .env and
      Vercel.
- [ ] `lib/clickhouse/`: ingest, read and admin client factories with `request_timeout: 2000`;
      `migrations/001_events.sql` .. one statement per file; `scripts/clickhouse-migrate.mjs`
      recording into `lynq.migrations`, stop at first failure.
- [ ] Migrations: `events` (exact DDL from §4), `ingest_rejects`, `migrations`; roles and settings
      profile with constraints (§14).
- [ ] CI: split `.github/workflows/verify.yml` into `verify` (plus vitest unit) and `test` (ClickHouse
      service container, Playwright cache); add `test:integration`, `test:e2e` scripts; add
      vitest.
- [ ] First integration test: migrations apply from empty; read role cannot insert or raise limits.
- [ ] Amend CLAUDE.md rule 5 and the tests rule as §13 says. Verify: `npm run verify`, `npm run
      test:integration` against the container.

## Progress log
- 2026-09-05 — Created from the Phase 0 design (TICKET-011, D-004, D-005).

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
