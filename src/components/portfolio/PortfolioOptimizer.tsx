"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import { BacktestChart } from "@/components/charts/BacktestChart";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatBillion, formatNumber, formatPct } from "@/lib/format";
import type { CompanyOverview } from "@/lib/overview";
import { nearestScenario, portfolioReturn } from "@/lib/portfolio";
import type { PortfolioResult, Scenario } from "@/lib/types";
import { usePortfolioStore } from "@/store/portfolio";
import { CompareTable } from "./CompareTable";
import { QuantumCore } from "./QuantumCore";
import { WeightSliders } from "./WeightSliders";
import { WeightTable } from "./WeightTable";

export function PortfolioOptimizer({
  items,
  portfolio,
  scenarios,
}: {
  items: CompanyOverview[];
  portfolio: PortfolioResult;
  scenarios: Scenario[];
}) {
  const params = usePortfolioStore((s) => s.params);
  const watchlist = usePortfolioStore((s) => s.watchlist);
  const companies = items.map((i) => i.company);

  const scenario = useMemo(() => nearestScenario(scenarios, params), [scenarios, params]);
  const weights = scenario?.weights ?? portfolio.esgAware.weights;

  // Skeleton 600ms mỗi khi kịch bản thay đổi (UI_DESIGN §4.4).
  const [shown, setShown] = useState(weights);
  const loading = shown !== weights;
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setShown(weights), 600);
    return () => clearTimeout(t);
  }, [weights, loading]);

  const expected = portfolioReturn(shown, companies, "expectedReturn");
  const realized = portfolioReturn(shown, companies, "realizedReturn");
  const { minWeight, maxWeight } = portfolio.constraints;

  return (
    <Tabs defaultValue="classic" className="gap-4">
      <TabsList>
        <TabsTrigger value="classic">Tối ưu danh mục</TabsTrigger>
        <TabsTrigger value="quantum">Lõi Lượng tử</TabsTrigger>
      </TabsList>

      <TabsContent value="classic" className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr]">
          <DashboardCard title="Tham số mô hình" description="Kéo slider để chọn kịch bản tính sẵn gần nhất">
            <WeightSliders />
          </DashboardCard>

          <div className="space-y-4">
            {/* Ràng buộc */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Ràng buộc:</span>
              {[
                `${formatPct(minWeight, 0)} ≤ wᵢ ≤ ${formatPct(maxWeight, 0)}`,
                "Σwᵢ = 100%",
                `Vốn: ${formatBillion(portfolio.capital, 0)} VNĐ`,
              ].map((c) => (
                <Badge key={c} variant="outline" className="h-auto px-2.5 py-1 font-mono text-[11px]">
                  {c}
                </Badge>
              ))}
              {scenario && (
                <span className="ml-auto text-[11px] text-muted-foreground">
                  Kịch bản gần nhất: α={formatNumber(scenario.params.alpha, 0)} β={formatNumber(scenario.params.beta, 0)} γ=
                  {formatNumber(scenario.params.gamma, 0)} δ={formatNumber(scenario.params.delta, 0)}
                </span>
              )}
            </div>

            {watchlist.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="size-3.5" /> Đang theo dõi từ Cổng 1: {watchlist.join(", ")}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard label="Lợi nhuận kỳ vọng" value={loading ? "…" : formatPct(expected)} icon={Target} hint="Σ wᵢ × Rᵢ (CAPM)" />
              <StatCard
                label="Lợi nhuận thực tế (backtest)"
                value={loading ? "…" : formatPct(realized)}
                icon={TrendingUp}
                tone="safe"
                hint="Σ wᵢ × lợi nhuận thực tế"
              />
            </div>

            <DashboardCard title="Kết quả phân bổ" description="Tỷ trọng tối ưu wᵢ* và số tiền phân bổ">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-40" />
                  <Skeleton className="h-32" />
                </div>
              ) : (
                <div className="space-y-4">
                  <AllocationDonut
                    data={items.map(({ company: { ticker } }) => ({
                      ticker,
                      weight: shown[ticker] ?? 0,
                      baselineWeight: portfolio.baseline.weights[ticker],
                    }))}
                    capital={portfolio.capital}
                  />
                  <WeightTable items={items} weights={shown} capital={portfolio.capital} />
                </div>
              )}
            </DashboardCard>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardCard title="So sánh Baseline vs ESG-aware" description="Kết quả đã kiểm tra lại bằng tính toán">
            <CompareTable portfolio={portfolio} tickers={companies.map((c) => c.ticker)} />
          </DashboardCard>
          <DashboardCard title="Backtest" description="Lợi nhuận kỳ vọng và thực tế của hai mô hình">
            <BacktestChart portfolio={portfolio} />
          </DashboardCard>
        </div>
      </TabsContent>

      <TabsContent value="quantum">
        <QuantumCore qubo={portfolio.qubo} />
      </TabsContent>
    </Tabs>
  );
}
