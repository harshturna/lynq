# TICKET-035: Overview on the new shell

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/[site] renders the approved Overview on the new shell and charts, reading through lib/screens/overview.ts, and the old dashboard code is deleted.

## Context
- Design §8.0 (KPI states), §8.1, §10 (getOverviewScreen with settled section promises awaited in server children under Suspense, aria-busy, timeouts, compare failure handling), §12 (states), §15 (everything deleted here: cobe and the globe, recharts and chart.tsx, framer-motion and tailwindcss-animate, the old _components, lib/dashboard.ts and dashboard-types.ts, DatePickerValues and datePickerValues, the is_first_visit guest skip).
- Depends on TICKET-030 to TICKET-034. The guest write guard in lib/actions.ts stays.
- Walk-through: Playwright as guest on a local next start across the ranges, then live after deploy.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] lib/screens/overview.ts with settle(); app/(main)/[website_slug]/page.tsx and section components.
- [ ] KPI strip in all three KPI states; lead chart driven by the checked tile; goal and devices panels; three tables with regions; vitals strip.
- [ ] Delete the §15 list; remove the dependencies; npm uninstall.
- [ ] Verify: npm run verify; npm run test:integration; npm run test:e2e; npm run build; guest walk-through; live check after deploy.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).

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
