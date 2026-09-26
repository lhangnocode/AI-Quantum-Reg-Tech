"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { GaugeChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { formatNumber } from "@/lib/format";
import { ALTMAN_THRESHOLDS } from "@/lib/risk";
import type { Todo } from "@/lib/types";
import { useCssVars } from "@/lib/use-css-vars";

echarts.use([GaugeChart, CanvasRenderer]);

const MAX = 8;
const VARS = ["--risk-safe", "--risk-grey", "--risk-distress", "--foreground", "--muted-foreground", "--card"] as const;

/** Gauge Z-Score 3 dải màu (Distress · Grey · Safe). z = "TODO" → không có kim, hiển thị "—". */
export function ZScoreGauge({ z, model = "Z", height = 220 }: { z: Todo<number>; model?: "Z" | "Z'"; height?: number }) {
  const c = useCssVars(VARS);
  const t = ALTMAN_THRESHOLDS[model];
  const hasValue = typeof z === "number";

  if (!c) return <div style={{ height }} />;

  const option = {
    series: [
      {
        type: "gauge",
        min: 0,
        max: MAX,
        startAngle: 200,
        endAngle: -20,
        radius: "95%",
        center: ["50%", "58%"],
        splitNumber: 8,
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [t.distress / MAX, c["--risk-distress"]],
              [t.safe / MAX, c["--risk-grey"]],
              [1, c["--risk-safe"]],
            ],
          },
        },
        pointer: { show: hasValue, width: 4, length: "60%", itemStyle: { color: c["--foreground"] } },
        anchor: { show: hasValue, size: 10, itemStyle: { color: c["--foreground"], borderColor: c["--card"], borderWidth: 2 } },
        axisTick: { distance: -14, length: 6, lineStyle: { color: c["--card"], width: 1 } },
        splitLine: { distance: -14, length: 14, lineStyle: { color: c["--card"], width: 2 } },
        axisLabel: { distance: 20, color: c["--muted-foreground"], fontSize: 10 },
        title: { offsetCenter: [0, "62%"], fontSize: 11, color: c["--muted-foreground"] },
        detail: {
          offsetCenter: [0, "40%"],
          fontSize: 26,
          fontWeight: 700,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          color: c["--foreground"],
          formatter: () => (hasValue ? formatNumber(z) : "—"),
        },
        data: [{ value: hasValue ? Math.min(z, MAX) : 0, name: model === "Z" ? "Altman Z" : "Altman Z'" }],
      },
    ],
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      style={{ height, width: "100%" }}
      opts={{ renderer: "canvas" }}
      aria-label={`Đồng hồ Z-Score: ${hasValue ? formatNumber(z) : "chưa có số liệu"}`}
    />
  );
}
