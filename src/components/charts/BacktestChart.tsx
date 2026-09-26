"use client";

import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { formatPct } from "@/lib/format";
import type { PortfolioResult } from "@/lib/types";

/** So sánh Baseline vs ESG-aware: lợi nhuận kỳ vọng & thực tế (1 trục, cùng đơn vị %). */
export function BacktestChart({ portfolio }: { portfolio: Pick<PortfolioResult, "baseline" | "esgAware"> }) {
  const data = [
    { name: "Lợi nhuận kỳ vọng", baseline: portfolio.baseline.expectedReturn, esg: portfolio.esgAware.expectedReturn },
    { name: "Lợi nhuận thực tế", baseline: portfolio.baseline.realizedReturn, esg: portfolio.esgAware.realizedReturn },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <BarChart width={460} height={240} data={data} barGap={2} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v: number) => formatPct(v, 0)}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <p className="mb-1 font-semibold">{label}</p>
                {payload.map((p) => (
                  <p key={String(p.dataKey)} className="flex justify-between gap-4">
                    <span>{p.name}</span>
                    <span className="font-mono">{formatPct(p.value as number)}</span>
                  </p>
                ))}
              </div>
            ) : null
          }
        />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="baseline" name="Baseline (Markowitz)" fill="var(--chart-5)" radius={[4, 4, 0, 0]} maxBarSize={48}
          label={{ position: "top", fontSize: 10, fill: "var(--muted-foreground)", formatter: (v: unknown) => formatPct(v as number) }} />
        <Bar dataKey="esg" name="ESG-aware" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={48}
          label={{ position: "top", fontSize: 10, fill: "var(--foreground)", formatter: (v: unknown) => formatPct(v as number) }} />
      </BarChart>
    </div>
  );
}
