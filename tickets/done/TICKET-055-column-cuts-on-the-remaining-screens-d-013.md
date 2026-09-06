# TICKET-055: Column cuts on the remaining screens (D-013)

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
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
- [x] One screen at a time in the order above; look at each at 1280 and 375 before the next.
- [x] Remove queries whose only reader was a cut column.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e.

## Progress log
- 2026-09-06 — Created from TICKET-054.
- 2026-09-06 — Landed in one pass, then every screen looked at at 1280: Sources (Channels
  ranked with the bar; Sources with Visitors · Conv. · Revenue; Campaigns with Visitors ·
  Completions · Conv.), Locations (Countries regular with the KPI; Regions, Cities and
  Languages ranked), Devices (both tables ranked, versions on expand), Events (Count ·
  Visitors · Frequency · Last seen; occurrences capped at 10), Goals (no sparkline; Revenue
  only when a goal has it; the dot plot's below-average marks filled in the lighter teal),
  Performance (status slot on LCP, INP and CLS only where not good; strip tiles keep the pill
  and the previous value; distribution bands in the teal ramp), Realtime (feed shows 20 with
  Show earlier). The trends query (lib/query/trends.ts) lost its last reader with the Events
  sparkline and is deleted with its wrapper and integration test. The Sources strip's money
  stays unit-less on purpose: revenue is in the site's own unit (lib/format fmtRevenue).
- 2026-09-06 — The integration suite fails when the e2e suite runs against the same database
  at the same time (both write analytics.visitor_salts); run them one after the other.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed.
- **Blocked on:** nothing
- **Next:** TICKET-049 (daily rollup) or TICKET-051
- **Read first:** components/shell/data-table.tsx; app/(main)/[website_slug]/sources/_sources/tables.tsx

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:e2e
```
verify: lint, typecheck, ticket check, 33 files / 149 unit tests (the dot plot test follows the
filled marks). Integration: 6 files / 36 tests (the trends test went with the query). e2e:
57 passed in 2.3 min, every route axe-clean and without sideways scroll at both widths.
Screenshots of all seven screens at 1280 reviewed against the D-013 mock.

## Outcome
Shipped: every remaining screen's tables on the D-013 form with at most four numeric columns,
the Goals dot plot with filled marks, the Events occurrences and Realtime feed caps, and the
trends query removed. Left out: nothing from the audit's table findings. The Sources strip's
currency stays as designed. No follow-up tickets.
