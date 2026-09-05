# TICKET-042: Goals screen and goal form

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/[site]/goals lists goals with the KPI star, shows the selected goal's tiles, funnel, conversion dot plot and trend, and lets an owner create, edit and delete goals and set the KPI.

## Context
- Design §8.8, §9.6 (goalStats, funnel), §11 (public.goals, kpi_goal_id upsert), guest writes rejected (§4). Depends on TICKET-033, TICKET-034, TICKET-035.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] lib/screens/goals.ts; route; goal form as a dialog with server actions; KPI toggle.
- [ ] Verify: npm run verify; integration; guest walk-through (creation rejected with a notice for the guest, succeeds for a real user in a local test).

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
