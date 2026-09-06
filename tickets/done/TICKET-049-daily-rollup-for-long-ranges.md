# TICKET-049: Daily rollup so long ranges meet the query budget

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** quality

## Goal
A 12-month Overview on the seeded site renders every section under the design's 1.5 s per-screen budget, and the default statement timeout goes back to 1.5 s.

## Context
- Design §10 names this lever: "If the 12-month range is still over budget after §9.2, the
  next lever is a daily rollup table refreshed by housekeeping(), decided then." TICKET-035
  measured it (scripts/measure-prod.mts, production pooler, 183,293 rows, sequential, ms):
  summary 716, timeseries 426, pages multi-metric 1,670, sources 1,303, locations 1,479,
  devices 424, vitals 464 at twelve months; 794 / 653 / 651 for the three tables at 90 days;
  about 250 ms of each number is the round trip. With compare on, the Overview runs sixteen
  statements on the four-connection pool, so the 1.5 s statement timeout failed summary and
  the three tables at 90 days and twelve months. TICKET-035 raised DEFAULT_TIMEOUT_MS in
  lib/query/run.ts to 5 s as the interim.
- Shape to decide here, then record as a D-NNN: a per-day, per-site rollup of the row
  metrics by dimension value (pageviews, visitors as HLL or exact per day, sessions from the
  sessions CTE, bounces, engaged ms) that the multi-metric breakdown reads for ranges over
  N days when no filters are set, falling back to the events scan otherwise; refreshed for
  yesterday by housekeeping() and for today on read. The local budget harness
  (tests/integration/budgets.integration.test.ts) gains the 12-month case on a 365-day
  fixture.
- Alternatives to weigh in the ticket: a larger Supabase compute size (the numbers above are
  the scan, not the plan), and materialised views per dimension.
- Measured again 2026-09-06 with `scripts/explain-prod.mts` (explain analyze, production
  pooler, cold cache): pages multi 7.3 s, of which 6.2 s is the session CTE (index scan on
  events_site_session, random heap fetches), then a nested loop back to events per session
  and two sorts spilling to disk (work_mem is 2184 kB); sources multi 1.1 s; timeseries
  1.3 s (seq scan, disk sort); summary rows 145 ms, sessions 371 ms. Warm, the tables are
  1.3 to 1.7 s. The cost is the row scan and the join back, not the plan.
- Shape decided as D-015: `analytics.rollup_daily` per UTC day, dimension and value with
  summed counts; `analytics.rollup_window()` in SQL holds the session definition and serves
  both the nightly fill (`analytics.rollup_refresh()`, called from housekeeping, through two
  days ago because client timestamps may trail receipt by 24 h) and the partial-day edges
  at read time; identified visitors are counted from the raw rows over the whole range via
  a partial index `events_site_ts_identified`; goal columns come from goal-matching rows
  only. Read path: `lib/query/rollup.ts` (`rollupApplies`, `rollupBreakdownQuery`), routed
  from `breakdownMulti` in `lib/query/run.ts`. Production has 21,406 identified rows of
  183,768, one row whose ts and received_at fall on different days, none received more
  than an hour late. Site timezones come from `analytics.site_settings.timezone`
  (production sessions run in UTC).
- Files read: lib/query/breakdown.ts, sessions.ts, primitives.ts (scope, metrics),
  filters.ts (dimension maps), goals.ts (goalPredicate), run.ts (run, breakdownMulti,
  DEFAULT_TIMEOUT_MS), db.ts (withTimeout), ingest/collect.ts and time-bounds.ts (visitor
  id and the 24 h window), supabase/migrations/20260905020000_analytics_schema.sql
  (events, indexes, housekeeping, cron), 20260905050000_phase1.sql (site_settings),
  tests/setup/database.ts (migration ledger), tests/integration/budgets.integration.test.ts,
  schema.integration.test.ts (housekeeping test), scripts/seed/generate.ts (identified pool).

