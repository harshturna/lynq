# TICKET-047: Accessibility and responsive pass, e2e per screen

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** quality

## Goal
Every screen is checked with a screen reader and at 375 px against the design's §6, §7, §12 and §13 contracts, defects are fixed, and the e2e suite gains one flow per screen.

## Context
- Design §6, §7, §12, §13; the preview route from TICKET-031; Playwright with axe-core for automated checks; VoiceOver for the manual pass. Depends on every screen ticket.
- Known from TICKET-030's walk-through at 390 px: the TopNav's More trigger is clipped by a
  few pixels and the LYNQ wordmark still showed although it is `hidden sm:inline`; check the
  row's overflow and the wordmark rule on a real device width first.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] Automated axe pass on every route in e2e; fix violations.
- [ ] Manual VoiceOver pass: tables, chips, drawers, calendar, charts' descriptions and table equivalents; fix defects.
- [ ] 375 px pass on every screen; fix breakages.
- [ ] One e2e flow per screen (load, filter, select, share URL round-trip).
- [ ] Verify: npm run verify; npm run test:e2e.

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
