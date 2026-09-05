# TICKET-035: Overview on the new shell

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/[site] renders the approved Overview on the new shell and charts, reading through lib/screens/overview.ts, and the old dashboard code is deleted.

## Context
- Design §8.0 (KPI states), §8.1, §10 (getOverviewScreen with settled section promises awaited in server children under Suspense, aria-busy, timeouts, compare failure handling), §12 (states), §15 (everything deleted here: cobe and the globe, recharts and chart.tsx, framer-motion and tailwindcss-animate, the old _components, lib/dashboard.ts and dashboard-types.ts, DatePickerValues and datePickerValues, the is_first_visit guest skip).
- Depends on TICKET-030 to TICKET-034. The guest write guard in lib/actions.ts stays.
- Walk-through: Playwright as guest on a local next start across the ranges, then live after deploy.
- Read on start (2026-09-05): the checked KPI tile drives the lead chart, so it is URL state:
  lib/url-state.ts gains `metric` (visitors, sessions, pageviews, bounce_rate, engaged_time,
  kpi; omitted at the default). The KPI tile's series needs completions per bucket, which no
  primitive returned; goals.ts gains goalTimeseriesQuery and run.ts goalTimeseries. The
  authorised Site now carries kpi_goal_id, breakpoints and shortcuts from site_settings.
  Screens read through lib/screens: site.ts (resolveSite, cached per request: user, website,
  authorised site, the site list for the switcher), kpi.ts (the goal row and the revenue
  probe), settle.ts, overview.ts (getOverviewScreen), suggest.ts (a server action the filter
  builder calls for values). Layout: app/(main)/layout.tsx keeps only the auth redirect; the
  old dark Header moves to app/(main)/dashboard/layout.tsx so the sites list looks as it did
  until TICKET-036; app/(main)/[website_slug]/layout.tsx renders TopNav on the light base.
  TopNav links to /sites, which TICKET-036 builds; a redirect stub to /dashboard stands in so
  the wordmark is not a dead link. Settings in the nav stays a 404 until TICKET-045.
- Deliberately kept: Satoshi and CalSans (§15 lists them) because the landing page and the
  old sites list still set them in globals.css and the landing redesign is deferred by the
  owner; they go with the landing page ticket. tailwindcss-animate goes; the shadcn
  components on the old sites list lose their open/close animation, nothing else.
- Goal panel (§8.1 "three-step funnel"): Visited the site (sessions), Reached the goal (the
  funnel's second step), Completed (completions). The Overview's "no data at all" state is a
  one-paragraph inline snippet panel until TICKET-046 builds onboarding.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] lib/screens/overview.ts with settle(); app/(main)/[website_slug]/page.tsx and section components.
- [x] KPI strip in all three KPI states; lead chart driven by the checked tile; goal and devices panels; three tables with regions; vitals strip.
- [x] Delete the §15 list; remove the dependencies; npm uninstall.
- [x] Verify: npm run verify; npm run test:integration; npm run test:e2e; npm run build; guest walk-through; live check after deploy.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date (metric param, goal timeseries, layout split, fonts kept).
- 2026-09-05 — Built: lib/format.ts, lib/vitals.ts, lib/screens/{settle,site,kpi,suggest,overview}.ts,
  app/(main)/[website_slug]/{layout,page,loading}.tsx and _overview/{header,lead,tables,
  vitals,sections,section-error}.tsx; the old _components, components/ui/chart.tsx,
  lib/dashboard.ts, lib/dashboard-types.ts, DatePickerValues and datePickerValues deleted;
  cobe, recharts, framer-motion and tailwindcss-animate uninstalled. Walk-through as guest on
  next dev at 1280 and 390 px: strip, chart with the dotted previous period, devices split,
  three tables with deltas, vitals strip; the tile switch, table view and Enter-to-filter
  all write the URL and announce.
- 2026-09-05 — Finding: on the production pooler the 1.5 s statement timeout failed summary and the
  three tables at 90 days and twelve months (dev.log: "canceling statement due to statement
  timeout"). Measured sequentially with scripts/measure-prod.mts: the multi-metric tables take
  1.3 to 1.7 s at twelve months on 183k rows. DEFAULT_TIMEOUT_MS raised to 5 s as the interim;
  the design's named lever, a daily rollup, is TICKET-049. After the change every preset range
  renders with no failed section.
- 2026-09-05 — Findings filed: TICKET-048 (the seed gives every visitor one session, so Unique
  visitors and Sessions read the same number). Fixed here: rangeLabel dropped the start year on
  a cross-year range ("Sep 6 – Sep 5, 2026").

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-036 (sites list at /sites; the /sites stub redirects to
  /dashboard until then). The nav's Settings link is a 404 until TICKET-045; Realtime and the
  other sections until their tickets.
- **Blocked on:** nothing.
- **Next:** TICKET-036.
- **Read first:** lib/screens/overview.ts and app/(main)/[website_slug]/page.tsx as the
  pattern every other screen follows.

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration
npm run test:e2e
npm run build
```
verify: lint (38 pre-existing warnings), typecheck, ticket check (49 tickets), 31 files /
147 unit tests passed (new: format, settle, the metric URL param, the cross-year range
label). Integration 6 files / 33 tests (new: goal completions per bucket). e2e 13 passed.
Build compiles with /[website_slug] dynamic. Guest walk-through on `next dev -p 3005` against
production data: every preset range renders with zero "Couldn't load this" sections after the
timeout change; tile switch writes `metric=sessions` and retitles the chart; the Entry tab
writes `view.pages=entry`; Enter on a row writes `f=entry_path:is:/` and announces "Added
Entry page is /."; no console errors. Screenshots at 1280 and 390 px reviewed.

## Outcome
Shipped: the Overview on the new shell at /[site] reading through lib/screens/overview.ts
with settled sections under Suspense, the KPI strip in its no-goal state (the goal states
render from the same code once a goal exists), the lead chart driven by the checked tile,
goal and devices panels, Pages / Sources / Locations tables with views, deltas, Show all and
CSV, the vitals strip; the old dashboard code and its four dependencies deleted. Left out on
purpose: Satoshi and CalSans (the landing page still uses them; owner deferred the landing
redesign); the live "N on the site now" subtitle until TICKET-044. Follow-ups: TICKET-048
(seed returning visitors), TICKET-049 (daily rollup; statement timeout back to 1.5 s).