## Plan
- [x] Measure again with `explain (analyze, buffers)` on the three table statements to separate scan from aggregation (scripts/explain-prod.mts).
- [x] Decide rollup vs compute: D-015.
- [x] Migration `20260906000000_daily_rollup.sql`: rollup_daily, rollup_state, the partial index, rollup_window(), rollup_refresh(), housekeeping() calls the refresh and trims the rollup with retention.
- [x] Read path `lib/query/rollup.ts` + routing in `breakdownMulti`; unit test for the applicability rule.
- [x] Integration tests `tests/integration/rollup.integration.test.ts`: rollup equals the raw breakdown on the seed fixture per dimension (fully rolled, partly rolled, unrolled), goal columns equal, refresh is idempotent and bounded; the budget harness gains a 365-day case.
- [x] DEFAULT_TIMEOUT_MS back to 1.5 s; apply the migration and the first refresh in production (recorded here); re-measure with scripts/measure-prod.mts.
- [x] Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-05 — Created from TICKET-035.
- 2026-09-06 — Started. Explain-analyze on production; D-015 records the rollup shape.
- 2026-09-06 — Migration 20260906000000 written, tested locally, pushed with `npx supabase db push --linked`; first `analytics.rollup_refresh()` in production took 32 s and filled 61,849 rows for site 31 through 2026-09-04. Re-measured: pages 513 and locations 405 ms at twelve months (from 1,670 and 1,479), but Sources stayed at 1,295 because the seeded site has revenue and `revenue` was not a rolled metric, and the summary was 1,283 ms cold.
- 2026-09-06 — Second migration 20260906010000 adds `revenue` and `payments` columns and a `site` dimension (one value, '', the site total) so the summary reads the rollup too; drops and recreates rollup_window() for the new return type and clears the state. Pushed; the refill took 36 s (65,868 rows, 18 dimensions). Re-measured (below). The e2e fixture now runs `analyze` and `rollup_refresh()` after seeding: without fresh statistics the planner re-executed the window function per value and the 1.5 s timeout fired on the Overview in the e2e stack.
- 2026-09-06 — Local budgets re-measured with the rollup filled and tightened (summary 60 → 40, breakdownMulti_path 200 → 40, entry_channel with goals 260 → 60); a 365-day case added. TICKET-060 filed for the timeseries, the one Overview statement still on the range scan.

## Handoff
Closed; see Verification and Outcome.

## Verification
```
npm run verify                                   # lint, typecheck, ticket check, 152 unit tests: pass
TEST_DATABASE_URL=... npm run test:integration   # 7 files, 43 tests: pass
  budgets on 47601 rows (ms): summary 24, breakdownMulti_path 25, breakdownMulti_entry_channel_goals 35, ...
  twelve-month budgets on 66754 rows (ms): rollup_summary 26, rollup_path 31, rollup_entry_channel_goals 46, rollup_country 29
TEST_DATABASE_URL=... npm run test:e2e           # 61 passed (2.2 m), no statement timeouts in the server log
set -a; . ./.env; set +a; node --conditions=react-server --import tsx scripts/measure-prod.mts
  last_30d  {"summary":626,"timeseries":347,"pages_multi":261,"sources_multi":331,"locations_multi":256,"devices":312,"vitals":248,"pages_single":320}
  last_90d  {"summary":366,"timeseries":311,"pages_multi":372,"sources_multi":363,"locations_multi":289,"devices":335,"vitals":379,"pages_single":281}
  last_12mo {"summary":421,"timeseries":937,"pages_multi":504,"sources_multi":476,"locations_multi":389,"devices":466,"vitals":465,"pages_single":351}
```
Twelve months on the production pooler, before → after (ms, about 250 of each is the round trip):
summary 716 → 421, pages 1,670 → 504, sources 1,303 → 476, locations 1,479 → 389.
`tests/integration/rollup.integration.test.ts` pins the rollup path equal, row for row, to
`breakdownMultiQuery` on every rolled dimension (unrolled, partly rolled, fully rolled), with
goal columns, and the summary equal to `summaryQueries`, on a fixture with identified users
returning across days and a non-UTC site timezone.

## Outcome
Shipped: `analytics.rollup_daily` and `analytics.rollup_state`, `analytics.rollup_window()`
(the session definition in SQL), `analytics.rollup_refresh()` called from `housekeeping()`
(through two days ago; retention trims the rollup too), the partial index
`events_site_ts_identified`; `lib/query/rollup.ts` with `rollupApplies`,
`rollupBreakdownQuery`, `rollupSummaryQuery`, routed from `breakdownMulti` and `summary` in
`lib/query/run.ts`; `DEFAULT_TIMEOUT_MS` back to 1.5 s; `scripts/explain-prod.mts`;
unit, integration and budget tests; the e2e fixture analyses and rolls its rows. Production:
two migrations pushed, the rollup filled for site 31 (365 days, 65,868 rows); the nightly
cron keeps it current.
Left out: the timeseries still scans the range (TICKET-060); filtered reads, matrices,
property dimensions, event names and `last_seen` still take the events scan by design
(D-015); an identified session that crosses UTC midnight counts twice on the rollup side.
Follow-ups: TICKET-060.
