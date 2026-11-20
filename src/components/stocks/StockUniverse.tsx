"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, Check, LoaderCircle, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { FinancialDataSync } from "@/components/stocks/FinancialDataSync";
import { formatNumber, formatPct } from "@/lib/format";
import type { CompanyOverview } from "@/lib/overview";
import { usePortfolioStore } from "@/store/portfolio";

export function StockUniverse({ items }: { items: CompanyOverview[] }) {
  const portfolioTickers = items.map((item) => item.company.ticker);
  const [query, setQuery] = useState("");
  const [newTicker, setNewTicker] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [pendingTickers, setPendingTickers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const selected = usePortfolioStore((state) => state.selectedTickers);
  const setSelectedTickers = usePortfolioStore((state) => state.setSelectedTickers);

  useEffect(() => {
    fetch("/api/universe?limit=200")
      .then(async (response) => response.ok ? response.json() : null)
      .then((page) => {
        if (page?.items) setPendingTickers(page.items.filter((entry: { availability: string }) => entry.availability === "pending_data").map((entry: { ticker: string }) => entry.ticker));
      })
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => items.filter(({ company }) =>
    `${company.ticker} ${company.name} ${company.subsector} ${company.exchange}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [items, query]);

  function updateSelection(next: string[]) {
    setSelectedTickers(next);
  }

  function toggle(ticker: string) {
    updateSelection(selected.includes(ticker) ? selected.filter((item) => item !== ticker) : [...selected, ticker]);
  }

  async function registerTicker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormMessage("");
    try {
      const response = await fetch("/api/universe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticker: newTicker.trim().toUpperCase(), source_reference: sourceReference.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? "Không thể thêm mã cổ phiếu.");
      setPendingTickers((current) => current.includes(result.ticker) ? current : [...current, result.ticker].sort());
      setNewTicker("");
      setSourceReference("");
      setFormMessage(`${result.ticker} đã được thêm vào danh mục chờ dữ liệu. Mã chưa có chỉ số để tra cứu hoặc phân bổ.`);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Không thể thêm mã. Hãy kiểm tra kết nối backend.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const allSelected = items.length > 0 && items.every((item) => selected.includes(item.company.ticker));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Danh sách cổ phiếu</h2>
          <p className="text-sm text-muted-foreground">Tìm trong danh sách đã cấu hình, mở hồ sơ doanh nghiệp hoặc chọn mã cho danh mục.</p>
        </div>
          <Badge variant="outline">{items.length} mã có dữ liệu · {pendingTickers.length} mã chờ dữ liệu</Badge>
      </header>

      <DashboardCard title="Thêm mã cổ phiếu" description="Đăng ký mã ngoài bộ dữ liệu hiện có. Cần nguồn tham chiếu; mã mới sẽ ở trạng thái chờ cho tới khi bổ sung và kiểm tra dữ liệu tài chính, thị trường và ESG.">
        <form onSubmit={registerTicker} className="grid gap-3 sm:grid-cols-[minmax(120px,0.4fr)_minmax(220px,1fr)_auto] sm:items-end">
          <label className="space-y-1 text-xs font-medium">Mã cổ phiếu
            <Input required maxLength={12} pattern="[A-Za-z0-9.\\-]+" value={newTicker} onChange={(event) => setNewTicker(event.target.value.toUpperCase())} placeholder="Ví dụ: QNS" />
          </label>
          <label className="space-y-1 text-xs font-medium">Nguồn tham chiếu
            <Input required maxLength={500} value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} placeholder="URL báo cáo hoặc trang doanh nghiệp" />
          </label>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="mr-1 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}Thêm mã</Button>
        </form>
        {formMessage && <p role="status" className="mt-3 text-xs text-muted-foreground">{formMessage}</p>}
        {pendingTickers.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs"><span className="text-muted-foreground">Đang chờ dữ liệu:</span>{pendingTickers.map((ticker) => <Badge key={ticker} variant="outline">{ticker} · Chờ dữ liệu</Badge>)}</div>}
      </DashboardCard>

      <FinancialDataSync tickers={portfolioTickers} />

      <DashboardCard title="Chỉ số phân tích" description="Z-Score, CAPM và ESG theo bộ dữ liệu đã chuẩn hóa; báo cáo mới nhất được cập nhật ở khối phía trên.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên doanh nghiệp, ngành hoặc sàn" className="pl-9" aria-label="Tìm trong danh sách cổ phiếu" />
            </div>
              <Button size="sm" variant="secondary" onClick={() => updateSelection(portfolioTickers)}>Chọn cả {portfolioTickers.length} mã</Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-xs"><span className="font-semibold">{selected.length} mã được chọn</span><span className="text-muted-foreground"> · hệ thống sẽ tính tỷ trọng cho các mã này</span></p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => updateSelection([])} disabled={selected.length === 0}><X className="mr-1 size-3.5" />Bỏ chọn</Button>
              <Link href="/portfolio" onClick={() => setSelectedTickers(selected)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/80">Mở danh mục <ArrowUpRight className="size-3.5" /></Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead><tr className="border-b text-muted-foreground"><th className="w-10 p-2">Chọn</th><th className="p-2">Mã / doanh nghiệp</th><th className="p-2">Ngành</th><th className="p-2">Sàn</th><th className="p-2">Lợi suất kỳ vọng</th><th className="p-2">Điểm ESG</th><th className="p-2">Điểm Altman Z</th><th className="p-2">Vùng rủi ro</th><th className="p-2">Rủi ro tài chính</th><th className="p-2">Sự kiện công khai</th></tr></thead>
              <tbody>{filtered.map((item) => {
                const { company, zscore, esg, events, rfinTotal } = item;
                const checked = selected.includes(company.ticker);
                const detailHref = `/company/${company.ticker}`;
                const zoneLabel: Record<string, string> = { safe: "An toàn", grey: "Vùng xám", distress: "Nguy cơ" };
                return <tr key={company.ticker} className={`border-b last:border-0 ${checked ? "bg-primary/[0.035]" : ""}`}>
                  <td className="p-2"><button type="button" role="checkbox" aria-checked={checked} aria-label={`Chọn ${company.ticker}`} onClick={() => toggle(company.ticker)} className={`flex size-5 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>{checked && <Check className="size-3.5" />}</button></td>
                  <td className="p-2"><Link href={detailHref} className="font-semibold text-primary hover:underline">{company.ticker}</Link><div className="max-w-64 truncate text-muted-foreground">{company.name}</div></td>
                  <td className="p-2">{company.subsector}</td><td className="p-2">{company.exchange === "TODO" ? "—" : company.exchange}</td>
              <td className="p-2 font-mono">{formatPct(company.expectedReturn)}</td><td className="p-2 font-mono">{formatNumber(esg.esgScore)}</td><td className="p-2 font-mono">{formatNumber(zscore.z)}</td>
                  <td className="p-2"><Badge variant="outline">{zoneLabel[zscore.zone] ?? zscore.zone}</Badge></td><td className="p-2 font-mono">{formatNumber(rfinTotal)}</td><td className="p-2">{events.length ? <Badge variant="secondary">{events.length} sự kiện</Badge> : <span className="text-muted-foreground">Không có</span>}</td>
                </tr>;
              })}</tbody>
            </table>
            {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy mã phù hợp.</p>}
          </div>
        </div>
      </DashboardCard>

      <p className="text-xs text-muted-foreground">Xem tỷ trọng đề xuất cho các mã đã chọn tại trang Danh mục.</p>
    </div>
  );
}
