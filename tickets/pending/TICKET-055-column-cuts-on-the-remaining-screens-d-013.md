# TICKET-055: Column cuts on the remaining screens (D-013)

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** ui

## Goal
Sources, Locations, Devices, Events, Goals and Performance show their tables on the D-013
form with at most four numeric columns each, and the Goals dot plot loses its hollow marks.

## Context
- TICKET-054 rebuilt the component and applied it to the Overview and Pages; these screens
  compile on it with their old column sets, so Sources still shows eight columns.
- From the audit (https://claude.ai/code/artifact/04f53fac-763a-4f5e-b42e-b129b4b19793) and the
  two-forms map: Sources: Channels ranked (Visitors, bar, fill), Sources regular (Visitors ·
  Conv. · Revenue, fill), Campaigns regular (Visitors · Completions · Conv.); strip money
  formatted as money. Locations: Countries regular (Visitors · the KPI), Regions, Cities and
  Languages ranked with the bar. Devices: Browsers and OS ranked (Visitors, bar), versions on
  expand. Events: Count · Visitors · Frequency · Last seen, no sparkline; occurrences capped at
  10 with Show all. Goals: no sparkline; Revenue hidden when no goal has revenue; dot plot
  filled marks, lighter fill below the average. Performance: the vitals matrix with the
  column `status` slot only where not good; strip tiles lose the delta badge; distribution
  histogram bands in the teal ramp. Realtime: the feed shows 20 with "Show earlier".
- Files: the `_sources`, `_locations`, `_devices`, `_events`, `_goals`, `_performance` and
  `_realtime` table and panel components; lib/charts/dotplot.ts; lib/screens/events.ts
  (trends query if the sparkline was its only reader).

## Plan
- [ ] One screen at a time in the order above; look at each at 1280 and 375 before the next.
- [ ] Remove queries whose only reader was a cut column.
- [ ] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e.

## Progress log
- 2026-09-06 — Created from TICKET-054.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** nothing
- **Next:** Sources first
- **Read first:** components/shell/data-table.tsx; app/(main)/[website_slug]/sources/_sources/tables.tsx

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
