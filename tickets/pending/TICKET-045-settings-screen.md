# TICKET-045: Settings screen

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/[site]/settings renders the single scrolling settings page with its sub-nav and saves each section through server actions as upserts, including the ingest diagnostics panel.

## Context
- Design §8.10, §8.11 (diagnostics wording per ingest_log stage), §11 (site_settings columns: kpi_goal_id, retention_months, breakpoints, shortcuts), guest writes rejected. Depends on TICKET-034, TICKET-035, TICKET-042 (goal select).
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] lib/screens/settings.ts; route; sections and forms; server actions with upserts, optimistic UI, toasts; typed delete confirmation.
- [ ] Verify: npm run verify; integration on the upserts; guest walk-through.

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
