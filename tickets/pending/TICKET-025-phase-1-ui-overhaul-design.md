# TICKET-025: Phase 1 design: the app shell and overview

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
A reviewed design for the UI overhaul (roadmap Phase 1): design tokens and both themes, sidebar shell with site switcher, top bar with range picker, compare and URL-synced filters, the Overview / Pages / Sources / Locations / Devices / Realtime screens, and onboarding.

## Context
- Roadmap artifact (UI overhaul section and Phase 1); D-001; the query layer's actual surface in
  lib/query after TICKET-023.
- Same method as Phase 0: written design, Opus reviews, revisions, owner sign-off, then
  implementation tickets. Charting library decision (ECharts vs alternatives) is an expensive-
  to-reverse choice and gets a D-NNN.
- Depends on TICKET-023 and TICKET-024.
- Load time to design for (measured in TICKET-023 on the 12-month range against production):
  getDashboard() fans out ~16 queries, ~1.5 s of database time with four pooled connections
  and ~2.5 s end to end for a range change. The new data loading (per-card fetching, caching,
  fewer round trips) is part of this design, not a separate ticket.

## Plan
- [ ] Write docs/design/phase-1-ui-overhaul.md.
- [ ] Review passes (design, information architecture, accessibility, implementation).
- [ ] Owner sign-off; decisions recorded; implementation tickets opened.

## Progress log
- 2026-09-05 — Created (D-007, Phase 1 opening).

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
