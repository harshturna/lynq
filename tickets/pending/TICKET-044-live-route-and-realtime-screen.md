# TICKET-044: Live route and Realtime screen

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/api/live/[site] serves realtime data outside the auth proxy, and /[site]/realtime renders visitors now, the 30-minute bars, live pages, sources, countries and the activity feed with the polling and pause rules.

## Context
- Design §8.2 (5-minute now, pause control, feed not a live region, throttled status, back-off, saveData, stop after 15 minutes), §9.4 (realtime primitive on received_at), §10 (route handler verifies the session itself; proxy.ts negative lookahead; unauthenticated handling with the banner). Depends on TICKET-034, TICKET-035.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] Route handler with session check and discriminated result; proxy matcher entry.
- [ ] lib/screens/realtime.ts; route; polling hook with pause, back-off, hidden-tab pause, saveData, 15-minute stop; feed with the new-events button.
- [ ] Verify: npm run verify; integration; a live check with the tracker running against a local server.

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
