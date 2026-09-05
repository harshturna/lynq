# TICKET-031: Shell part two: KPI strip, tables, badges, skeletons

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
KpiStrip, Section, DataTable with the full §6 semantics, Badge, Pill, RowBar and skeletons exist, plus a development-only preview route that renders each with sample data.

## Context
- Design §6 (DataTable: aria-sort on every header, tablist captions as links, aria-current rows, sub-rows with aria-expanded, roving row tabindex with Enter / F / Shift+Enter, the always-tabbable Filter button, delta columns when compare is on, Show all drawer plain under 300 rows else virtualised grid with aria-rowcount, hidden secondary columns under 1000 px, scrollable regions with tabindex and role), KpiStrip as a radiogroup with explicit → links, Badge and Pill glyphs, RowBar.
- Design §12 (skeletons match the final layout; zero denominators render —). Depends on TICKET-028, TICKET-029, TICKET-030.
- Preview route app/(dev)/ui/page.tsx gated to NODE_ENV=development, used by the responsive and accessibility pass (TICKET-047).
- Read on start: TICKET-030 landed components/shell (ShellProvider with useViewState and
  useAnnounce, Control, Segmented, dimensions.ts with displayValue, the /shell preview);
  lib/url-state.ts has withView, withSort, withFilter, withParam, hasFilter. The old
  components/ui/skeleton.tsx is styled on the HSL tokens and is left alone.
- Decisions (routine): the Show all drawer virtualises with @tanstack/react-virtual above 300
  rows; below that it is a plain table. Sorting inside DataTable is client-side over the rows
  it was given (screens pass the full breakdown page, at most a few hundred rows); the sort
  is still written to `sort.<region>` so the URL is shareable and the server can honour it
  later. Row Enter/F/Shift+Enter map to callbacks (onSelect, onFilter) the screen supplies, so
  rule 7's select-versus-filter choice stays with the screen. The preview route is
  app/(dev)/ui, rendering every component with sample data, and TICKET-030's /shell folds
  into it.
- Ruled out: share bars inside tables (D-008).
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] KpiStrip (radiogroup, snapping row under 480 px), Section, Badge, Pill, RowBar.
- [x] DataTable with every §6 behaviour; Show all drawer with the §6 dialog and history rules; CSV export helper.
- [x] Skeleton variants for strip, chart area and table.
- [x] Preview route with sample data for each component.
- [x] Unit tests on sorting, roving focus, the Filter button reachability, drawer focus return; verify: npm run verify.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date (virtualisation, client-side sort written to the URL, callbacks for select and filter).
- 2026-09-05 — Built badge.tsx (Badge, DeltaBadge, DeltaText, Pill, deltaOf), section.tsx (Section,
  RowBar), kpi-strip.tsx, data-table.tsx, drawer.tsx (Drawer, ShowAllDrawer), skeleton.tsx,
  lib/csv.ts; the /ui preview replaces /shell and renders everything on sample data. Tests:
  deltaOf, toCsv, KpiStrip, DataTable (aria-sort on every header with the next-action name,
  sort written to the URL with replace, tablist of links, aria-current row, one tab stop with
  arrows and Enter/F/Shift+Enter, sub-rows with a prefixed name, deltas when compare is on,
  footer). Deviations forced by Biome's a11y rules: KPI tiles are native radios inside labels
  (arrow keys come free) rather than buttons with role=radio; the virtualised drawer is a
  real table with spacer rows and aria-rowcount/aria-rowindex rather than a role=grid of
  divs; scrollable regions are `<section tabIndex=0>` with noNoninteractiveTabindex turned
  off for components/shell in biome.json (WCAG 2.1.1 needs the tab stop and the rule cannot
  tell a scroll region apart). The row button carries an explicit aria-label because the
  accessible-name algorithm dropped the space after an sr-only prefix ("version128"). The
  Filter button in the last cell is tabIndex -1: rows are one tab stop and F / Shift+Enter
  reach the action, which is what pass 3 asked for on balance. Walk-through on next dev:
  sort click writes ?sort.pages=-bounce, Chrome expands to its versions, Show all opens the
  800-row virtualised drawer with search, Escape returns focus to the Show all button. Fixes
  from the screenshots: the label column collapsed to "/…" at 390 px with fixed layout, now
  auto layout with the label column taking the remaining width and numeric widths applied
  only above 1000 px; drawers opened programmatically lost focus on close, now returned to
  the opener.

## Handoff
Closed; next is TICKET-032 (ECharts foundation).

## Verification
```
npx vitest run components/shell lib/csv   # 26 tests pass (DataTable 6, KpiStrip 1, deltaOf 3, toCsv 1, plus TICKET-030's 15)
npm run verify                            # lint 0 errors (42 warnings, unchanged), typecheck, tickets, 125 unit tests pass
next dev + Playwright as guest on /ui (screenshots reviewed at 1280 and 390 px):
  sort click -> ?sort.pages=-bounce; Expand Chrome -> 128, 127 sub-rows; Show all -> 800-row
  virtualised drawer, search "page-7" filters; Escape -> focus back on Show all
  390 px: label column keeps its width and truncates, secondary column hidden, KPI strip snaps
```

## Outcome
Shipped: Badge, DeltaBadge, DeltaText, Pill, Section, RowBar, KpiStrip, DataTable, Drawer,
ShowAllDrawer, skeletons, lib/csv.ts, the /ui development preview, @tanstack/react-virtual.
Left out by decision: server-side sorting (rows are sorted client-side over the page the
screen passes; the sort is in the URL for later); the row Filter button is not a Tab stop
(rows are one stop, F and Shift+Enter filter). Follow-ups: none new; TICKET-047 already
carries the 390 px nav clipping.
