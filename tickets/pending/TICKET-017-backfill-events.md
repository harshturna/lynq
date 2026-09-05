# TICKET-017: Backfill the old tables into analytics.events

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
Move all historical data into the events table with the mappings and approximations stated in design §10.

## Context
- Design §10 (mapping table, approximations, --until, idempotent wipe, dry-run, batching), §5.3
  (legacy visitor id).
- Depends on TICKET-015, deployed 2026-09-05. `--until 2026-09-05T15:26:54.220Z` (first adapter row in
  production).
- Legacy country names must map to ISO codes with i18n-iso-countries; print unmapped names. Heap
  sizes and interaction count are not carried.
- Runs from a laptop with the pooler URL; never from CI.

## Plan
- [ ] `scripts/backfill-events.mjs --site --until --dry-run` per §10.
- [ ] Dry run against production; review the unmapped-country and orphan reports.
- [ ] Real run; record counts per table on both sides here.
- [ ] Verify: counts match the old tables within the stated approximations; `npm run verify`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).

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
