"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Leaf, ShieldCheck, TrendingUp } from "lucide-react";
import { OsintScanner } from "@/components/company/OsintScanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPct } from "@/lib/format";
import type { FinancialEngineRecord } from "@/lib/financial-engine";
import { usePortfolioStore } from "@/store/portfolio";
import { PortfolioOptimizer } from "./PortfolioOptimizer";

const STOCK_INFO: Record<string, { name: string; sector: string }> = {
  IDP: { name: "Sữa Quốc tế LOF", sector: "Sữa · đồ uống" },
  KDC: { name: "Tập đoàn KIDO", sector: "Thực phẩm · dầu ăn" },
  MCH: { name: "Hàng tiêu dùng Masan", sector: "Hàng tiêu dùng" },
  MCM: { name: "Sữa Mộc Châu", sector: "Sữa" },
  PAN: { name: "Tập đoàn PAN", sector: "Nông nghiệp · thực phẩm" },
  QNS: { name: "Đường Quảng Ngãi", sector: "Đường · sữa đậu nành" },
  SAB: { name: "Bia Sài Gòn", sector: "Bia · nước giải khát" },
  SBT: { name: "TTC AgriS", sector: "Đường" },
  VNM: { name: "Sữa Việt Nam", sector: "Sữa" },
};

const formatMoney = (amount: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount);
/** R_fin,total sau khi tính mức OSINT người dùng vừa chấp nhận: mức cao nhất (workbook, chấp nhận) → bảng Params. */
function withAcceptedOsint(record: FinancialEngineRecord, accepted: number, penaltyTable: Record<string, number>): FinancialEngineRecord {
  const level = Math.max(record.calculated.osint.penaltyLevel, accepted);
  if (level === record.calculated.osint.penaltyLevel) return record;
  const penalty = penaltyTable[String(level)] ?? record.calculated.osint.penalty;
  return {
    ...record,
    calculated: {
      ...record.calculated,
      altman: { ...record.calculated.altman, rFinTotal: record.calculated.altman.rFinBase + penalty },
      osint: { ...record.calculated.osint, penaltyLevel: level, penalty },
    },
  };
}

