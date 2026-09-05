# TICKET-029: URL state module

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
lib/url-state.ts parses and writes every dashboard view parameter (range, compare, filters, per-region view and sort, selection, session drawer, device) with tests for round-trips and malformed input.

## Context
- Design §5 (parameter table, chip scopes, the API: ViewState, parseSearch, toSearch, withFilter, withoutFilter, withParam).
- Next 16 searchParams arrive as string | string[] | undefined per key; a single repeated key is a bare string.
- Dimensions are validated against ROW_DIMENSIONS, SESSION_DIMENSIONS and the prop: form in lib/query/filters.ts so compileFilters never throws on user input; the entry_* dimensions arrive with TICKET-027 and are added to the allow-list then.
- toSearch writes keys in a fixed order (Share copies it; the router dedupes on it). No UI in this ticket.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] Write lib/url-state.ts with the §5 API and types.
- [ ] Unit tests: every param round-trips; repeated and single f; | in values; malformed op, dimension, range and dates are ignored; stable key order; withFilter OR-merges within a dimension.
- [ ] Verify: npm run verify.

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
