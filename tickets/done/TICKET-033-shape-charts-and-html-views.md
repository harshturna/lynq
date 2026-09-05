# TICKET-033: Shape charts and HTML views

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
Treemap, quadrant, heatmap, histogram and dot plot option builders exist with their table equivalents and width thresholds, and the HTML views (FlowPanel, Funnel, PathList, Matrix, SplitBar) exist.

## Context
- Design §7 (the chart table: treemap with visualMap and an everything-else leaf and --ink labels; quadrant scatter with symbolSize, markLine averages, corner labels as graphic; heatmap on a 24-column axis with 3-hour bucketing under 640 px; histogram bars with per-band itemStyle and breakpoint markLines; dot plot on a category axis), §12 (thin-data and width thresholds as tested constants), §13.
- Depends on TICKET-032. HTML views use RowBar, tokens and semantic markup from §7 (Funnel as an ol with drop-off text, PathList as nested ols, Matrix as a real table with row and column headers, SplitBar as role=img).
- Read on start: TICKET-032 registered TreemapChart, ScatterChart and HeatmapChart plus
  VisualMap and MarkLine already, so no new ECharts modules; lib/charts/theme.ts exports
  TOKENS and RAMP; components/charts/chart.tsx takes an option, a description and a table
  equivalent; HiddenTable renders the accessible table. RowBar lives in
  components/shell/section.tsx.
- Decisions (routine): builders live in lib/charts (treemap.ts, quadrant.ts, heatmap.ts,
  histogram.ts, dotplot.ts) with the thresholds beside them in lib/charts/thresholds.ts
  (MIN_TREEMAP_PAGES 4, MIN_QUADRANT_SOURCES 3, MIN_HEATMAP_SESSIONS 30, MIN_HISTOGRAM_SAMPLES
  50, MIN_FUNNEL_SESSIONS 10; widths TREEMAP_MIN_WIDTH 600, HEATMAP_MIN_WIDTH 700,
  HEATMAP_BUCKET_BELOW 640). A `ChartOrFallback` wrapper in components/charts/fallback.tsx
  measures its container and renders the one-sentence fallback instead of the chart when a
  count or width threshold is not met; the screen keeps its table beside it (design §12).
  Heatmap buckets to 3-hour columns under 640 px inside the builder. The HTML views
  (FlowPanel, Funnel, PathList, Matrix, SplitBar) live in components/shell/views.tsx.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] treemapOption, quadrantOption, heatmapOption, histogramOption, dotplotOption with unit tests and their table equivalents.
- [x] Threshold constants (counts and widths) beside each chart; a shared ChartOrFallback that renders the sentence instead of the chart.
- [x] FlowPanel, Funnel, PathList, Matrix, SplitBar components.
- [x] Add them to the preview route. Verify: npm run verify.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; Context brought up to date (no new ECharts modules, thresholds module, ChartOrFallback, views file).
- 2026-09-05 — Builders, thresholds, shape components, HTML views and the /ui sections landed.
  Walkthrough on next dev at 1280 and 390 px found: the quadrant's corner labels need the
  ECharts GraphicComponent (now registered, so one new module after all); `itemStyle.opacity`
  on scatter dims the labels too (fill is now an rgba colour); the treemap label formatter
  received the [value, shade] array (fixed) and its ink-2 sub-label read brown on the darkest
  cell (now ink, per the design's contrast note); the dot plot's reference label sat on the
  axis (now at the start of the line, which is the top on the inverse category axis). The
  heatmap's 3-hour bucketing (under 640 px) only shows when the heatmap sits in a narrow column
  of a wide layout, because the 700 px width fallback wins on phones; both rules are kept as
  the design states them.

## Handoff
- **State:** Closed; next is TICKET-027 (session-entry dimensions, step 7 of the sequence).
- **Blocked on:** nothing.
- **Next:** TICKET-027, then TICKET-034.
- **Read first:** components/charts/shapes.tsx and components/shell/views.tsx when a screen
  needs one of these.

## Verification
```
npm run verify
```
Lint (42 pre-existing warnings, none in the new files), typecheck, ticket check (47 tickets),
29 test files / 143 unit tests passed, including `lib/charts/shapes.test.ts` (12 tests:
everything-else leaf, shade dimension, log axis and average mark lines, bubble sizing, corner
labels, 3-hour bucketing, cell emission, bins and tones, marker placement, reference line and
above flags, all five thresholds).

Playwright walkthrough of /ui on `next dev -p 3005` at 1280 and 390 px: 11 SVG charts with 11
hidden tables, no console errors, both threshold sentences render, the treemap and heatmap
give way to their width sentences at 390 px, the split bar's `role="img"` name reads
"Devices: Desktop 57%, Mobile 39%, Tablet 4%".

## Outcome
Shipped: `lib/charts/{treemap,quadrant,heatmap,histogram,dotplot}.ts` option builders,
`lib/charts/thresholds.ts` (count and width constants with tested checks),
`components/charts/fallback.tsx` (`ChartOrFallback` measuring its container),
`components/charts/shapes.tsx` (Treemap, Quadrant, Heatmap, Histogram, DotPlot with
descriptions and hidden tables), `components/shell/views.tsx` (FlowPanel, Funnel, PathList,
Matrix, SplitBar), GraphicComponent registered in `lib/charts/echarts.ts`, and the /ui preview
showing every one of them plus the two fallback sentences. Left out: nothing. No follow-up
tickets.