export function PortfolioBuilder({ records, penaltyTable, osintPeriod }: { records: FinancialEngineRecord[]; penaltyTable: Record<string, number>; osintPeriod: { fromDate: string; toDate: string } }) {
  const years = useMemo(() => [...new Set(records.map((r) => r.dataYear))].sort((a, b) => a - b), [records]);
  const [dataYear, setDataYear] = useState(years[years.length - 1]);
  // Mức OSINT người dùng chấp nhận trong phiên, theo `${năm}:${mã}`.
  const [acceptedLevels, setAcceptedLevels] = useState<Record<string, number>>({});
  const [osintTicker, setOsintTicker] = useState("");
  const sortedRecords = useMemo(() => records
    .filter((r) => r.dataYear === dataYear)
    .map((r) => withAcceptedOsint(r, acceptedLevels[`${dataYear}:${r.ticker}`] ?? 0, penaltyTable))
    .sort((a, b) => a.ticker.localeCompare(b.ticker)), [records, dataYear, acceptedLevels, penaltyTable]);
  const selectedTickers = usePortfolioStore((state) => state.selectedTickers);
  const setSelectedTickers = usePortfolioStore((state) => state.setSelectedTickers);
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  useEffect(() => {
    if (!selectionInitialized && sortedRecords.length) {
      if (!selectedTickers.length) setSelectedTickers(sortedRecords.map((record) => record.ticker));
      setSelectionInitialized(true);
    }
  }, [selectionInitialized, selectedTickers, setSelectedTickers, sortedRecords]);
  const [capital, setCapital] = useState(2_000_000_000);
  const [appliedOptimizer, setAppliedOptimizer] = useState<{ dataYear: number; tickers: string[]; weights: Record<string, number> } | null>(null);
  const selectedRecords = useMemo(() => sortedRecords.filter((record) => selectedTickers.includes(record.ticker)), [sortedRecords, selectedTickers]);
  const optimizerStillMatches = appliedOptimizer?.dataYear === dataYear
    && appliedOptimizer.tickers.length === selectedRecords.length
    && selectedRecords.every((record) => appliedOptimizer.tickers.includes(record.ticker));
  const weights = useMemo(() => optimizerStillMatches && appliedOptimizer ? new Map(Object.entries(appliedOptimizer.weights)) : new Map<string, number>(), [optimizerStillMatches, appliedOptimizer]);
  const cap = 0.4;

  const expected = selectedRecords.reduce((sum, record) => sum + (weights.get(record.ticker) ?? 0) * record.calculated.returns.capmExpected, 0);
  const esgTotal = selectedRecords.reduce((sum, record) => sum + (weights.get(record.ticker) ?? 0) * record.calculated.esg.total, 0);
  const riskTotal = selectedRecords.reduce((sum, record) => sum + (weights.get(record.ticker) ?? 0) * record.calculated.altman.rFinTotal, 0);
  const allocations = useMemo(() => {
    const amounts = selectedRecords.map((record) => Math.round(capital * (weights.get(record.ticker) ?? 0)));
    if (amounts.length) amounts[amounts.length - 1] += capital - amounts.reduce((sum, amount) => sum + amount, 0);
    return new Map(selectedRecords.map((record, index) => [record.ticker, amounts[index]]));
  }, [capital, selectedRecords, weights]);

  function toggleTicker(ticker: string) {
    setAppliedOptimizer(null);
    setSelectedTickers(selectedTickers.includes(ticker)
      ? selectedTickers.filter((item) => item !== ticker)
      : [...selectedTickers, ticker]);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">Phân bổ vốn theo lựa chọn của anh</p>
        <h2 className="text-2xl font-semibold tracking-tight">Tạo danh mục đầu tư</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">Chọn cổ phiếu và số vốn để nhận đề xuất phân bổ danh mục.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Chọn cổ phiếu</CardTitle><CardDescription>{selectedRecords.length} mã đã chọn trong tổng số {sortedRecords.length} mã có dữ liệu</CardDescription></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {sortedRecords.map((record) => {
                const selected = selectedTickers.includes(record.ticker);
                const info = STOCK_INFO[record.ticker];
                return <label key={record.ticker} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${selected ? "border-primary/50 bg-primary/[0.035]" : "hover:bg-muted/40"}`}>
                  <input type="checkbox" checked={selected} onChange={() => toggleTicker(record.ticker)} className="mt-1 size-4 accent-primary" />
                  <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="font-semibold">{record.ticker}</span><span className="font-mono text-xs text-muted-foreground">{formatPct(record.calculated.returns.capmExpected)}</span></span>
                    <span className="block truncate text-xs text-muted-foreground">{info?.name ?? record.ticker} · {info?.sector ?? "Thực phẩm và đồ uống"}</span>
                  </span>
                </label>;
              })}
            </CardContent>
            <div className="flex flex-wrap gap-2 px-6 pb-5">
              <Button size="sm" variant="outline" onClick={() => { setAppliedOptimizer(null); setSelectedTickers(sortedRecords.map((r) => r.ticker)); }}>Chọn tất cả</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAppliedOptimizer(null); setSelectedTickers([]); }}>Bỏ chọn tất cả</Button>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quy mô vốn</CardTitle><CardDescription>Điều chỉnh số vốn áp dụng cho tỷ trọng đang chọn.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <label className="flex max-w-md items-center gap-3 text-sm"><span className="shrink-0 text-muted-foreground">Tổng vốn (VNĐ)</span><input type="number" min={1_000_000} step={10_000_000} value={capital} onChange={(event) => setCapital(Math.max(1_000_000, Number(event.target.value) || 1_000_000))} className="h-9 w-full rounded-md border bg-background px-3 font-mono" /></label>
              <div className="flex flex-wrap gap-2 border-t pt-4 text-xs text-muted-foreground">
                <Badge variant="outline">Trần mỗi mã: {formatPct(cap, 0)}</Badge>
                <Badge variant="outline">Tổng tỷ trọng: 100%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="size-5 text-primary" /> Phân bổ đề xuất {optimizerStillMatches && <Badge variant="outline">Markowitz + ESG</Badge>}</CardTitle><CardDescription>{optimizerStillMatches ? "Tỷ trọng đã được tối ưu cho danh mục đã chọn." : "Đề xuất tỷ trọng đang được cập nhật theo danh mục đã chọn."}</CardDescription></CardHeader>
            <CardContent>
              {selectedRecords.length < 3 ? <p className="py-10 text-center text-sm text-muted-foreground">Chọn ít nhất ba mã để tạo danh mục.</p> : !optimizerStillMatches ? <p className="py-10 text-center text-sm text-muted-foreground">Đang tối ưu tỷ trọng cho các mã đã chọn…</p> : <div className="space-y-4">
                {selectedRecords.map((record) => {
                  const weight = weights.get(record.ticker) ?? 0;
                  const allocation = allocations.get(record.ticker) ?? 0;
                  return <div key={record.ticker} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{record.ticker}<span className="ml-2 font-normal text-muted-foreground">{STOCK_INFO[record.ticker]?.name}</span></span><span className="font-mono font-semibold tabular-nums">{formatPct(weight, 2)}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${weight * 100}%` }} /></div>
                    <p className="text-right text-xs text-muted-foreground">{formatMoney(allocation)} VNĐ</p>
                  </div>;
                })}
                <div className="flex justify-between border-t pt-3 text-sm font-semibold"><span>Tổng phân bổ</span><span>{formatMoney(capital)} VNĐ · 100%</span></div>
              </div>}
            </CardContent>
          </Card>

          {optimizerStillMatches && <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="CAPM danh mục" value={formatPct(expected)} icon={TrendingUp} />
            <Metric label="Điểm ESG danh mục" value={formatNumber(esgTotal, 3)} icon={Leaf} />
            <Metric label="Rủi ro tài chính bình quân" value={formatPct(riskTotal)} icon={ShieldCheck} />
          </div>}
        </div>
      </div>

      <PortfolioOptimizer
        dataYear={dataYear}
        tickers={selectedRecords.map((record) => record.ticker)}
        capital={capital}
        acceptedOsintLevels={Object.fromEntries(selectedRecords.map((record) => [record.ticker, acceptedLevels[`${dataYear}:${record.ticker}`] ?? 0]))}
        onApply={(nextWeights) => setAppliedOptimizer({ dataYear, tickers: selectedRecords.map((record) => record.ticker), weights: nextWeights })}
        onReturnToManual={() => setAppliedOptimizer(null)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Theo dõi sự kiện xử phạt</CardTitle>
          <CardDescription>Chọn khoảng thời gian quét đến hôm nay. Chỉ sự kiện bạn chấp nhận mới cập nhật mức rủi ro trong phiên.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedRecords.length === 0 ? <p className="text-sm text-muted-foreground">Chọn cổ phiếu trước khi quét OSINT.</p> : <>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Mã cần quét OSINT">
              {selectedRecords.map((record) => {
                const accepted = acceptedLevels[`${dataYear}:${record.ticker}`] ?? 0;
                return <Button key={record.ticker} size="sm" variant={osintTicker === record.ticker ? "default" : "outline"} onClick={() => setOsintTicker(record.ticker)}>
                  {record.ticker} · mức {record.calculated.osint.penaltyLevel}{accepted > 0 ? " (đã chấp nhận)" : ""}
                </Button>;
              })}
            </div>
            {(() => {
              const record = records.find((r) => r.dataYear === dataYear && r.ticker === osintTicker && selectedTickers.includes(r.ticker));
              if (!record) return <p className="text-xs text-muted-foreground">Chọn một mã để quét. Mỗi lượt quét là một job Firecrawl Agent (tốn credit, thường vài phút).</p>;
              return <OsintScanner
                key={`${osintPeriod.fromDate}:${osintPeriod.toDate}:${record.ticker}`}
                ticker={record.ticker}
                fromDate={osintPeriod.fromDate}
                toDate={osintPeriod.toDate}
                rfinBase={record.calculated.altman.rFinBase}
                workbookLevel={record.calculated.osint.penaltyLevel}
                penaltyTable={penaltyTable}
                existingUrls={record.calculated.osint.events.map((event) => event.sourceUrl ?? "").filter(Boolean)}
                onAcceptedLevel={(ticker, level) => {
                  setAppliedOptimizer(null);
                  setAcceptedLevels((current) => ({ ...current, [`${dataYear}:${ticker}`]: level }));
                }}
              />;
            })()}
          </>}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof TrendingUp }) {
  return <Card size="sm"><CardContent className="flex items-center gap-3 pt-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><span><span className="block text-xs text-muted-foreground">{label}</span><span className="font-semibold tabular-nums">{value}</span></span></CardContent></Card>;
}
