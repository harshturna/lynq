# TICKET-034: Query additions, schema migration, tracker viewport size

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** quality

## Goal
Every query primitive the screens need exists with integration tests and measured budgets, the Phase 1 migration is applied (goals, settings columns, viewport columns, indexes, is_first_visit dropped), the tracker sends viewport size, and the test container applies new migrations reliably.

## Context
- Design §9.2 to §9.10 (multi-metric breakdown as two grouped CTEs with the MetricSpec signature; two-dimension breakdown; realtime on received_at with the sessions CTE over the same window; pageFlow with loop collapsing bounded by the sessions CTE; goalStats and funnel with min() filter composites and globToLike; heatmap long form; histogram with width_bucket; pathsTo from a conv CTE; vitalsBreakdown and vitals timeseries), §11 (the migration verbatim, goals RLS site-scoped and revoked from anon/authenticated, site_settings upserts, viewport columns, events_site_received and events_site_ts_custom indexes, is_first_visit dropped, the analytics.schema_migrations ledger in tests/setup/database.ts), §9's budget paragraph (measure each primitive on the seed fixture, write assertions with 50% headroom, per-screen 1.5 s timeout through run()).
- Depends on TICKET-027 (entry dimensions) landing first. Tracker: packages/tracker/src/index.ts sends vw and vh; lib/ingest/schema.ts, rows.ts and EVENT_COLUMNS gain viewport_width and viewport_height; scripts/seed/generate.ts generates them; tracker e2e asserts them.
- After the migration: npx supabase db push, refresh supabase/schema.sql, bump DUMP_INCLUDES_MIGRATIONS_THROUGH, re-seed aivia so viewport columns are populated.
- This is the largest ticket in the sequence; it may be split at the migration boundary if it does not close in a day, with the migration and tracker change first.
- Read on start: TICKET-027 landed (entry column in lib/query/sessions.ts, entry_* in
  filters.ts). `public.websites.is_first_visit` is still read by the old dashboard page
  (app/(main)/[website_slug]/page.tsx, website-dashboard.tsx: it opens the setup modal once)
  and listed in lib/actions.ts UPDATABLE_WEBSITE_COLUMNS and lib/types/index.d.ts; dropping
  the column means removing those uses here, so the old dashboard no longer opens the setup
  modal on first visit (TICKET-046 rebuilds onboarding). tests/e2e/tracker.spec.ts has no
  ctx assertion yet; one is added for vw/vh. The seed picks screen sizes from SCREENS per
  device; viewport is derived from it (desktop: width minus a random 0–140 px chrome, height
  minus 90–180; mobile and tablet: the screen size). lib/db.ts withTimeout sets a
  transaction-local statement_timeout; run() gets a per-call timeout parameter defaulting to
  the design's 1.5 s. Test DB ledger: analytics.schema_migrations(version) created on demand;
  a database that already has the analytics schema but no ledger marks every migration up to
  DUMP_INCLUDES_MIGRATIONS_THROUGH as applied, then every later file not in the ledger runs
  and is recorded.
- Stages, in order, each with the Handoff updated: (1) migration, ledger, tracker, ingest,
  seed, first-visit removal; (2) the query primitives with integration tests; (3) timing
  harness, budgets, run() timeout, prop_key index; then push, dump, bump, re-seed.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] Migration file, ledger in tests/setup/database.ts, push, dump refresh, constant bump.
- [x] Tracker vw/vh; ingest schema and rows; seed generator; e2e assertion.
- [x] breakdownQuery multi-metric and two-dimension; run.ts wrapper kept for lib/dashboard.ts.
- [x] realtime, pageFlow, goalStats, funnel, heatmap, histogram, pathsTo, vitalsBreakdown, vitals timeseries; integration tests for each on the query fixture and the seed fixture.
- [x] Timing harness on the seed fixture; budget assertions; prop_key partial index (served by events_site_ts_custom, see the migration comment); run() timeout parameter.
- [x] Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; three stages (see Context).
- 2026-09-05 — Stage 1 landed: supabase/migrations/20260905050000_phase1.sql (design §11 verbatim,
  plus a note that events_site_ts_custom also serves the prop_key lateral join, so no separate
  index); tests/setup/database.ts ledger; tracker sends vw/vh (packages/tracker/src/index.ts,
  envelope.ts Ctx, types.ts); ingest schema, rows and EVENT_COLUMNS carry viewport_width and
  viewport_height; seed derives the viewport from the screen; e2e asserts vw/vh equal the
  Playwright viewport; is_first_visit removed from the old dashboard page, website-dashboard,
  lib/actions.ts and the Website type. Schema test extended. Unit 143, integration 25, e2e 13
  all pass; the warm container applied the migration through the ledger. Not yet pushed to
  production (done at the end with the dump refresh).
