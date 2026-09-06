# TICKET-060: The lead timeseries reads the daily rollup where the buckets allow

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** quality

## Goal
The twelve-month lead chart no longer depends on a cold range scan: unfiltered day, week and month series are summed from `analytics.rollup_daily`'s `site` rows when the site's timezone makes its bucket boundaries UTC midnights, with the partial days from the events as the breakdowns do.

## Context
- TICKET-049 (D-015) moved the summary and the tables onto the rollup. The timeseries was
  left on the events scan: its buckets are site-timezone days, and the rollup is by UTC day,
  so only sites in UTC (every production site today) could read it exactly. Measured on the
  production pooler 2026-09-06 after the rollup landed: timeseries at twelve months 937 ms
  cold (426 to 489 ms warm), the only Overview statement still near the 1.5 s budget.
- Read: lib/query/primitives.ts (timeseriesQuery, fillSeries), lib/query/rollup.ts,
  scripts/measure-prod.mts.
- On start (2026-09-06): callers are the Overview lead (any metric, range granularity), Pages
  and Events (visitors / custom events, filtered by a row scope so they take the raw path) and
  the landing page (visitors by day). Bucket boundaries come from `buckets()` in
  lib/query/ranges.ts; the rule is that every boundary is a UTC midnight, checked on the
  actual boundaries so a zero-offset zone qualifies whatever its name. Unrolled days are
  computed one window call per day (generate_series) so a day never straddles two buckets;
  identified visitors are counted per bucket from the rows through the partial index. The
  raw series buckets a session by its start over the whole range; the rolled series splits a
  session that crosses UTC midnight, the D-015 approximation (anonymous ids cannot cross).

## Plan
- [x] `rollupTimeseriesApplies`: unfiltered, rolled metric, day or coarser, every bucket boundary a UTC midnight.
- [x] `rollupTimeseriesQuery` summing `site` rows per bucket plus the edge windows; routed from `timeseries()` in lib/query/run.ts.
- [x] Integration test against `timeseriesQuery` on the seed fixture (UTC site; day, week, month; every metric; unrolled, partly, fully rolled); budget case; re-measure production. Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-06 — Created from TICKET-049.
- 2026-09-06 — Started; read path written.
- 2026-09-06 — Also found while measuring: the identified-visitor count for a row dimension or the site total went through the full session definition in `rollup_window()`; it now counts distinct ids from the rows alone (session dimensions still need the sessions for their entry). The summary at twelve months on the local fixture went from 34 to 10 ms.

## Handoff
Closed; see Verification and Outcome.

## Verification
```
npm run verify                                   # lint, typecheck, ticket check, 157 unit tests: pass
TEST_DATABASE_URL=... npm run test:integration   # 7 files, 43 tests: pass
  twelve-month budgets on 78481 rows (ms): rollup_summary 10, rollup_timeseries_visitors 17, rollup_path 15, rollup_entry_channel_goals 68, rollup_country 12
TEST_DATABASE_URL=... npm run test:e2e           # 61 passed (2.2 m)
set -a; . ./.env; set +a; node --conditions=react-server --import tsx scripts/measure-prod.mts
  last_12mo {"summary":326,"timeseries":284,"pages_multi":337,"sources_multi":456,"locations_multi":275,"devices":352,"vitals":405,"pages_single":314}
```
The rollup comparison test pins the rolled series equal to `timeseriesQuery` for every rolled
metric by day, week and month on a UTC site, unrolled, partly rolled and fully rolled, and
checks a Toronto site does not qualify. Production timeseries at twelve months: 937 ms cold /
426 to 489 warm before, 284 after (about 250 of it the round trip).

## Outcome
Shipped: `rollupTimeseriesApplies` and `rollupTimeseriesQuery` in lib/query/rollup.ts, routed
from `timeseries()`; identified users counted from the rows for row dimensions and the site
total; tests and a budget case. Left out: sites whose bucket boundaries are not UTC midnights
keep the events scan (no production site today); hour buckets always do. No follow-ups.
