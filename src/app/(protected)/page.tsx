import { Activity, AlertTriangle, Building2 } from "lucide-react";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { EsgCard } from "@/components/dashboard/EsgCard";
import { FinancialHealthCard } from "@/components/dashboard/FinancialHealthCard";
import { OsintCard } from "@/components/dashboard/OsintCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { getOverviews } from "@/lib/overview";

export default async function DashboardPage() {
  const items = await getOverviews();

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
  return (
    <div className="space-y-5">
      {/* Hàng KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Doanh nghiệp theo dõi" value={String(items.length)} hint="Ngành thực phẩm và đồ uống" icon={Building2} />
        <StatCard
          label="Sự kiện cần lưu ý"
          value={String(osintAlerts)}
          hint={osintTickers.length ? osintTickers.join(", ") : "Không có"}
          icon={AlertTriangle}
          tone={osintAlerts > 0 ? "grey" : "safe"}
        />
        <StatCard
          label="Doanh nghiệp rủi ro cao"
          value={String(distress.length)}
          hint={distress.length ? distress.join(", ") : "Không có"}
          icon={Activity}
          tone={distress.length > 0 ? "distress" : "safe"}
        />
      </div>

      {/* Lưới 2×2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard
          title="Tạo danh mục đầu tư"
          description="Chọn mã và vốn để nhận tỷ trọng đề xuất theo CAPM, ESGi, rủi ro tài chính và biến động giá."
          action={
            <Link href="/portfolio" className="text-xs font-semibold text-primary hover:underline">
              Mở danh mục
            </Link>
          }
        >
          <p className="text-sm text-muted-foreground">Xem tỷ trọng tự động hoặc tính đề xuất Markowitz + ESG cho các mã đã chọn.</p>
        </DashboardCard>

        <EsgCard items={items} />
        <FinancialHealthCard items={items} />
        <OsintCard items={items} />
      </div>
    </div>
  );
}
