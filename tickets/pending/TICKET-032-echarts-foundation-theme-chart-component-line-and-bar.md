# TICKET-032: ECharts foundation: theme, Chart component, line and bar

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
Apache ECharts is wired in once: the lynq theme from the tokens, the <Chart> client component, the dynamic import, the bundle measurement, and the line, bar and sparkline option builders with their table equivalents.

## Context
- D-009; design §7 (theme from tokens, SVG renderer, fixed-height skeletons, aria descriptions, table equivalents, click and hover callbacks, reduced motion, hit tolerance for 24 px targets) and §14. Depends on TICKET-028 and TICKET-031 (Section, skeletons).
- echarts/core with LineChart, BarChart, ScatterChart, TreemapChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, MarkLineComponent, SVGRenderer; registered in lib/charts/echarts.ts; loaded through next/dynamic so tables paint first.
- Option builders are pure functions in lib/charts/ (lineOption, barOption, sparklineOption) taking DTO arrays; unit-tested. Hidden <table> equivalents rendered by a HiddenTable helper.
- Bundle budget 220 KB gzipped for the chart bundle, measured with the build's stats and recorded in the ticket.
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] Add echarts; lib/charts/echarts.ts registration; lib/charts/theme.ts generated from the tokens; register the lynq theme.
- [ ] components/charts/chart.tsx: instance lifecycle, ResizeObserver, dispose, onClick(mark) and onHover, aria description on the figure, SVG aria-hidden, reduced motion, fixed height from props, skeleton while loading.
- [ ] lineOption (primary with area, previous period dotted, compare deltas in tooltip), barOption (last bar accent), sparklineOption; HiddenTable.
- [ ] Measure the chart bundle; record the number. Unit tests for the builders. Verify: npm run verify; npm run build.

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
