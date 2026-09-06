# TICKET-060: The lead timeseries reads the daily rollup where the buckets allow

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
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

## Plan
- [ ] `rollupTimeseriesApplies`: no filters, metric in the rolled set, timezone offset is zero for every bucket boundary in the range (or bucket the UTC days into local buckets when the offset is a whole day multiple, which it never is; keep it to UTC sites).
- [ ] `rollupTimeseriesQuery` summing `site` rows per bucket plus the edge windows; route from `timeseries()` in lib/query/run.ts.
- [ ] Integration test against `timeseriesQuery` on the seed fixture; budget case. Verify: npm run verify; npm run test:integration.

## Progress log
- 2026-09-06 — Created from TICKET-049.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** nothing
- **Next:** —
- **Read first:** lib/query/rollup.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
