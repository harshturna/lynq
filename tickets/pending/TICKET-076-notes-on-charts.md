# TICKET-076: Notes on charts

**Status:** pending
**Created:** 2026-09-06
**Started:** —
**Completed:** —
**Area:** feature

## Goal
A site owner can pin a dated note ("Launched on Product Hunt", "Deployed v2") that shows as a marker on every time chart, and a deploy pipeline can post the same note through a small API, so a change in the numbers can be read against what happened.

## Context
- From the DataFast review; Phase 3 in the roadmap ("deploy markers arrive through the same
  notes API from your own CI, no provider integration", per the owner's no-third-party rule).
  Nothing exists yet: no table, no API, no marker in lib/charts. The lead chart is ECharts
  (lib/charts/*, components/charts/charts.tsx); a marker is a markLine or a small glyph on the
  x axis with the note on hover and in the sr-only table.
- Storage: public.notes (site_id, at, text, author, created_at) with RLS like goals; a notes
  API needs the same site-key decision as TICKET-075.
- Design first (D-010): the marker's look on the light chart, the add-note control (from the
  chart or from settings), editing and deletion.

## Plan
- [ ] Design section and mock.
- [ ] Table and migration; actions to add, edit, delete; the API once site keys exist.
- [ ] Markers on the lead chart and the goal trend; announcements and the hidden table.
- [ ] Verify: npm run verify; npm run test:integration; npm run test:e2e.

## Progress log
- 2026-09-06 — Created from the DataFast follow-up review.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** not started
- **Blocked on:** a Phase 3 design section; the API part on the site-key decision (TICKET-075)
- **Next:** —
- **Read first:** components/charts/charts.tsx, lib/charts

## Verification
Filled in on completion. The command that was run, in a code block, and its result.

## Outcome
Filled in on completion: what shipped, what was deliberately left out, follow-up tickets created.
