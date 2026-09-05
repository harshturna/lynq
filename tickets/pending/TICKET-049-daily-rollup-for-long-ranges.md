# TICKET-049: Daily rollup so long ranges meet the query budget

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
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

## Plan
- [ ] Measure again with `explain (analyze, buffers)` on the three table statements to separate scan from aggregation.
- [ ] Decide rollup vs compute (decide skill); migration for the rollup table if chosen.
- [ ] Read path in lib/query/breakdown.ts; refresh in housekeeping(); integration tests; budget case.
- [ ] DEFAULT_TIMEOUT_MS back to 1.5 s. Verify: npm run verify; npm run test:integration; scripts/measure-prod.mts.

## Progress log
- 2026-09-05 — Created from TICKET-035.

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
