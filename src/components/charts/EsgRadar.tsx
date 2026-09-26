"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/format";
import type { Esg } from "@/lib/types";
import { EmptyChart } from "./EmptyChart";

const AXES = [
  { key: "E", label: "Môi trường (E)" },
  { key: "S", label: "Xã hội (S)" },
  { key: "G", label: "Quản trị (G)" },
  { key: "transparency", label: "Minh bạch" },
  { key: "compliance", label: "Tuân thủ" },
] as const;

/** Radar 5 trụ cột ESG. Trụ cột còn TODO → trạng thái rỗng (không tự điền số). */
export function EsgRadar({ pillars, height = 240 }: { pillars: Esg["pillars"]; height?: number }) {
  const data = AXES.map(({ key, label }) => ({ label, value: pillars[key] }));
  if (data.some((d) => typeof d.value !== "number")) {
    return (
      <EmptyChart
        title="Chưa có điểm trụ cột E / S / G"
        hint="Điểm con sẽ hiển thị khi nhóm tài chính cập nhật từ file Excel."
        className="h-full min-h-48"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
        <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18} strokeWidth={2} />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                {payload[0].payload.label}: <span className="font-mono">{formatNumber(payload[0].value as number)}</span>
              </div>
            ) : null
          }
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
