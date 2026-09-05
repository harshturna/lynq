/**
 * The pages treemap (design §7): area is visitors, shade is engaged time,
 * every label in ink, an "everything else" leaf so the area sums to the total.
 */
import type { ChartOption } from "./echarts";
import { fmtNumber } from "./format";
import { RAMP, TOKENS } from "./theme";

export type TreemapCell = {
  key: string;
  label: string;
  value: number;
  shade: number;
};

export type TreemapOptions = {
  /** Text for the shade dimension in the tooltip, e.g. "engaged". */
  shadeLabel: string;
  /** Unit of the area, e.g. "pageviews" (default "visitors"). */
  unit?: string;
  formatShade?: (v: number) => string;
  /** The sum the cells should add up to; the remainder becomes "everything else". */
  total?: number;
  animation?: boolean;
};

export function treemapCells(
  cells: TreemapCell[],
  total?: number
): TreemapCell[] {
  const sum = cells.reduce((a, c) => a + c.value, 0);
  const rest = total !== undefined ? total - sum : 0;
  if (rest <= 0) return cells;
  const avgShade = cells.length
    ? cells.reduce((a, c) => a + c.shade, 0) / cells.length
    : 0;
  return [
    ...cells,
    { key: "__rest", label: "everything else", value: rest, shade: avgShade },
  ];
}

export function treemapOption(
  input: TreemapCell[],
  opts: TreemapOptions
): ChartOption {
  const cells = treemapCells(input, opts.total);
  const shades = cells.map((c) => c.shade);
  const lo = Math.min(...shades, 0);
  const hi = Math.max(...shades, 1);
  const fmtShade = opts.formatShade ?? fmtNumber;
  return {
    animation: opts.animation ?? true,
    animationDuration: 300,
    tooltip: {
      formatter: (p: unknown) => {
        const d = (
          p as { data: { name: string; value: number; shade: number } }
        ).data;
        return `<div style="font-weight:500">${d.name}</div>${fmtNumber(d.value)} visitors · ${opts.shadeLabel} ${fmtShade(d.shade)}`;
      },
    },
    visualMap: {
      show: false,
      type: "continuous",
      dimension: 1,
      min: lo,
      max: hi,
      inRange: { color: RAMP },
    },
    series: [
      {
        type: "treemap",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        squareRatio: 1.4,
        label: {
          show: true,
          color: TOKENS.ink,
          fontSize: 12,
          fontWeight: 500,
          position: "insideTopLeft",
          padding: 8,
          formatter: (p: unknown) => {
            const d = (p as { data?: { name?: string; value?: unknown } }).data;
            // ECharts also formats the root node, whose value is not a cell's pair.
            if (!d || !Array.isArray(d.value)) return d?.name ?? "";
            const [value, shade] = d.value as [number, number];
            return `${d.name}\n{s|${fmtNumber(value)} · ${fmtShade(shade)}}`;
          },
          rich: {
            s: {
              color: TOKENS.ink,
              fontSize: 11,
              fontWeight: 400,
              lineHeight: 16,
            },
          },
        },
        upperLabel: { show: false },
        itemStyle: {
          borderColor: TOKENS.canvas,
          borderWidth: 2,
          gapWidth: 2,
          borderRadius: 3,
        },
        emphasis: { itemStyle: { borderColor: TOKENS.teal } },
        data: cells.map((c) => ({
          name: c.label,
          value: [c.value, c.shade],
          shade: c.shade,
          key: c.key,
        })),
      },
    ],
  };
}
