# TICKET-073: Revenue per visitor on the Pages and Locations tables

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** feature

## Goal
When a site records revenue, the Pages and Locations tables show revenue and revenue per visitor beside their visitor counts, as Sources already does, so "which page and which country make money" is answerable without a goal.

## Context
- From the DataFast review ("revenue per visitor on every breakdown"). Done for Sources
  (lib/screens/sources.ts adds `revenue` when kpi.hasRevenue; the strip has a revenue-per-
  visitor tile). Not done for Pages (lib/screens/pages.ts VIEWS, app/(main)/[website_slug]/
  pages/_pages/table.tsx columnsFor) or Locations (lib/screens/locations.ts, locations/_locations/
  tables.tsx columnsFor). The query layer already returns `revenue` and `payments` per row
  through breakdownMulti, on the rollup path too (TICKET-049 second migration), so this is
  screen and column work only.
- D-013 caps tables at four visible columns; revenue per visitor replaces a column when the
  site has revenue rather than adding a fifth (decide which in the ticket: on Pages likely
  engaged time, on Locations bounce rate). Revenue per visitor is revenue / visitors on the row,
  formatted with fmtRevenue; the audit in TICKET-055 is the reference for what a clean table
  carries.
- Small and self-contained; the owner asked for it to be queued as ready to start.

## Plan
- [ ] Pages: add `revenue` to the view metrics when kpi.hasRevenue; a "Rev / visitor" column computed from the row; keep four columns.
- [ ] Locations: the same on the countries table.
- [ ] Mock the two tables with the seeded numbers and look before coding (D-010).
- [ ] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e (pages and locations specs).

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** nothing
- **Next:** —
- **Read first:** lib/screens/sources.ts (how revenue is added), lib/screens/pages.ts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
