"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";

type FinancialItem = { label: string; value: string | number; unit?: string | null };
type TickerFinancials = { period: string | null; reportDate: string | null; items: FinancialItem[]; recordCount: number };
type SyncSnapshot = {
  status?: string;
  provider?: string;
  fetchedAt?: string | null;
  sourceUrl?: string;
  prices?: Record<string, { date: string; close: number }>;
  fundamentals?: Record<string, TickerFinancials>;
  fundamentalFailures?: { ticker: string; error: string }[];
};

const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";
const dateTimeLabel = (value?: string | null) => value ? new Date(value).toLocaleString("vi-VN") : "—";
const periodLabel = (value?: string | null) => {
  if (!value) return "Chưa có báo cáo";
  const date = new Date(`${value}T00:00:00`);
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `Q${quarter}/${date.getFullYear()}`;
};
const amountLabel = (value: string | number, unit?: string | null) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? `${formatNumber(parsed, 2)}${unit ? ` ${unit}` : ""}` : `${value}${unit ? ` ${unit}` : ""}`;
};

export function FinancialDataSync({ tickers }: { tickers: string[] }) {
  const [snapshot, setSnapshot] = useState<SyncSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/data-sync", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail ?? "Không tải được dữ liệu cập nhật.");
    setSnapshot(payload);
  }, []);

  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu cập nhật.")); }, [load]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/data-sync", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload.detail === "string" ? payload.detail : payload.detail?.message ?? "Không đồng bộ được dữ liệu mới.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không đồng bộ được dữ liệu mới.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Dữ liệu tài chính mới nhất</CardTitle>
          <CardDescription>Giá điều chỉnh và báo cáo doanh nghiệp từ VNDirect.</CardDescription>
        </div>
        <Button onClick={refresh} disabled={loading}>
          {loading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
          {loading ? "Đang cập nhật…" : "Cập nhật dữ liệu"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {snapshot?.fetchedAt && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Đã cập nhật {dateTimeLabel(snapshot.fetchedAt)}</Badge>
          {snapshot.sourceUrl && <a className="inline-flex items-center gap-1 underline underline-offset-2" href={snapshot.sourceUrl} target="_blank" rel="noreferrer">Nguồn dữ liệu <ExternalLink className="size-3" /></a>}
        </div>}
        {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!snapshot?.fetchedAt && !loading && !error && <p className="text-sm text-muted-foreground">Chưa có dữ liệu đồng bộ. Bấm “Cập nhật dữ liệu” để tải giá và báo cáo mới nhất.</p>}
        {snapshot?.fetchedAt && <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="border-b bg-muted/30 text-xs text-muted-foreground"><th className="p-3">Mã</th><th className="p-3">Giá đóng cửa điều chỉnh</th><th className="p-3">Ngày giá</th><th className="p-3">Kỳ báo cáo mới nhất</th><th className="p-3">Số chỉ tiêu</th></tr></thead>
            <tbody>{tickers.map((ticker) => {
              const price = snapshot.prices?.[ticker];
              const financials = snapshot.fundamentals?.[ticker];
              return <tr key={ticker} className="border-b last:border-0">
                <td className="p-3 font-semibold">{ticker}</td>
                <td className="p-3 font-mono">{price ? `${formatNumber(price.close * 1000, 0)} ₫` : "—"}</td>
                <td className="p-3">{dateLabel(price?.date)}</td>
                <td className="p-3">{periodLabel(financials?.period)}</td>
                <td className="p-3">{financials?.items.length ? <details>
                  <summary className="cursor-pointer text-primary">{financials.items.length} chỉ tiêu</summary>
                  <div className="mt-2 grid gap-x-5 gap-y-1 sm:grid-cols-2">{financials.items.map((item) => <div key={item.label} className="flex justify-between gap-3 border-b py-1 text-xs"><span>{item.label}</span><span className="font-mono">{amountLabel(item.value, item.unit)}</span></div>)}</div>
                </details> : <span className="text-muted-foreground">Chưa có</span>}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>}
        {snapshot?.fundamentalFailures?.length ? <p className="text-xs text-muted-foreground">Một số báo cáo chưa tải được: {snapshot.fundamentalFailures.map((item) => item.ticker).join(", ")}.</p> : null}
      </CardContent>
    </Card>
  );
}
