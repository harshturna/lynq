# TICKET-038: Sources screen

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/[site]/sources renders the KPI strip in its three states, the quadrant, and the Channels, Sources/Referrers and Campaigns tables on session-entry attribution.

## Context
- Design §8.0, §8.4, §9.1 (TICKET-027), §9.2 (revenue, payments, goal metrics). Depends on TICKET-033, TICKET-034, TICKET-035. Removes the synthetic Direct row added in TICKET-023.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] lib/screens/sources.ts; route; quadrant with the KPI-state fallback; three tables.
- [ ] Verify: npm run verify; integration; guest walk-through.

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
