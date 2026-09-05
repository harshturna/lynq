# TICKET-043: Performance screen

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/[site]/performance renders the p75 strip with status and deltas, the device segment, LCP by device with the threshold, the worst-first page table, the what-is-slow panel and the LCP distribution.

## Context
- Design §8.9, §9.10 (vitalsBreakdown, vitals timeseries by device). Depends on TICKET-033, TICKET-034, TICKET-035.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] lib/screens/performance.ts; route; strip; chart; table; panel; histogram.
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
