# TICKET-039: Locations screen

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
/[site]/locations renders countries with flags, the region and city drill-down for the selected country, the country-by-hour heatmap and the languages table.

## Context
- Design §8.5, §9.7, rule 7 degradation (a country chip shows regions), §12 thresholds and the 3-hour bucketing under 640 px. Depends on TICKET-033, TICKET-034, TICKET-035.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] lib/screens/locations.ts; route; drill-down via sel; heatmap; languages.
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
