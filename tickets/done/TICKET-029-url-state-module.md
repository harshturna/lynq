# TICKET-029: URL state module

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
lib/url-state.ts parses and writes every dashboard view parameter (range, compare, filters, per-region view and sort, selection, session drawer, device) with tests for round-trips and malformed input.

## Context
- Design §5 (parameter table, chip scopes, the API: ViewState, parseSearch, toSearch, withFilter, withoutFilter, withParam).
- Next 16 searchParams arrive as string | string[] | undefined per key; a single repeated key is a bare string.
- Dimensions are validated against ROW_DIMENSIONS, SESSION_DIMENSIONS and the prop: form in lib/query/filters.ts so compileFilters never throws on user input; the entry_* dimensions arrive with TICKET-027 and are added to the allow-list then.
- toSearch writes keys in a fixed order (Share copies it; the router dedupes on it). No UI in this ticket.
- Read on start: lib/query/filters.ts exports `Filter = { dimension; op; values }`,
  `ROW_DIMENSIONS` (21 keys), `SESSION_DIMENSIONS` (entry_path, exit_path, bounced), `propKey()`
  (accepts `prop:<key>` with a key of 1 to 32 characters) and `isRowDimension` /
  `isSessionDimension`; lib/query/ranges.ts exports `Range` (nine presets or `{from, to}` as
  YYYY-MM-DD inclusive dates in the site timezone) and `CompareMode`. The entry_* dimensions
  are added to the allow-list when TICKET-027 lands; until then parseSearch drops them like any
  unknown dimension.
- Encoding: `f=dimension:op:value1|value2`; values are URL-encoded by URLSearchParams, and a
  literal `|` or `:` inside a value is percent-encoded by toSearch before joining so the split
  is unambiguous (`%7C`, `%3A`). Custom ranges as `range=2026-08-06,2026-09-04`; a reversed
  or invalid pair is ignored. `sort.<region>=-visitors` means descending.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] Write lib/url-state.ts with the §5 API and types.
- [x] Unit tests: every param round-trips; repeated and single f; | in values; malformed op, dimension, range and dates are ignored; stable key order; withFilter OR-merges within a dimension.
- [x] Verify: npm run verify.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; encoding details and the current filters.ts surface added to Context.
- 2026-09-05 — lib/url-state.ts and its 15 tests landed. One catch: `prop:<key>` dimensions carry a
  colon of their own, so parseFilter reads the dimension as two segments when the raw string
  starts with `prop:`. Added helpers beyond the design's list because the shell will need them
  (toQuery, hasFilter, withView, withSort, defaultState, isKnownDimension).

## Handoff
Closed; next is TICKET-030 (shell part one).

## Verification
```
npx vitest run lib/url-state   # 15 tests pass: defaults and garbage, presets and custom ranges (reversed, non-dates),
                               # single vs repeated f, | and encoded separators, unknown dimensions and ops dropped,
                               # prop and session dimensions kept, OR-merge and dedupe, namespaced view/sort,
                               # sel/session/device validation, hostile input never throws, stable key order,
                               # full round-trip, helper semantics, empty-part rejection
npm run verify                 # lint 0 errors (42 warnings, unchanged), typecheck, tickets, 99 unit tests pass
```

## Outcome
Shipped: lib/url-state.ts with `ViewState`, `parseSearch` (never throws; validates every
dimension against filters.ts; normalises Next's string-or-array params), `toSearch` /
`toQuery` (defaults omitted, fixed key order, separators inside values percent-encoded),
`withFilter` (OR-merge), `withoutFilter`, `hasFilter`, `withParam`, `withView`, `withSort`,
`defaultState`, `isKnownDimension`; lib/url-state.test.ts. No UI. Left out: nothing.
Follow-ups: TICKET-027 adds the entry_* dimensions to filters.ts, which this module then
accepts without change.
