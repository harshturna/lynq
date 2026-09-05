# TICKET-023: Rewire the dashboard to lib/query with no visual change

**Status:** in-progress
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** —
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
- [ ] Add lib/query/vitals.ts (p75 per vital column, avg resources, sample size) with an integration
      test.
- [ ] New server action getDashboard(url, range, filters) in a new lib/dashboard.ts ("use server"):
      authorize -> buildContext -> summary with compare, timeseries (pageviews, sessions),
      breakdowns (path, referrer, source, device, browser, os, country), vitals, rows(events).
      Returns plain JSON-safe data.
- [ ] page.tsx calls it for the default range; website-dashboard.tsx calls it on range or filter
      change; FilterProvider keeps the same click-to-filter API but triggers a refetch.
- [ ] Components accept aggregates: chart takes series; metric-card/share-bar-list take breakdown
      rows; globe takes country rows; data-card takes summary + compare; event-dashboard takes
      rows; performance-dashboard takes p75 vitals; remove js-heap-chart.
- [ ] Delete the read actions and the utils they used once nothing imports them.
- [ ] Verify: npm run verify, npm run test:integration (vitals primitive), npm run build, and a
      signed-in guest walk-through of the three tabs on a local production server with the
      browser.

## Progress log
- 2026-09-05 — Created (D-007, Phase 1 opening).

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
