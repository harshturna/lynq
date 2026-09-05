# TICKET-034: Query additions, schema migration, tracker viewport size

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** quality

## Goal
Every query primitive the screens need exists with integration tests and measured budgets, the Phase 1 migration is applied (goals, settings columns, viewport columns, indexes, is_first_visit dropped), the tracker sends viewport size, and the test container applies new migrations reliably.

## Context
- Design §9.2 to §9.10 (multi-metric breakdown as two grouped CTEs with the MetricSpec signature; two-dimension breakdown; realtime on received_at with the sessions CTE over the same window; pageFlow with loop collapsing bounded by the sessions CTE; goalStats and funnel with min() filter composites and globToLike; heatmap long form; histogram with width_bucket; pathsTo from a conv CTE; vitalsBreakdown and vitals timeseries), §11 (the migration verbatim, goals RLS site-scoped and revoked from anon/authenticated, site_settings upserts, viewport columns, events_site_received and events_site_ts_custom indexes, is_first_visit dropped, the analytics.schema_migrations ledger in tests/setup/database.ts), §9's budget paragraph (measure each primitive on the seed fixture, write assertions with 50% headroom, per-screen 1.5 s timeout through run()).
- Depends on TICKET-027 (entry dimensions) landing first. Tracker: packages/tracker/src/index.ts sends vw and vh; lib/ingest/schema.ts, rows.ts and EVENT_COLUMNS gain viewport_width and viewport_height; scripts/seed/generate.ts generates them; tracker e2e asserts them.
- After the migration: npx supabase db push, refresh supabase/schema.sql, bump DUMP_INCLUDES_MIGRATIONS_THROUGH, re-seed aivia so viewport columns are populated.
- This is the largest ticket in the sequence; it may be split at the migration boundary if it does not close in a day, with the migration and tracker change first.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] Migration file, ledger in tests/setup/database.ts, push, dump refresh, constant bump.
- [ ] Tracker vw/vh; ingest schema and rows; seed generator; e2e assertion.
- [ ] breakdownQuery multi-metric and two-dimension; run.ts wrapper kept for lib/dashboard.ts.
- [ ] realtime, pageFlow, goalStats, funnel, heatmap, histogram, pathsTo, vitalsBreakdown, vitals timeseries; integration tests for each on the query fixture and the seed fixture.
- [ ] Timing harness on the seed fixture; budget assertions; prop_key partial index; run() timeout parameter.
- [ ] Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).

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
