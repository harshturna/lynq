# TICKET-083: The Locations layout cannot carry another column

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** ui

## Goal
The countries table can show a fourth number, so revenue per visitor and anything added later is visible on the screen rather than only in the drawer. Deciding that it is not worth a layout change is an acceptable outcome.

## Context
- Found in TICKET-073. Countries, Regions and Cities share a three-column grid in
  `app/(main)/[website_slug]/locations/_locations/tables.tsx`, so a country's column is about
  410 px wide. It carries the label, Visitors, the compare change and the KPI goal today. Adding
  one more numeric column squeezes the label until only the flag renders and the "Country" header
  collides with "Visitors"; adding two clips the table. Screenshots were taken during TICKET-073.
- Because of that, revenue and revenue per visitor were added to the Locations full column set
  (the Show-all drawer and the CSV) and deliberately left out of the compact table.
- Options to weigh: countries full width above a two-column Regions and Cities row; a metric
  switcher on the countries table (which D-013 rejected for the general case, but this is one
  table); or accepting the drawer as the home for extra numbers, which costs nothing.
- D-013 governs: at most four numeric columns, the label column 220 to 320 px, and what a table
  no longer shows lives in the row panel, the drawer and the CSV.

## Plan
- [ ] Mock the alternatives at 1280 and 375 with real numbers, and look before choosing (D-010).
- [ ] If a layout changes, update the Locations e2e and check no page overflow at 375.
- [ ] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e.

## Progress log
- 2026-09-06 — Created from TICKET-073.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** nothing
- **Next:** —
- **Read first:** app/(main)/[website_slug]/locations/_locations/tables.tsx, tickets/DECISIONS.md D-013

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
