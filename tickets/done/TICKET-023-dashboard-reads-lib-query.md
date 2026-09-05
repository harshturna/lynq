# TICKET-023: Rewire the dashboard to lib/query with no visual change

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** quality

## Goal
The existing site dashboard (analytics, events, performance tabs) reads analytics.events through lib/query instead of the old tables, so its numbers are right at any volume and v1 can be removed.

## Context
- Design §9 (primitives, filters, ranges) and §15 (the five visible changes accepted in D-004);
  D-007 for why this comes first.
- Today: app/(main)/[website_slug]/page.tsx fetches raw rows through
  getAnalytics/getVitals/getCustomEventData/getPeriodComparison in lib/actions.ts, and the
  client components (analytics-dashboard, analytics-chart, metric-card, share-bar-list, globe-
  card, data-card, event-dashboard, performance-dashboard, core-vital-card, js-heap-chart)
  aggregate in JavaScript (lib/utils.ts groupByAnalytics, process*Data, applyFilters,
  calculateAverageVital).
- Filters are client-side over raw rows today (filter-context.tsx, OR within / AND across). With
  aggregates every filter change must refetch from the server; the same semantics live in
  lib/query/filters.ts.
- The five date-picker values map onto lib/query ranges: Today -> last_24h, Last 7 days ->
  last_7d, Last 30 days -> last_30d, Last 3 months -> last_90d, Last 12 months -> last_12mo;
  compare = previous_period.
- Needs one primitive lib/query lacks: per-metric p75 vitals for the Performance tab
  (percentile_cont per column, NULLs excluded) plus avg resources; add it as
  lib/query/vitals.ts.
- The JS heap card and chart are retired (D-004). Countries come back as ISO codes; the globe and
  flag helpers key by name, so convert with countryNameFromCode.
- Ruled out: changing the look. Ruled out: keeping client-side filtering by shipping raw rows.

## Plan
- [x] Add lib/query/vitals.ts (p75 per vital column, avg resources, sample size) with an integration
      test.
- [x] New server action getDashboard(url, range, filters) in a new lib/dashboard.ts ("use server"):
      authorize -> buildContext -> summary with compare, timeseries (pageviews, sessions),
      breakdowns (path, referrer, source, device, browser, os, country), vitals, rows(events).
      Returns plain JSON-safe data.
- [x] page.tsx calls it for the default range; website-dashboard.tsx calls it on range or filter
      change; FilterProvider keeps the same click-to-filter API but triggers a refetch.
- [x] Components accept aggregates: chart takes series; metric-card/share-bar-list take breakdown
      rows; globe takes country rows; data-card takes summary + compare; event-dashboard takes
      rows; performance-dashboard takes p75 vitals; remove js-heap-chart.
- [x] Delete the read actions and the utils they used once nothing imports them.
- [x] Verify: npm run verify, npm run test:integration (vitals primitive), npm run build, and a
      signed-in guest walk-through of the three tabs on a local production server with the
      browser.

## Progress log
- 2026-09-05 — Created (D-007, Phase 1 opening).
- 2026-09-05 — Started. Added lib/query/vitals.ts, lib/dashboard-types.ts (JSON-safe shapes the
  client receives) and lib/dashboard.ts (getDashboard). Filters are now refetched server-side:
  FilterProvider keeps the chip list, website-dashboard.tsx refetches on any change with a
  request-id guard so a slow earlier response cannot overwrite a newer one.
- 2026-09-05 — All dashboard components take aggregates. Removed js-heap-chart, the four read
  actions in lib/actions.ts, and the aggregation helpers in lib/utils.ts (getTimeFrame,
  getPeriodBounds, groupByAnalytics, applyFilters, process*Data, getFormatters, ...) and their
  row types in lib/types/index.d.ts. Countries render from ISO codes via countryNameFromCode.
  Decision: the "Resources & Interactions" panel becomes "Resources & Samples" (average
  resources per page and the number of measured page loads); interaction count had no v2 source.
- 2026-09-05 — Walk-through found the Referrers card empty: the breakdown primitive drops the
  empty value by design, so direct traffic vanished. getDashboard now counts referrer='' and
  source='' separately (one small breakdown each) and inserts a '' row that renders as Direct;
  the chip on it filters the same way.
- 2026-09-05 — Walk-through measured a ~6 s refetch on a range change: ~16 queries serialised
  on lib/db's single pooled connection, with summary's two windows run back to back. Decision:
  pool max 1 -> 4 (design §14 updated) and summary runs its two windows and two statements in
  parallel. Database time for the 12-month range 4.9 s -> 1.5 s; end-to-end refetch ~2.5 s.
  Remaining load time is noted in TICKET-025's Context, which owns the new data loading.
- 2026-09-05 — The Chrome extension could not open localhost (public sites load, local ones
  show an error page), so the guest walk-through ran through the repo's Playwright against
  `next start` with full-page screenshots reviewed by hand.

## Handoff
Closed; nothing outstanding.

## Verification
```
npm run verify                      # lint 0 errors (44 pre-existing warnings), typecheck, tickets, 86 unit tests pass
TEST_DATABASE_URL=... npm run test:integration   # 4 files, 20 tests pass (vitals: 2 new)
npm run build                       # compiles; /[website_slug] dynamic
```
Guest walk-through (Playwright against `next start`, production database, 2026-09-05):
- Analytics, lynq.byharsh.com, Last 30 days: 4 visitors, 10 views, 0.11 mins, 25% bounce;
  chart, globe, Countries (Canada), Pages, Referrers (Direct 10), Devices all populated.
- Click Canada row -> chip "Country Canada" appears, data refetched with the filter, Clear all
  restores. 24 hours and Last 12 months refetch in ~2.5 s with the chart subtitle updating.
- Performance: LCP 1704 ms, CLS 0.000, FCP/TTFB/TTI/DCL/Load populated; INP and TBT show
  "Not enough data"; 19 page loads measured, 25 resources average.
- Events, aivia.byharsh.com, Last 12 months: 200 events listed with flag + country name;
  expanding one shows the default and custom property tabs.
- Zero console errors on every page.

## Outcome
Shipped: the site dashboard reads analytics.events through lib/query only. New lib/dashboard.ts
(getDashboard server action), lib/dashboard-types.ts, lib/query/vitals.ts (+ run.vitals);
every component under app/(main)/[website_slug]/_components takes aggregates; filters refetch
server-side. Removed js-heap-chart, the four read actions in lib/actions.ts, the aggregation
helpers in lib/utils.ts, their row types, and the unused EXCLUDED_KEYS constant. Pool max
raised to 4 and summary parallelised.
Visible changes, all within D-004: Direct appears as a row in Referrers and Sources; the
Performance side panel shows average resources and measured page loads instead of the JS heap
chart and interaction count; countries are shown by name with a flag from ISO codes.
Left out: nothing from the plan. Follow-ups: none new; load-time work recorded in TICKET-025's
Context. TICKET-024 (remove v1) is next.
