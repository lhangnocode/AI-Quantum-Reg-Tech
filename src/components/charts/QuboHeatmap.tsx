"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useCssVars } from "@/lib/use-css-vars";
import { EmptyChart } from "./EmptyChart";

echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

const VARS = ["--quantum", "--card", "--muted-foreground", "--border"] as const;

/** Heatmap ma trận QUBO Q (n×n). Ma trận còn TODO → trạng thái rỗng. */
export function QuboHeatmap({ matrix, numQubits }: { matrix: unknown; numQubits: number }) {
  const c = useCssVars(VARS);
  const valid = Array.isArray(matrix) && matrix.every((r) => Array.isArray(r) && r.every((v) => typeof v === "number"));

  if (!valid) {
    return (
      <EmptyChart
        title={`Ma trận Q ${numQubits}×${numQubits} chưa có`}
        hint="Sẽ hiển thị khi nhóm IT xuất ma trận QUBO từ code Python vào portfolio.json → qubo.matrix."
        className="h-72"
      />
    );
  }
  if (!c) return <div className="h-80" />;

  const m = matrix as number[][];
  const data = m.flatMap((row, i) => row.map((v, j) => [j, i, v]));
  const values = data.map((d) => d[2]);
  const labels = m.map((_, i) => `q${i}`);

  return (
    <ReactEChartsCore
      echarts={echarts}
      notMerge
      style={{ height: 360, width: "100%" }}
      option={{
        tooltip: { formatter: (p: { value: number[] }) => `Q[${p.value[1]},${p.value[0]}] = ${p.value[2]}` },
        grid: { top: 10, right: 10, bottom: 60, left: 40 },
        xAxis: { type: "category", data: labels, axisLabel: { fontSize: 9, color: c["--muted-foreground"] } },
        yAxis: { type: "category", data: labels, inverse: true, axisLabel: { fontSize: 9, color: c["--muted-foreground"] } },
        visualMap: {
          min: Math.min(...values),
          max: Math.max(...values),
          orient: "horizontal",
          left: "center",
          bottom: 0,
          itemHeight: 120,
          textStyle: { color: c["--muted-foreground"], fontSize: 10 },
          inRange: { color: [c["--card"], c["--quantum"]] },
        },
        series: [{ type: "heatmap", data, itemStyle: { borderColor: c["--border"], borderWidth: 1 } }],
      }}
    />
  );
}