- 2026-09-05 — Stage 2 decisions: goal metrics take the goal definition (id, kind, match) rather than
  an id, because the builders are pure SQL text and cannot look goals up; the funnel orders
  steps by a bigint key `(epoch ms of ts) * 100000 + seq` instead of a composite record, which
  Postgres cannot aggregate with min(); same ordering (ts, then seq), so same-millisecond
  steps still cannot flip. Realtime builds its session CTE on received_at through a `column`
  option on sessionCte. run() reads ctx.timeoutMs (default 1.5 s); the old dashboard passes
  10 s until TICKET-035 deletes it.
- 2026-09-05 — Stage 2 landed: lib/query/breakdown.ts (breakdownMultiQuery: two grouped CTEs
  joined on the value, two dimensions, goal metrics, orderBy/dir), realtime.ts (one row of
  jsonb aggregates over a received_at CTE, fillMinutes), flow.ts (pageFlowQuery with loop
  collapsing and entry referrer for sessions that started on the page), goals.ts
  (goalStatsQuery, funnelQuery, goalPredicate through globToLike), heatmap.ts (long form plus
  pivotHeatmap), histogram.ts (allow-listed columns, width_bucket, fillHistogram), paths.ts
  (pathsToQuery from a conv CTE), vitals.ts (vitalsBreakdownQuery, vitalsTimeseriesQuery);
  run.ts wrappers for each with DEFAULT_TIMEOUT_MS 1.5 s and ctx.timeoutMs; primitives.ts
  exports scope/cteScope/rowFrom/bucketExpr. Six integration tests cover them on the query
  fixture, whose non-pageview rows now carry their pageview's path as ingest writes them (the
  defaults had every engagement and vitals row on "/", which made "/" look touched by every
  session). Integration 31 tests pass.
- 2026-09-05 — Stage 3 landed: tests/integration/budgets.integration.test.ts times nineteen
  calls on a 90-day × 40 visitors/day seed fixture (47,601 rows) and asserts measured × 1.5
  (30 ms floor); the slowest are the entry-channel breakdown with goal metrics (172 ms) and the
  multi-metric path breakdown (128 ms). The prop_key lateral join runs in 5 ms on
  events_site_ts_custom, so the separate partial index the design floated is not created
  (comment in the migration). run() defaults to 1.5 s.
- 2026-09-05 — Production: `npx supabase db push` applied 20260905050000_phase1.sql; the
  schema dump was refreshed and DUMP_INCLUDES_MIGRATIONS_THROUGH bumped to 20260905050000;
  aivia.byharsh.com re-seeded (183,293 rows, viewport columns populated). Finding: pg_dump
  writes ACLs relative to Postgres' built-in defaults, so the revoke on public.goals (a
  default-privilege grant in the Supabase image) does not survive the dump; a fresh test
  container re-granted it and the schema test caught it. tests/setup/database.ts re-applies
  that revoke after the dump on a fresh database; production itself is correct (the dump
  shows only the service_role grant).

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-035 (Overview on the new shell, old dashboard deleted).
- **Blocked on:** nothing.
- **Next:** TICKET-035.
- **Read first:** lib/query/run.ts (every wrapper the screens call) and
  tests/integration/budgets.integration.test.ts (what each costs).
- **Read first:** this ticket's Context; design §9.2–§9.10 and §11.

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54330/postgres npm run test:integration   # fresh container
npm run test:e2e
```
verify: lint (43 pre-existing warnings), typecheck, ticket check, 143 unit tests passed.
Integration: 6 files / 32 tests passed on the warm container (migration applied through the
ledger) and on a fresh container (dump plus ledger path), including the budget harness on
47,601 rows and the schema test for goals RLS and grants, the settings and viewport columns
and the dropped first-visit flag. e2e: 13 passed after the tracker change (vw/vh equal the
Playwright viewport). Production: migration listed as applied by `supabase migration list`;
guest walk-through of the old dashboard on aivia.byharsh.com renders after the column drop
and the re-seed (Referrers: Direct 36%, google.com 31%).

## Outcome
Shipped: the Phase 1 migration (goals, site_settings columns, viewport columns, two indexes,
is_first_visit dropped) applied to production and to the test ledger; tracker vw/vh through
ingest, seed and e2e; every query primitive in design §9.2–§9.10 with run.ts wrappers, a
1.5 s default statement timeout and integration tests; the budget harness. Deviations,
recorded in the log: jsonb entry column (TICKET-027), goal metrics take the goal definition,
funnel ordering by a bigint key, no separate prop_key index. Left out: nothing. No follow-up
tickets.
