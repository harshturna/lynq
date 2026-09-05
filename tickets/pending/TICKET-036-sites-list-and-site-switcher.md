# TICKET-036: Sites list and site switcher

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/sites lists the user's sites as a table with 30-day visitors, KPI completions, last event and a status pill; /dashboard redirects to it; the site switcher in TopNav targets it.

## Context
- Design §8.12, §4. Depends on TICKET-035. lib/query/site-visitors.ts (TICKET-024) becomes the per-site query with sparkline buckets, KPI completions and last event time.
- Add a site links to /sites/new (TICKET-046); until then it links to the existing setup flow.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] lib/screens/sites.ts; app/(main)/sites/page.tsx; redirect from /dashboard; switcher wiring.
- [ ] Verify: npm run verify; npm run test:integration; guest walk-through.

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
