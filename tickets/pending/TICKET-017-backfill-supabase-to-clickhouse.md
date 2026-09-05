# TICKET-017: Backfill Supabase into ClickHouse

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** infra

## Goal
Move all historical Supabase event data into ClickHouse with the mappings and approximations stated in design §10.

## Context
- Design §10 (mapping table, approximations, --until, mutation polling, dry-run, batching), §5.3
  (legacy visitor id).
- Depends on TICKET-015 being deployed: `--until` is its deploy timestamp.
- Legacy country names must map to ISO codes with i18n-iso-countries; print unmapped names.
- Runs from a laptop with the service-role key and the ClickHouse admin credentials; never from
  CI.

## Plan
- [ ] `scripts/backfill-clickhouse.mjs --site --until --dry-run` per §10.
- [ ] Dry run against production; review the unmapped-country and orphan reports.
- [ ] Real run; record counts per table on both sides in this ticket.
- [ ] Verify: counts match the Supabase export within the stated approximations; `npm run verify`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design (TICKET-011, D-004, D-005).

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
