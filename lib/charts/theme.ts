/**
 * The ECharts theme generated from the design tokens (design §3, §7, D-009).
 * ECharts paints into an SVG and needs concrete colours, so the hex values
 * live here beside the CSS variables in app/globals.css; keep the two in step.
 */
export const TOKENS = {
  canvas: "#ffffff",
  soft: "#f5f5f7",
  ink: "#0a0a0a",
  ink2: "#4a4a52",
  mute: "#63636c",
  faint: "#9a9aa3",
  rule: "#e8e8ec",
  ruleStrong: "#111111",
  teal: "#0f766e",
  tealInk: "#0b5f59",
  tealSoft: "#e3f1ef",
  teal2: "#7fbdb6",
  teal3: "#cfe6e2",
  good: "#0c6a35",
  warn: "#845400",
  poor: "#b31e18",
  compare: "#8a8a93",
} as const;

export const FONT = 'Geist, "Geist Fallback", system-ui, sans-serif';

/** Series colours in order: the trend line, the accent, then the two lighter teals. */
export const SERIES_COLORS = [
  TOKENS.ink,
  TOKENS.teal,
  TOKENS.teal2,
  TOKENS.teal3,
];

/** Teal ramp for heatmaps: 4% to 80% teal over white. */
export const RAMP = [
  "#f5faf9",
  "#d9ece9",
  "#b3d9d4",
  "#8cc5be",
  "#5eaba2",
  "#3f918b",
  "#2e7e77",
];

export const lynqTheme = {
  color: SERIES_COLORS,
  backgroundColor: "transparent",
  textStyle: { fontFamily: FONT, color: TOKENS.mute, fontSize: 11 },
  title: { textStyle: { color: TOKENS.ink, fontSize: 14, fontWeight: 500 } },
  legend: {
    textStyle: { color: TOKENS.mute, fontSize: 12 },
    itemWidth: 14,
    itemHeight: 2,
    icon: "rect",
  },
  tooltip: {
    backgroundColor: TOKENS.ink,
    borderWidth: 0,
    padding: [6, 10],
    textStyle: { color: TOKENS.canvas, fontSize: 12, fontFamily: FONT },
    extraCssText: "border-radius:6px;box-shadow:none;",
  },
  grid: { left: 44, right: 12, top: 16, bottom: 28, containLabel: false },
  categoryAxis: {
    axisLine: { show: true, lineStyle: { color: TOKENS.rule } },
    axisTick: { show: false },
    axisLabel: { color: TOKENS.mute, fontSize: 11, margin: 10 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: TOKENS.mute, fontSize: 11 },
    splitLine: { show: true, lineStyle: { color: TOKENS.rule, width: 1 } },
    splitNumber: 3,
  },
  line: {
    smooth: false,
    symbol: "circle",
    symbolSize: 4,
    showSymbol: false,
    lineStyle: { width: 1.6 },
  },
  bar: { barMaxWidth: 28, itemStyle: { borderRadius: [2, 2, 0, 0] } },
  scatter: { itemStyle: { borderWidth: 1.5 } },
  visualMap: { textStyle: { color: TOKENS.mute, fontSize: 11 } },
};
