import Link from "next/link";
import { AlertTriangle, CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import { severityZone, ZONE_CLASS } from "@/lib/risk";
import type { OsintEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DashboardCard } from "./DashboardCard";
import type { CompanyOverview } from "@/lib/overview";

function status(events: OsintEvent[]) {
  if (events.length === 0) return { label: "Tuân thủ", icon: CheckCircle2, cls: ZONE_CLASS.safe };
  const worst = Math.max(...events.map((e) => e.severity)) as OsintEvent["severity"];
  return severityZone(worst) === "distress"
    ? { label: "Vi phạm", icon: XCircle, cls: ZONE_CLASS.distress }
    : { label: "Cảnh báo", icon: AlertTriangle, cls: ZONE_CLASS.grey };
}

export function OsintCard({ items }: { items: CompanyOverview[] }) {
  const flagged = items.filter((i) => i.events.length > 0 || i.zscore.zone !== "safe");

  return (
    <DashboardCard
      title="Giám sát tuân thủ AI-OSINT"
      description="Sự kiện pháp lý / môi trường trong 36 tháng"
      action={
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-risk-grey" /> Dữ liệu mẫu
        </span>
      }
    >
      <div className="flex flex-1 flex-col gap-1">
        <div className="grid grid-cols-[4rem_1fr_auto] gap-2 border-b px-3 pb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          <span>Mã</span>
          <span>Phát hiện</span>
          <span className="text-right">Trạng thái</span>
        </div>
        {items.map(({ company, events }) => {
          const s = status(events);
          const Icon = s.icon;
          return (
            <Link
              key={company.ticker}
              href={`/company/${company.ticker}`}
              className="grid grid-cols-[4rem_1fr_auto] items-center gap-2 rounded-lg px-3 py-2.5 text-xs transition-colors hover:bg-muted/60"
            >
              <span className="font-semibold">{company.ticker}</span>
              <span className="truncate text-muted-foreground">
                {events.length > 0 ? events.map((e) => e.title).join(" · ") : "Không ghi nhận vi phạm"}
              </span>
              <Badge variant="secondary" className={cn("h-auto px-2 py-0.5 text-[10px] font-semibold", s.cls.soft, s.cls.text)}>
                <Icon /> {s.label}
              </Badge>
            </Link>
          );
        })}
      </div>

      {flagged.length > 0 && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-3">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <ul className="space-y-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {flagged.map(({ company, zscore, events, posint, rfinTotal }) => (
              <li key={company.ticker}>
                <span className="font-semibold text-primary">{company.ticker}:</span>{" "}
                {events.length > 0 && <>{events.length} sự kiện OSINT (POSINT +{formatNumber(posint)}) · </>}
                {zscore.zone !== "safe" && <>Z = {formatNumber(zscore.z)} ({zscore.zone === "distress" ? "Distress" : "Grey"}) · </>}
                RFin,Total = <span className="font-mono font-semibold text-foreground">{formatNumber(rfinTotal)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  );
}
