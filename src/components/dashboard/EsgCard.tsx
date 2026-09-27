import Link from "next/link";
import { AlertTriangle, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import { DashboardCard } from "./DashboardCard";
import type { CompanyOverview } from "@/lib/overview";

export function EsgCard({ items }: { items: CompanyOverview[] }) {
  const highRisk = items.filter((i) => i.esg.greenwashingRisk === "high").map((i) => i.company.ticker);

  return (
    <DashboardCard
      title="Phân tích ESG"
      description="Điểm ESGi theo doanh nghiệp (thang 0–1)"
      action={
        highRisk.length > 0 ? (
          <Badge variant="secondary" className="h-auto bg-risk-distress/10 px-2 py-0.5 text-[10px] font-semibold text-risk-distress">
            <AlertTriangle /> Tẩy xanh cao: {highRisk.join(", ")}
          </Badge>
        ) : (
          <Badge variant="secondary" className="h-auto bg-risk-safe/10 px-2 py-0.5 text-[10px] font-semibold text-risk-safe">
            <Leaf /> Chưa phát hiện tẩy xanh cao
          </Badge>
        )
      }
    >
      <ul className="flex flex-1 flex-col justify-center gap-3">
        {items.map(({ company, esg }) => (
          <li key={company.ticker}>
            <Link
              href={`/company/${company.ticker}`}
              className="-mx-2 grid grid-cols-[2.5rem_1fr_3.5rem] items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted/60"
              title={`${company.name} · ESGi = ${formatNumber(esg.esgScore, 4)}`}
            >
              <span className="text-xs font-semibold">{company.ticker}</span>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${esg.esgScore * 100}%` }} />
              </div>
              <span className="text-right font-mono text-xs tabular">{formatNumber(esg.esgScore, 4)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t pt-3 text-[10px] text-muted-foreground">
        Bấm vào từng DN để xem mức độ công bố 32 chỉ tiêu ESG theo trụ cột E / S / G.
      </p>
    </DashboardCard>
  );
}
