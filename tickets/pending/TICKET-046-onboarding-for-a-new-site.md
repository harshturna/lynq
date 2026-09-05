# TICKET-046: Onboarding for a new site

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/sites/new walks a new site through install, the live first-event check with diagnostics, and the KPI pick, and the Overview shows the waiting state until ten pageviews exist.

## Context
- Design §8.11, §10 (polling /api/live every 3 s), §12 (no data at all). Depends on TICKET-044 (live route), TICKET-045, TICKET-042. Replaces setup-dialog.tsx and the is_first_visit gate (dropped in TICKET-034).
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] Route and the three steps; polling; diagnostics from ingest_log; KPI suggestions creating a goal.
- [ ] Verify: npm run verify; e2e: a fresh site receives its first pageview from the fixture server and the step turns green.

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
