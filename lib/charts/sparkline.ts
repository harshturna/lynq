/** A sparkline (design §7): no axes, no tooltip, the compare stroke because it is informational. */
import type { ChartOption } from "./echarts";
import { TOKENS } from "./theme";

export function sparklineOption(
  values: number[],
  opts: { accent?: boolean } = {}
): ChartOption {
  return {
    animation: false,
    grid: { left: 1, right: 1, top: 2, bottom: 2 },
    xAxis: {
      type: "category",
      show: false,
      boundaryGap: false,
      data: values.map((_, i) => String(i)),
    },
    yAxis: { type: "value", show: false, min: 0 },
    tooltip: { show: false },
    series: [
      {
        type: "line",
        data: values,
        showSymbol: false,
        lineStyle: {
          color: opts.accent ? TOKENS.teal : TOKENS.compare,
          width: 1.5,
        },
        silent: true,
      },
    ],
  };
}
