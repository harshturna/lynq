# TICKET-039: Locations screen

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/[site]/locations renders countries with flags, the region and city drill-down for the selected country, the country-by-hour heatmap and the languages table.

## Context
- Design §8.5, §9.7, rule 7 degradation (a country chip shows regions), §12 thresholds and the 3-hour bucketing under 640 px. Depends on TICKET-033, TICKET-034, TICKET-035.
- Read on start (2026-09-05): the approved mock is the "Locations" screen in the TICKET-025
  set; built on the TICKET-037/038 pattern. lib/screens/locations.ts: countries (visitors,
  share, pageviews, bounce, KPI completions when a goal exists); regions and cities for the
  whole site, or within the selected country when `sel` is a two-letter code (a country
  filter added to the context, so chips compose); languages; the heatmap from
  heatmap(ctx, "country") with the site's session count for the threshold. Region and city
  rows are dropped when '' so a site without geo headers shows the "not present" sentence.
  Enter on a country selects it (breadcrumb "All countries › Canada"); F filters.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] lib/screens/locations.ts; route; drill-down via sel; heatmap; languages.
- [x] Verify: npm run verify; integration; guest walk-through.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date.
- 2026-09-05 — Landed. Walk-through finding, fixed: at one third of the width the Countries table
  truncated names ("Ca…") under five numeric columns; the three geo tables now show
  visitors, share and the KPI column, with pageviews and bounce in the drawer and the CSV.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-040 (Devices).
- **Blocked on:** nothing.
- **Next:** TICKET-040.
- **Read first:** lib/screens/locations.ts.

## Verification
```
npm run verify
```
lint, typecheck, ticket check, 32 files / 150 unit tests. lib/query is untouched by this
ticket (integration last run green on TICKET-038, 36 tests). Guest walk-through on
`next dev -p 3005` at 1280 and 390 px: four tables and the heatmap with no failed sections;
Enter on Canada writes `sel=CA`, the breadcrumb reads "All countries › Canada" and Regions
and Cities narrow to Ontario, British Columbia, Quebec and seven cities; F writes
`f=country:is:CA` and the heatmap narrows to one row; no console errors.

## Outcome
Shipped: /[site]/locations per §8.5 with lib/screens/locations.ts. Left out: nothing.
No follow-up tickets.
