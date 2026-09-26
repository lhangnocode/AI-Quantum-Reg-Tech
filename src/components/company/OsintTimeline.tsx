"use client";

import { ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatEventDate, formatNumber } from "@/lib/format";
import { OSINT_TYPE_LABEL, severityZone, ZONE_CLASS } from "@/lib/risk";
import type { OsintEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Tháng của sự kiện; null nếu ngày chưa rõ tháng (vd. "2022-TODO"). */
function parse(date: string) {
  const [y, m] = date.split("-");
  const month = Number(m);
  return { year: Number(y), month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : null };
}

function EventDot({ event }: { event: OsintEvent }) {
  const cls = ZONE_CLASS[severityZone(event.severity)];
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`${event.title} – mức ${event.severity}`}
            className={cn("size-3 rounded-full ring-2 ring-card", cls.bg, !event.active && "opacity-40")}
          />
        }
      />
      <TooltipContent className="flex-col items-start gap-0.5">
        <span className="font-semibold">{event.title}</span>
        <span>
          {OSINT_TYPE_LABEL[event.type]} · Mức {event.severity} · POSINT +{formatNumber(event.penalty)}
        </span>
        <span className="opacity-80">
          {event.source} · {formatEventDate(event.date)}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/** Timeline OSINT 36 tháng (3 năm × 12 tháng), chấm màu theo mức 1/2/3. */
export function OsintTimeline({ events, endYear }: { events: OsintEvent[]; endYear: number }) {
  const years = [endYear - 2, endYear - 1, endYear];
  const posint = events.filter((e) => e.active).reduce((s, e) => s + e.penalty, 0);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-[10px]">
          <thead>
            <tr className="text-muted-foreground">
              <th className="w-12 text-left font-medium">Năm</th>
              {MONTHS.map((m) => (
                <th key={m} className="font-medium">T{m}</th>
              ))}
              <th className="w-14 font-medium" title="Nguồn chưa ghi rõ tháng">Chưa rõ</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => {
              const inYear = events.filter((e) => parse(e.date).year === y);
              const cell = (month: number | null) => inYear.filter((e) => parse(e.date).month === month);
              return (
                <tr key={y}>
                  <td className="font-mono font-semibold">{y}</td>
                  {[...MONTHS, null].map((m) => (
                    <td key={m ?? "x"} className="h-7 border-y border-l bg-muted/30 text-center last:border-r first-of-type:rounded-l">
                      <span className="inline-flex gap-1">
                        {cell(m).map((e) => (
                          <EventDot key={e.id} event={e} />
                        ))}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-risk-grey" /> Mức 1 (+0,05)</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-risk-distress" /> Mức 2 (+0,10)</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-risk-distress ring-2 ring-risk-distress/30" /> Mức 3 (≥ +0,20)</span>
        </div>
        <span>
          Điểm phạt POSINT: <span className="font-mono font-semibold">+{formatNumber(posint)}</span>
        </span>
      </div>

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
          Không ghi nhận sự kiện OSINT trong 36 tháng.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => {
            const cls = ZONE_CLASS[severityZone(e.severity)];
            return (
              <li key={e.id} className="flex items-start gap-3 rounded-lg border p-3 text-xs">
                <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", cls.bg)} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-muted-foreground">
                    {OSINT_TYPE_LABEL[e.type]} · {formatEventDate(e.date)} · Mức {e.severity} ·{" "}
                    {e.active ? "Đang hiệu lực" : "Hết hiệu lực"}
                  </p>
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    {e.source} <ExternalLink className="size-3" />
                  </a>
                </div>
                <span className={cn("font-mono font-semibold", cls.text)}>+{formatNumber(e.penalty)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
