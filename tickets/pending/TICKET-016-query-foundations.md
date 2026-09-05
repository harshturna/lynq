# TICKET-016: Query foundations

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** quality

## Goal
The typed query layer Phase 1 will build screens on: authorization seam, half-open ranges with timezone, the session CTE, the four primitives, and the filter compiler.

## Context
- Design §6.3 (session CTE and definitions), §9 (QueryContext, ranges, primitives incl. rows,
  filters with session predicates, prop operators, user_hash <> 0, AND/OR, authorize seam), §16
  (query shapes to validate against, including the corrected realtime, paths, attribution and
  grouping-sets forms).
- Depends on TICKET-012 and TICKET-013 (authorizeWebsite returning the site id).
- Today's dashboard logic to be reproducible: lib/utils.ts groupByAnalytics, applyFilters (OR
  within, AND across), process*Data bucketing, calculateBounceRate; lib/actions.ts
  getAnalytics/getPeriodComparison.
- `between` must not appear in this directory; `->>` must not appear in a where clause.

## Plan
- [ ] `lib/query/authorize.ts` (session-user principal), `ranges.ts` (rolling and calendar, compare,
      granularity, half-open, timezone round trip), `sessions.ts` (the materialised CTE).
- [ ] `filters.ts`: allow-list, row predicates, session predicates as `having` on the CTE, `@>`/`?`
      for props, `user_hash <> 0` for identity queries, AND/OR rule.
- [ ] `timeseries`, `breakdown` (with total, entry/exit as session dimensions), `summary` (range and
      compare), `rows` (events, session, sessions).
- [ ] Integration tests on fixtures for every primitive, session repair, suspect exclusion, p75 with
      NULLs, a boundary event counted once across range and compare, retention excluding
      anonymous rows. Verify: `npm run verify`, `npm run test:integration`.

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
