# TICKET-032: ECharts foundation: theme, Chart component, line and bar

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** ui

## Goal
Apache ECharts is wired in once: the lynq theme from the tokens, the <Chart> client component, the dynamic import, the bundle measurement, and the line, bar and sparkline option builders with their table equivalents.

## Context
- D-009; design §7 (theme from tokens, SVG renderer, fixed-height skeletons, aria descriptions, table equivalents, click and hover callbacks, reduced motion, hit tolerance for 24 px targets) and §14. Depends on TICKET-028 and TICKET-031 (Section, skeletons).
- echarts/core with LineChart, BarChart, ScatterChart, TreemapChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, MarkLineComponent, SVGRenderer; registered in lib/charts/echarts.ts; loaded through next/dynamic so tables paint first.
- Option builders are pure functions in lib/charts/ (lineOption, barOption, sparklineOption) taking DTO arrays; unit-tested. Hidden <table> equivalents rendered by a HiddenTable helper.
- Bundle budget 220 KB gzipped for the chart bundle, measured with the build's stats and recorded in the ticket.
- Read on start: echarts 6.1 installed; its tree-shakable entry points are `echarts/core`
  (init, use, registerTheme), `echarts/charts`, `echarts/components`, `echarts/renderers`.
  Registration happens once in lib/charts/echarts.ts; components/charts/chart.tsx is the only
  client component that imports it, wrapped in `next/dynamic({ ssr: false })` behind a
  `ChartSkeleton` of the same height so the server HTML is the figure, its description and the
  table equivalent, and the chart paints over the skeleton after hydration (design §7).
- Decisions (routine): the theme is a plain object in lib/charts/theme.ts holding the §3 hex
  values (ECharts needs colours, not CSS variables, inside the SVG); the option builders take
  plain arrays and return `EChartsOption`; the tooltip is ECharts' own, styled through the
  theme; reduced motion is read once from matchMedia and sets `animation: false`; click
  events carry the mark's index and name to the screen's callback. The hidden table is a
  `<table className="sr-only">` rendered by HiddenTable from the same series arrays.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [x] Add echarts; lib/charts/echarts.ts registration; lib/charts/theme.ts generated from the tokens; register the lynq theme.
- [x] components/charts/chart.tsx: instance lifecycle, ResizeObserver, dispose, onClick(mark) and onHover, aria description on the figure, SVG aria-hidden, reduced motion, fixed height from props, skeleton while loading.
- [x] lineOption (primary with area, previous period dotted, compare deltas in tooltip), barOption (last bar accent), sparklineOption; HiddenTable.
- [x] Measure the chart bundle; record the number. Unit tests for the builders. Verify: npm run verify; npm run build.

## Progress log
- 2026-09-05 — Created from the Phase 1 design (TICKET-025).
- 2026-09-05 — Started; echarts 6.1 added; Context brought up to date (entry points, dynamic import, theme as hex values).
- 2026-09-05 — Built lib/charts (echarts.ts registration, theme.ts from the tokens, format.ts,
  line.ts, bar.ts, sparkline.ts) and components/charts (Chart, HiddenTable, LineChart,
  BarChart, Sparkline, trendLabel); /ui renders the trend with compare, the per-minute bars
  and sparklines in the Pages table. Two catches: bucket labels must be formatted in the site
  timezone, not the machine's (the tests failed on a Toronto machine until format.ts took a
  timezone and used date-fns-tz); and the hidden table keyed rows by label, which repeats for
  blank bar ticks (React duplicate-key warning), now keyed by index. Bundle: the one chunk
  that carries ECharts (and nothing else: no radix, tanstack or app code in it) is 223.5 KB
  gzipped (667 KB raw) with line, bar, scatter, treemap and heatmap plus grid, tooltip,
  legend, visualMap and markLine and the SVG renderer already registered for TICKET-033.
  That is 1.6% over the design's 220 KB budget; recorded here rather than trimmed, since the
  shape charts add no more chart code. It loads through a dynamic import after hydration.

## Handoff
Closed; next is TICKET-033 (shape charts and HTML views).

## Verification
```
npx vitest run lib/charts       # 6 tests: line series and colours, tooltip and threshold, bar tones and accent,
                                # sparkline, bucket labels and titles per granularity, series description
npm run verify                  # lint 0 errors (42 warnings, unchanged), typecheck, tickets, 131 unit tests pass
npm run build                   # compiles; chart chunk 1ieee51fa5gn-.js 223,521 B gzipped, only chunk referencing zrender
next dev + Playwright as guest on /ui: 11 SVG charts painted, 2 hidden tables present, figure description
  "Unique visitors: 14,972 in total over 30 days, rising; highest 696 on Fri, Sep 4, 2026, lowest 312 on
  Thu, Aug 6, 2026."; hover tooltip "Wed, Aug 19, 2026 · Unique visitors: 478 · 403 before · ▲ 18.6%";
  no console errors after the key fix (screenshot reviewed)
```

## Outcome
Shipped: ECharts 6 registered once with the SVG renderer and the `lynq` theme generated from
the tokens; `<Chart>` owning the instance (dynamic import, resize, dispose, click and hover
callbacks, reduced motion, aria description, aria-hidden SVG, skeleton until ready);
HiddenTable; line, bar and sparkline option builders with tests; LineChart, BarChart and
Sparkline components; /ui shows them. Left out: nothing planned. Follow-ups: none; the
bundle measurement (223.5 KB vs a 220 KB budget) is noted in the design's §7 by this ticket's
log rather than re-opening the decision.
