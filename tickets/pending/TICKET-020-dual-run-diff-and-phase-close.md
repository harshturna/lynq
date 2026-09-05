# TICKET-020: Dual-run, diff and Phase 0 close-out

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
Run v1 and v2 side by side on Lynq's own site for seven days, diff the three stores daily, and close Phase 0 with an attributed report.

## Context
- Design §11 (steps, exit criteria, what is reported vs gated), §14 (health checks in the report).
- Depends on every other Phase 0 ticket.
- The Supabase side reads directly with the service role, not through getAnalytics; visitors are
  count(distinct client_id) from sessions.

## Plan
- [ ] `scripts/diff-stores.mjs` per §11 step 3, including suspect and reject counts, countIf(path=''),
      pg_ingest_failures, partition and mutation health.
- [ ] Add the v2 snippet to Lynq's own site alongside v1.
- [ ] Run daily for seven days; log each day's result here.
- [ ] Close-out report in this ticket's Outcome: every discrepancy attributed, exit criteria met or
      not. Verify: the seven daily runs.

## Progress log
- 2026-09-05 — Created from the Phase 0 design (TICKET-011, D-004, D-005).

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
