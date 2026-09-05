# TICKET-041: Events screen and the session drawer

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/[site]/events renders the events table, the selected event's trend, property breakdowns, recent occurrences and paths to the event, and the session drawer opens from any screen via the session param.

## Context
- Design §8.7, §9.9 (pathsTo), §4 and §6 (drawer: dialog semantics, inert, history rule, reload focus), rows(ctx, 'session') exists. Depends on TICKET-033, TICKET-034, TICKET-035.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] lib/screens/events.ts; route; drawer component and its url-state wiring; paths list.
- [ ] Verify: npm run verify; integration; guest walk-through including the drawer's back/forward behaviour.

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
