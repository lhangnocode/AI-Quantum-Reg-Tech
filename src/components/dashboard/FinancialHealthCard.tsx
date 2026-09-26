import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { ALTMAN_DISTRESS, ALTMAN_SAFE, ZONE_CLASS } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { DashboardCard } from "./DashboardCard";
import { ZoneBadge } from "./ZoneBadge";
import type { CompanyOverview } from "@/lib/overview";

const SCALE_MAX = 8;
const pct = (z: number) => `${Math.min(Math.max(z / SCALE_MAX, 0), 1) * 100}%`;

export function FinancialHealthCard({ items }: { items: CompanyOverview[] }) {
  return (
    <DashboardCard
      title="Sức khoẻ tài chính"
      description="Altman Z-Score — mô hình dự báo kiệt quệ tài chính"
      action={<ShieldCheck className="size-4 text-muted-foreground" />}
    >
      <ul className="flex flex-1 flex-col gap-3">
        {items.map(({ company, zscore }) => {
          const c = ZONE_CLASS[zscore.zone];
          return (
            <li key={company.ticker}>
              <Link
                href={`/company/${company.ticker}`}
                className="-mx-2 block rounded-lg px-2 py-1 transition-colors hover:bg-muted/60"
                title={`Z = ${formatNumber(zscore.z)} · RFin,Base = ${formatNumber(zscore.rfinBase)} (FY${zscore.fiscalYear})`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold">{company.ticker}</span>
                  <ZoneBadge zone={zscore.zone} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", c.bg)} style={{ width: pct(zscore.z) }} />
                    {/* Ngưỡng vùng Altman */}
                    <span className="absolute inset-y-0 w-px bg-foreground/25" style={{ left: pct(ALTMAN_DISTRESS) }} />
                    <span className="absolute inset-y-0 w-px bg-foreground/25" style={{ left: pct(ALTMAN_SAFE) }} />
                  </div>
                  <span className={cn("w-10 text-right font-mono text-xs tabular", c.text)}>
                    {formatNumber(zscore.z)}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-risk-safe" /> Safe (Z &gt; {formatNumber(ALTMAN_SAFE)})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-risk-grey" /> Grey ({formatNumber(ALTMAN_DISTRESS)}–{formatNumber(ALTMAN_SAFE)})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-risk-distress" /> Distress (&lt; {formatNumber(ALTMAN_DISTRESS)})
        </span>
      </div>
    </DashboardCard>
  );
}
