# TICKET-033: Shape charts and HTML views

**Status:** pending
**Created:** 2026-09-05
**Started:** —
**Completed:** —
**Area:** ui

## Goal
Treemap, quadrant, heatmap, histogram and dot plot option builders exist with their table equivalents and width thresholds, and the HTML views (FlowPanel, Funnel, PathList, Matrix, SplitBar) exist.

## Context
- Design §7 (the chart table: treemap with visualMap and an everything-else leaf and --ink labels; quadrant scatter with symbolSize, markLine averages, corner labels as graphic; heatmap on a 24-column axis with 3-hour bucketing under 640 px; histogram bars with per-band itemStyle and breakpoint markLines; dot plot on a category axis), §12 (thin-data and width thresholds as tested constants), §13.
- Depends on TICKET-032. HTML views use RowBar, tokens and semantic markup from §7 (Funnel as an ol with drop-off text, PathList as nested ols, Matrix as a real table with row and column headers, SplitBar as role=img).
- Part of the Phase 1 sequence in docs/design/phase-1-ui-overhaul.md §16 (TICKET-025, D-008, D-009).

## Plan
- [ ] treemapOption, quadrantOption, heatmapOption, histogramOption, dotplotOption with unit tests and their table equivalents.
- [ ] Threshold constants (counts and widths) beside each chart; a shared ChartOrFallback that renders the sentence instead of the chart.
- [ ] FlowPanel, Funnel, PathList, Matrix, SplitBar components.
- [ ] Add them to the preview route. Verify: npm run verify.

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
