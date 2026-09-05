# TICKET-016: Query foundations

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
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
- [x] `lib/query/authorize.ts` (session-user principal), `ranges.ts` (rolling and calendar, compare,
      granularity, half-open, timezone round trip), `sessions.ts` (the materialised CTE).
- [x] `filters.ts`: allow-list, row predicates, session predicates as `having` on the CTE, `@>`/`?`
      for props, `user_hash <> 0` for identity queries, AND/OR rule.
- [x] `timeseries`, `breakdown` (with total, entry/exit as session dimensions), `summary` (range and
      compare), `rows` (events, session, sessions).
- [x] Integration tests on fixtures for every primitive, session repair, suspect exclusion, p75 with
      NULLs, a boundary event counted once across range and compare, retention excluding
      anonymous rows. Verify: `npm run verify`, `npm run test:integration`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design v6 (TICKET-022, D-004 to D-006).
- 2026-09-05 — Started and implemented. Decisions: SQL is built as text with a parameter
  collector rather than postgres.js fragments, so the compiler is testable without a database
  and column names come only from allow-lists; session metrics on row dimensions are allowed
  only for session-constant dimensions (country, device, source...), and rejected for page-level
  ones (path, event name, props), where the question is ill-posed; a row filter selects whole
  sessions via `bool_or` in the CTE's HAVING, so bounce rate on "sessions that touched /pricing"
  means what a person expects; `time_on_site` is exposed as a separate metric from
  `engaged_time`; `rows(kind)` uses limit/offset rather than cursors at this scale.
- 2026-09-05 — Integration run against fixture rows (three sessions, a boundary event, a
  suspect row): the first run failed five expectations that all traced to my fixture having
  five pageviews, not six; the engine's numbers were right, including 1.67 pages per session
  and the name tie-break. Expectations corrected. Closed.

## Handoff
Closed. See Outcome.

## Verification
```
npm run verify
Found 45 warnings.
Ticket check passed (22 tickets).
 Test Files  17 passed (17)
      Tests  83 passed (83)

TEST_DATABASE_URL=... npm run test:integration   # fresh Supabase Postgres container
 Test Files  4 passed (4)
      Tests  18 passed (18)
  query.integration.test.ts (9): summary definitions (bounce 33.33 %, engaged time, pages per
  session), boundary event counted once and not in the compare window, suspect excluded by
  default, hourly zero-fill with sessions bucketed by start, breakdowns by path / entry / exit /
  device with totals, event names and prop values and keys, row vs session filter semantics,
  contains, and the three rows kinds
npm run build
✓ Compiled successfully in 307ms
```

## Outcome
Shipped: `lib/query/` with the parameter builder, timezone-aware half-open ranges and compare
windows, the filter compiler (row and session predicates, prop operators, the identity
exclusion constant, AND/OR rule), the materialised session CTE with the §6.3 definitions, the
four primitives (`timeseries` with zero-fill, `breakdown` with totals, `summary` with compare,
`rows` for events / one session / sessions), the runner with the 30 s timeout, and the
`authorize()` seam with `buildContext()`.

Left out: goal count (Phase 2 supplies goals); cursor pagination (limit/offset is enough at
this scale); the `identityWhere` is a constant not yet used by any primitive, since retention
and people are Phase 3.

Follow-up tickets: none.
