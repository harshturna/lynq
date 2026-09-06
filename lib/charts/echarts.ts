/**
 * The one place ECharts is registered (D-009): only the chart types and
 * components the inventory needs, the SVG renderer, and the lynq theme. Only
 * components/charts/chart.tsx imports this module, through a dynamic import,
 * so the chart bundle loads after the shell and tables have painted.
 */
import {
  BarChart,
  HeatmapChart,
  LineChart,
  ScatterChart,
} from "echarts/charts";
import {
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { lynqTheme } from "./theme";

let registered = false;

export function setupEcharts() {
  if (registered) return echarts;
  echarts.use([
    LineChart,
    BarChart,
    ScatterChart,
    HeatmapChart,
    GridComponent,
    GraphicComponent,
    TooltipComponent,
    LegendComponent,
    VisualMapComponent,
    MarkLineComponent,
    SVGRenderer,
  ]);
  echarts.registerTheme("lynq", lynqTheme);
  registered = true;
  return echarts;
}

export type EChartsInstance = echarts.ECharts;
export type { EChartsCoreOption as ChartOption } from "echarts/core";
