import type { Metadata } from "next";
import { PortfolioBuilder } from "@/components/portfolio/PortfolioBuilder";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinancialEngineData } from "@/lib/financial-engine";
import { getOsintPeriod } from "@/lib/osint-period";

export const metadata: Metadata = { title: "Tạo danh mục đầu tư | QuantumRegTech" };

export default async function PortfolioPage() {
  const data = await getFinancialEngineData().catch((error: unknown) => error instanceof Error ? error : new Error("Không kết nối được dịch vụ dữ liệu."));
  if (data instanceof Error) {
    return <Card><CardHeader><CardTitle>Chưa tải được dữ liệu danh mục</CardTitle><CardDescription>{data.message}</CardDescription></CardHeader></Card>;
  }
  return <PortfolioBuilder records={data.records} penaltyTable={data.penaltyTable} osintPeriod={getOsintPeriod()} />;
}
