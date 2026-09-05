# TICKET-040: Devices screen

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/[site]/devices renders the device split, browsers with version sub-rows, operating systems, the viewport-width histogram with the site's breakpoints, and the browser-by-OS matrix.

## Context
- Design §8.6, §9.3, §9.8, §11 (viewport columns and site_settings.breakpoints). Depends on TICKET-033, TICKET-034, TICKET-035. Rows without viewport data fall back to screen width and the panel says so.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] lib/screens/devices.ts; route; split bar; tables with sub-rows; histogram; matrix.
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
