import type { Metadata } from "next";
import { PortfolioOptimizer } from "@/components/portfolio/PortfolioOptimizer";
import { getPortfolio, getScenarios } from "@/lib/api";
import { getOverviews } from "@/lib/overview";

export const metadata: Metadata = { title: "Tối ưu danh mục | QuantumRegTech" };

export default async function PortfolioPage() {
  const [items, portfolio, scenarios] = await Promise.all([getOverviews(), getPortfolio(), getScenarios()]);

  if (items.length === 0) {
    return <p className="py-20 text-center text-sm text-muted-foreground">Chưa có doanh nghiệp nào để tối ưu danh mục.</p>;
  }

  return <PortfolioOptimizer items={items} portfolio={portfolio} scenarios={scenarios} />;
}
