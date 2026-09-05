# TICKET-037: Pages screen

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
/[site]/pages renders the treemap, the sortable table with All/Entry/Exit views and glob search, and the selected page's flow panel, vitals, goals and trend.

## Context
- Design §8.3, §9.5 (pageFlow), rule 7 (select then Filter), §12 thresholds. Depends on TICKET-033, TICKET-034, TICKET-035.
- Read on start (2026-09-05): the approved mock is the "Pages" screen in the TICKET-025 set.
  Built on the TICKET-035 pattern: lib/screens/context.ts (screenContext: site, URL state,
  query context, KPI probe, shared with the Overview) and components/shell/screen-header.tsx
  (the Overview's header generalised with a title). lib/screens/pages.ts: one multi-metric
  breakdown per view; the All view joins entries and exits from breakdowns on entry_path and
  exit_path by session; the treemap takes the top 12 rows with the site's unique visitors as
  the total; sparklines come from one statement (lib/query/trends.ts, trends(): visitors per
  bucket for up to 20 values); the selected page runs pageFlow, vitals and the KPI goal's
  stats with a path filter, and a visitors timeseries. DataTable gains `changes: "sorted"`
  so the full Pages table shows one change slot beside the sorted column rather than seven
  (D-010's slot rule at full width; a routine choice to review on the screenshot). Glob
  search filters the loaded rows on the client with lib/ingest/glob.ts.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] lib/screens/pages.ts; route; treemap with everything-else leaf; table; selection panels.
- [x] Verify: npm run verify; integration on getPagesScreen; guest walk-through.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date.
- 2026-09-05 — Landed. Walk-through findings, fixed: the client table imported a constant from the
  server-only screen module (Next refuses the chain; constants live in the client now); a
  session-dimension breakdown with only session metrics pushed the row-scope parameters
  without referencing them ("could not determine data type of parameter $1"), the Overview
  never hit that combination; breakdown.ts compiles the row scope lazily and an integration
  test covers it. Routine deviation from §8.3: the treemap's area is pageviews, not
  visitors, because unique visitors do not add up across pages and the everything-else leaf
  could not be sized (the builder gained a `unit`). The flow panel shows eight rows per side.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed; next is TICKET-038 (Sources).
- **Blocked on:** nothing.
- **Next:** TICKET-038.
- **Read first:** lib/screens/pages.ts and lib/screens/context.ts as the pattern.

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:integration
```
verify: lint, typecheck, ticket check, 32 files / 150 unit tests. Integration 6 files / 35
tests (new: trends for a few values in one statement; a session dimension with only session
metrics). Guest walk-through on `next dev -p 3005` at 1280 and 390 px: treemap with the
everything-else leaf, twelve rows with entries, exits and sparklines, one change slot beside
the sorted column; Enter on "/" writes `sel=%2F` and renders the flow (came from with entry
referrers, went to with "Left the site"), vitals, the no-goal notice and the trend; the Entry
tab writes `view.pages=entry` and swaps the columns; "/docs/*" in the search narrows to four
rows; no console errors at either width (the treemap gives way to its width sentence at 390).

## Outcome
Shipped: /[site]/pages per §8.3 with lib/screens/pages.ts, the shared screenContext and
ScreenHeader (the Overview now uses both), the trends primitive, DataTable's `changes:
"sorted"` mode and the multi-metric builder fix. Left out: nothing. No follow-up tickets.
