# TICKET-016: Query foundations: authorize, ranges, sessions, primitives, filters

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** quality

## Goal
The typed query layer Phase 1 will build screens on: authorization seam, ranges with timezone, session definitions, the four primitives, and the filter compiler.

## Context
- Design §6.3 (definitions), §9 (all subsections: QueryContext, ranges and granularity, primitives
  incl. `rows`, filters with sessionWhere and the AND/OR rule, authorize seam), §16 (query
  shapes to validate against).
- Depends on TICKET-012 (read client) and TICKET-013 (authorizeWebsite returning the site id).
- Today's dashboard logic to be reproducible: lib/utils.ts groupByAnalytics, applyFilters (OR
  within, AND across), process*Data bucketing, calculateBounceRate; lib/actions.ts
  getAnalytics/getPeriodComparison.
- Only site_settings.timezone is read here; the UI for it is Phase 1.

## Plan
- [ ] `lib/query/authorize.ts` with the session-user principal; `ranges.ts` (rolling and calendar
      ranges, compare, granularity, timezone via toStartOfInterval).
- [ ] `sessions.ts`: the §6.3 definitions as reusable SQL fragments.
- [ ] `filters.ts`: allow-list, rowWhere and sessionWhere keyed on (visitor_id, session_id), AND/OR
      rule.
- [ ] `timeseries`, `breakdown` (with total, entry/exit as session dimensions), `summary` (range and
      compare), `rows` (events, session, sessions).
- [ ] Integration tests on fixtures for every primitive, the repair rules, suspect exclusion, p75 with
      mapContains. Verify: `npm run verify`, `npm run test:integration`.

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
