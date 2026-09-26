"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { formatBillion, formatPct } from "@/lib/format";

export interface AllocationSlice {
  ticker: string;
  weight: number;
  baselineWeight?: number;
}

// Màu theo DN (thứ tự cố định, không theo hạng) – token --chart-1..4.
const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function AllocationDonut({ data, capital }: { data: AllocationSlice[]; capital: number }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 sm:flex-row">
      <div className="size-40 shrink-0" role="img" aria-label="Biểu đồ tròn tỷ trọng danh mục">
        <PieChart width={160} height={160}>
          <Pie
            data={data}
            dataKey="weight"
            nameKey="ticker"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={d.ticker} fill={SERIES[i % SERIES.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as AllocationSlice;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold">{d.ticker}</p>
                  <p className="font-mono tabular">
                    {formatPct(d.weight, 1)} · {formatBillion(d.weight * capital)}
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </div>

      {/* Legend + bảng số – nhận diện không dựa vào màu đơn thuần */}
      <table className="w-full flex-1 text-xs">
        <thead>
          <tr className="text-[10px] tracking-wider text-muted-foreground uppercase">
            <th className="pb-1.5 text-left font-semibold">Mã</th>
            <th className="pb-1.5 text-right font-semibold">w* ESG-aware</th>
            <th className="pb-1.5 text-right font-semibold">Baseline</th>
            <th className="pb-1.5 text-right font-semibold">Vốn</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.ticker}>
              <td className="py-1">
                <span className="flex items-center gap-2 font-medium">
                  <span className="size-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
                  {d.ticker}
                </span>
              </td>
              <td className="py-1 text-right font-mono font-semibold tabular">{formatPct(d.weight, 1)}</td>
              <td className="py-1 text-right font-mono text-muted-foreground tabular">
                {formatPct(d.baselineWeight, 1)}
              </td>
              <td className="py-1 text-right font-mono text-muted-foreground tabular">
                {formatBillion(d.weight * capital)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
