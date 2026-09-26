import { Activity, AlertTriangle, Building2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { EsgCard } from "@/components/dashboard/EsgCard";
import { FinancialHealthCard } from "@/components/dashboard/FinancialHealthCard";
import { OsintCard } from "@/components/dashboard/OsintCard";
import { StatCard } from "@/components/dashboard/StatCard";
import type { CompanyOverview } from "@/components/dashboard/overview";
import { getCompanies, getEsg, getOsintEvents, getPortfolio, getZScore } from "@/lib/api";
import { formatPct } from "@/lib/format";

const SOLVER_LABEL: Record<string, string> = {
  "classical-cobyla": "Cổ điển (COBYLA)",
};

async function getOverview(): Promise<CompanyOverview[]> {
  const companies = await getCompanies();
  return Promise.all(
    companies.map(async (company) => {
      const [zscore, esg, allEvents] = await Promise.all([
        getZScore(company.ticker),
        getEsg(company.ticker),
        getOsintEvents(company.ticker),
      ]);
      const events = allEvents.filter((e) => e.active);
      const posint = events.reduce((sum, e) => sum + e.penalty, 0);
      return { company, zscore, esg, events, posint, rfinTotal: zscore.rfinBase + posint };
    })
  );
}

export default async function DashboardPage() {
  const [items, portfolio] = await Promise.all([getOverview(), getPortfolio()]);

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <Building2 className="size-8 text-muted-foreground" />
        <p className="text-sm font-semibold">Chưa có doanh nghiệp nào được giám sát</p>
        <p className="text-xs text-muted-foreground">Thêm doanh nghiệp qua Cổng 1 hoặc Cổng 2 để bắt đầu.</p>
      </div>
    );
  }

  const osintAlerts = items.reduce((n, i) => n + i.events.length, 0);
  const osintTickers = items.filter((i) => i.events.length > 0).map((i) => i.company.ticker);
  const distress = items.filter((i) => i.zscore.zone === "distress").map((i) => i.company.ticker);
  const allocation = items.map(({ company: { ticker } }) => ({
    ticker,
    weight: portfolio.esgAware.weights[ticker] ?? 0,
    baselineWeight: portfolio.baseline.weights[ticker],
  }));

  return (
    <div className="space-y-5">
      {/* Hàng KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="DN giám sát" value={String(items.length)} hint="Ngành F&B niêm yết" icon={Building2} />
        <StatCard
          label="Cảnh báo OSINT"
          value={String(osintAlerts)}
          hint={osintTickers.length ? osintTickers.join(", ") : "Không có"}
          icon={AlertTriangle}
          tone={osintAlerts > 0 ? "grey" : "safe"}
        />
        <StatCard
          label="DN vùng Distress"
          value={String(distress.length)}
          hint={distress.length ? distress.join(", ") : "Không có"}
          icon={Activity}
          tone={distress.length > 0 ? "distress" : "safe"}
        />
        <StatCard
          label="Lợi nhuận thực tế ESG-aware"
          value={formatPct(portfolio.esgAware.realizedReturn)}
          hint={`Baseline: ${formatPct(portfolio.baseline.realizedReturn)}`}
          icon={TrendingUp}
          tone="safe"
        />
      </div>

      {/* Lưới 2×2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard
          title="Phân bổ danh mục ESG-aware"
          description={`Tỷ trọng tối ưu · ${formatPct(portfolio.constraints.minWeight, 0)} ≤ wᵢ ≤ ${formatPct(portfolio.constraints.maxWeight, 0)}`}
          action={
            <Badge variant="secondary" className="h-auto bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
              {SOLVER_LABEL[portfolio.solver] ?? portfolio.solver}
            </Badge>
          }
        >
          <AllocationDonut data={allocation} capital={portfolio.capital} />
        </DashboardCard>

        <EsgCard items={items} />
        <FinancialHealthCard items={items} />
        <OsintCard items={items} />
      </div>
    </div>
  );
}
