# TICKET-053: Remove the Sources quadrant

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
The Sources screen opens on its summary strip and goes straight to the tables; the quadrant
chart and its code are gone.

## Context
- Owner review 2026-09-06: "a 2010 chart". Replacements were mocked (a dot plot against the
  site average, three standouts in words, a stripped scatter, a channel split line) and each
  rejected, the last because its bar repeats the Channels table's Share column. Decision:
  nothing in its place (D-012).
- Removed, since only the quadrant used them: lib/charts/quadrant.ts, `Quadrant` in
  components/charts/shapes.tsx, `quadrantThreshold` and `MIN_QUADRANT_SOURCES` in
  lib/charts/thresholds.ts, `GraphicComponent` in lib/charts/echarts.ts (its corner labels
  were the only graphic), the `quadrant` query and `QuadrantData` in lib/screens/sources.ts,
  app/(main)/[website_slug]/sources/_sources/quadrant.tsx, `QuadrantSection`, the skeleton
  row in loading.tsx, the preview page's section, the unit tests, the e2e heading assertion.
- Settings' Goals-and-KPI lede mentioned the quadrant; reworded.

## Plan
- [x] Delete the files and references above; typecheck clean; no "quadrant" left in lib, app,
  components or tests.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e.

## Progress log
- 2026-09-06 — Created and started; D-012.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed.
- **Blocked on:** nothing
- **Next:** TICKET-054, the table rebuild (D-013)
- **Read first:** lib/screens/sources.ts

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:e2e
```
verify: lint, typecheck, ticket check, 33 files / 149 unit tests (3 quadrant tests removed).
e2e: 57 passed in 2.3 min; the Sources flow no longer asserts the lead heading.

## Outcome
Shipped: the quadrant and every piece of code that existed for it are gone; the Sources
screen is the strip and the tables. Left out: nothing. Follow-up: TICKET-054 (D-013).
