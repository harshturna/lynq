# TICKET-020: Transition, diff and Phase 0 close-out

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
Run v1 and v2 side by side on Lynq's own site for a day, diff the stores, and close Phase 0 with an attributed report.

## Context
- Design §11 (steps and what is reported vs gated).
- Depends on every other Phase 0 ticket.
- The old-table side reads directly with no row cap; visitors are count(distinct client_id) from
  sessions.

## Plan
- [ ] `scripts/diff-events.mjs` per §11 step 3, including suspect counts, ingest_log counts by stage,
      and count(*) filter (where path = '').
- [ ] Add the v2 snippet to Lynq's own site alongside v1 for a day.
- [ ] Close-out report in this ticket's Outcome: every discrepancy attributed; the cutover date
      recorded for the Phase 2 annotations table. Verify: the diff run.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).

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
