# TICKET-054: Rebuild the data table (D-013); apply to the Overview and Pages

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
One table component that reads the way the approved mock does, left-hugging with one primary
column and the bar in its own column, applied to the Overview's three tables and the Pages
table so the owner can judge it on real screens before it spreads.

## Context
- D-013 has the rules; the approved mock is
  https://claude.ai/code/artifact/e616a75f-48ac-4525-9e96-c7aa47a46fd2. Owner: "not all are
  tables, just the ones that need to be".
- components/shell/data-table.tsx is the only table; callers: _overview/tables.tsx (lead mode,
  Details link), pages/_pages/table.tsx, sources, locations, devices, events, performance
  tables, the preview page. API change: `lead` and `changes` go; `primary` (the column with
  ink weight, the dark header and the only change slot; defaults to the sorted column),
  `bar` (the column whose share fills a 6 px bar column after the label), `fill` (fill the
  container; default hugs the left), `labelHeader` (the label column's name), and a
  column-level `status` for a pill slot after a cell. Sparkline columns are removed where
  this ticket touches (Pages); other screens keep compiling on the new API and are cut in
  TICKET-055 onward, one screen each.
- Pages All view columns become Visitors (primary) · Pageviews · Bounce · Engaged; Entries and
  Exits are the Entry and Exit views. The search box moves onto the caption rule. The
  Overview's three tables keep one ranked metric with the bar column and lose the "Details →"
  header link in favour of the footer's Show all, as every other table has.
- Unit tests in data-table.test.tsx follow the new API; the e2e Pages and Overview flows keep
  passing (row names, tablist, sort, filter buttons are unchanged contracts).
- Ruled out: a metric switcher on the caption rule (the owner wants variety, not one form).

## Plan
- [x] Rewrite data-table.tsx per D-013; update data-table.test.tsx.
- [x] Overview tables and Pages table on the new API with the column cuts above; other
  callers updated mechanically (no `lead`/`changes`).
- [x] Look at Overview and Pages at 1280 and 375 against the mock; fix; show the owner.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e.

## Progress log
- 2026-09-06 — Created and started from D-013.
- 2026-09-06 — Landed. Looked at the Overview and Pages at 1280 and 375 against the mock: same
  shape. Two fixes from looking: in fill mode the label's `w-full` starved the bar column
  (label 56%, bar 30% now), and under 480 px the bar column is hidden so labels keep their
  room. The Pages trends query went with the sparkline column (nothing else read it). The
  other screens compile on the new API with their old column sets; their cuts are
  TICKET-055.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed.
- **Blocked on:** nothing
- **Next:** TICKET-055, the column cuts on the remaining screens
- **Read first:** components/shell/data-table.tsx; tickets/DECISIONS.md D-013

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npx playwright test --project=app
```
verify: lint, typecheck, ticket check, 33 files / 149 unit tests (the table's 7 follow the
new API: label header, bar column, one change slot). App e2e: 44 passed in 1.7 min, every
route axe-clean and without sideways scroll at both widths. Screenshots of the Overview and
Pages at 1280 and 375 reviewed against the D-013 mock.

## Outcome
Shipped: the table rebuilt per D-013 (`primary`, `bar`, `fill`, `labelHeader`, `caption`,
column `status`; `lead` and `changes` gone); the Overview's three tables on it; the Pages
table cut to Visitors · Pageviews · Bounce · Engaged with the search on the caption rule and
no sparkline. Left out: the column cuts on Sources, Locations, Devices, Events, Goals and
Performance, and the Goals dot plot's hollow marks (TICKET-055).
