# TICKET-051: Filter announcements carry the count and the visitor total

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
Every filter change is announced the way design §6 specifies, "Removed Country is Canada.
2 filters. 3,201 visitors.", instead of the sentence alone.

## Context
- Found while writing the Overview e2e in TICKET-047: the status region says "Added Page is
  /pricing." and stops. The nine call sites (`grep -rn "announce(\`Added" app components`)
  and components/shell/filter-chips.tsx compose the sentence themselves; none has the visitor
  total, which comes from each screen's KPI data after the transition settles.
- Design §6 (announcements), §10 (pending state). components/shell/view-state.tsx owns the
  single role="status" region and `useAnnounce()`.
- One shape: `announce` takes the sentence, and the ShellProvider appends the filter count from
  the next URL state and the visitor total from a small context the screens' KPI strips
  publish. Decide in the ticket; keep the nine call sites untouched if the provider can do it.

## Plan
- [x] Read view-state.tsx, filter-chips.tsx, filter-builder.tsx and two row-filter call sites.
- [x] Choose where the count and total come from (Context).
- [x] view-state.tsx: signature at queue time, append count and total on settle; `VisitorTotal` marker; render it on Overview, Sources, Locations; chips and builder drop their own count.
- [x] Unit test the provider composition (view-state.test.tsx); update filter-chips.test; update the Overview e2e expectation.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e.

## Progress log
- 2026-09-05 — Created from TICKET-047.
- 2026-09-06 — Started; provider-side composition chosen (Context).
- 2026-09-06 — Built and tested; the Overview e2e now expects "Added Page is /pricing. 1 filter. N visitors."

## Handoff
Closed; see Verification and Outcome.

## Verification
```
npm run verify                                 # lint, typecheck, ticket check, 155 unit tests: pass
TEST_DATABASE_URL=... npm run test:e2e         # 61 passed (2.3 m); overview.spec asserts the full sentence
```
components/shell/view-state.test.tsx covers the wording and the provider (count and total
appended only when the filter set changed across the transition).

## Outcome
Shipped: `withFilterSummary` and the signature check in `components/shell/view-state.tsx`;
`components/shell/visitor-total.tsx` rendered by the Overview lead, the Sources strip and the
Locations countries table; the chips and the builder no longer append the count themselves;
tests. Left out: a visitor total on Pages, Devices, Events, Performance and Realtime, which
have no summary to take it from (they announce the sentence and the count). No follow-ups.
