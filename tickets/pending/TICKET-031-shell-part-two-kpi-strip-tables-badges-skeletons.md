# TICKET-031: Shell part two: KPI strip, tables, badges, skeletons

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
KpiStrip, Section, DataTable with the full §6 semantics, Badge, Pill, RowBar and skeletons exist, plus a development-only preview route that renders each with sample data.

## Context
- Design §6 (DataTable: aria-sort on every header, tablist captions as links, aria-current rows, sub-rows with aria-expanded, roving row tabindex with Enter / F / Shift+Enter, the always-tabbable Filter button, delta columns when compare is on, Show all drawer plain under 300 rows else virtualised grid with aria-rowcount, hidden secondary columns under 1000 px, scrollable regions with tabindex and role), KpiStrip as a radiogroup with explicit → links, Badge and Pill glyphs, RowBar.
- Design §12 (skeletons match the final layout; zero denominators render —). Depends on TICKET-028, TICKET-029, TICKET-030.
- Preview route app/(dev)/ui/page.tsx gated to NODE_ENV=development, used by the responsive and accessibility pass (TICKET-047).
- Ruled out: share bars inside tables (D-008).
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] KpiStrip (radiogroup, snapping row under 480 px), Section, Badge, Pill, RowBar.
- [ ] DataTable with every §6 behaviour; Show all drawer with the §6 dialog and history rules; CSV export helper.
- [ ] Skeleton variants for strip, chart area and table.
- [ ] Preview route with sample data for each component.
- [ ] Unit tests on sorting, roving focus, the Filter button reachability, drawer focus return; verify: npm run verify.

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
