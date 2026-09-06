# TICKET-052: Attention line replaces the Pages treemap

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
The Pages screen opens on one quiet line, a split bar of pageviews across the top pages with
a sentence on concentration and dwell, instead of the treemap the owner rejected as messy.

## Context
- Owner feedback 2026-09-06 on the treemap: truncated titles, two numbers per cell, an
  "everything else" block, rounded tiles; "looks messy". Ranked-bar variants were rejected as
  repeating the table below. The approved mock is
  https://claude.ai/code/artifact/be8f3c23-a39a-4b0f-bc19-dd8eced06864 (D-011).
- The line reuses `SplitBar` (components/shell/views.tsx, the Devices split) with the top six
  pages plus "N other pages", and a sentence built by a pure helper next to the screen:
  share of the top three, longest and shortest engaged time among the shown pages.
- Removed with the treemap, since nothing else uses them: lib/charts/treemap.ts, `Treemap` in
  components/charts/shapes.tsx, `treemapThreshold` in lib/charts/thresholds.ts, the
  `TreemapChart` registration in lib/charts/echarts.ts, their unit tests, the preview page's
  two treemap sections. Design §7 and §8.3 still describe the treemap; D-011 records the change,
  the design doc is not rewritten (it is the v4 record).
- Files: app/(main)/[website_slug]/pages/_pages/{table.tsx, attention.tsx, attention.ts,
  attention.test.ts}, app/(main)/[website_slug]/pages/page.tsx (comment), the files above,
  tests/e2e/app/pages.spec.ts (assert the line), lib/charts/shapes.test.ts.

## Plan
- [x] `attention.ts`: `attentionSummary(rows, pageviews, shown = 6)` → segments and the sentence's
  facts; unit tests for the rest segment, ties, and fewer rows than shown.
- [x] `attention.tsx`: Section "Where the attention goes", qualifier "share of N pageviews",
  SplitBar with seven teal steps, the sentence; nothing under two pages.
- [x] table.tsx: swap the treemap section for the line on the All view; delete the treemap code
  and tests listed in Context; preview page loses its treemap sections.
- [x] e2e: pages spec asserts the line's `img` name and the sentence.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e.

## Progress log
- 2026-09-06 — Created from the owner's review of the Pages screen; D-011.
- 2026-09-06 — Started. SplitBar gains a `ramp` option (seven teal steps via color-mix) since its four device classes do not stretch to seven segments.
- 2026-09-06 — Landed. Looked at the real screen at 1280 and 375 px against the mock: same shape; the legend keeps SplitBar's one-decimal share as Devices does.

## Handoff
Kept current while the ticket is in progress. Overwrite, do not append.
- **State:** Closed.
- **Blocked on:** nothing
- **Next:** TICKET-051 or Phase 2 planning
- **Read first:** app/(main)/[website_slug]/pages/_pages/table.tsx; components/shell/views.tsx SplitBar

## Verification
```
npm run verify
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres npm run test:e2e
```
verify: lint, typecheck, ticket check, 33 files / 152 unit tests (4 new for attentionSummary,
3 treemap tests removed). e2e: 57 passed in 2.2 min; the Pages flow now asserts the line's
image name and the sentence. Screenshots of the real screen at 1280 and 375 px reviewed
against the approved mock.

## Outcome
Shipped: the attention line on the Pages All view (split bar of the top six pages plus the
rest, the sentence on concentration and dwell), SplitBar's `ramp` shading, and the removal
of the treemap, its threshold, its ECharts registration, its tests and its preview sections.
Left out: nothing. The design doc's §7 row and §8.3 are superseded by D-011, not rewritten.
