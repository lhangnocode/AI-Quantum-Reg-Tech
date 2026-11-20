"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatNumber, formatPct } from "@/lib/format";

type OptimizerMetrics = {
  expectedReturn: number;
  esgScore: number;
  rFinTotal: number;
  annualizedVolatility: number;
};
type OptimizerPayload = {
  status: "prototype";
  dataYear: number;
  tickers: string[];
  gamma: number;
  delta: number;
  riskAversionLambda: number;
  observations: { ticker: string; observations: number }[];
  weights: Record<string, number>;
  baselineWeights: Record<string, number>;
  metrics: OptimizerMetrics;
  baselineMetrics: OptimizerMetrics;
};

const money = (amount: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount);

export function PortfolioOptimizer({ dataYear, tickers, capital, acceptedOsintLevels, onApply }: {
  dataYear: number;
  tickers: string[];
  capital: number;
  acceptedOsintLevels: Record<string, number>;
  onApply: (weights: Record<string, number>) => void;
}) {
  const [gammaStep, setGammaStep] = useState(30);
  const [deltaStep, setDeltaStep] = useState(25);
  const [result, setResult] = useState<(OptimizerPayload & { signature: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestedSignature = useRef("");
  const gamma = gammaStep / 100;
  const delta = deltaStep / 100;
  const accepted = Object.fromEntries(tickers.map((ticker) => [ticker, acceptedOsintLevels[ticker] ?? 0]));
  const signature = useMemo(() => JSON.stringify({ dataYear, tickers: [...tickers].sort(), gamma, delta, accepted }), [dataYear, tickers, gamma, delta, accepted]);
  const currentResult = result?.signature === signature ? result : null;

  async function calculate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/portfolio/optimize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data_year: dataYear, tickers, gamma, delta, accepted_osint_levels: accepted }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? "Không tính được phương án tối ưu.");
      setResult({ ...payload, signature });
      onApply(payload.weights);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tính được phương án tối ưu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tickers.length >= 3 && requestedSignature.current !== signature) {
      requestedSignature.current = signature;
      void calculate();
    }
  }, [signature]);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2"><BrainCircuit className="size-5 text-primary" />Tối ưu danh mục</CardTitle>
            <CardDescription>Hệ thống tự cân đối lợi suất kỳ vọng, ESG, rủi ro tài chính và biến động giá.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <CoefficientSlider label="γ · mức ưu tiên ESG" value={gammaStep} onChange={setGammaStep} />
          <CoefficientSlider label="δ · mức phạt RFin" value={deltaStep} onChange={setDeltaStep} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={calculate} disabled={loading || tickers.length < 3}>
            {loading ? <LoaderCircle className="animate-spin" /> : null}{loading ? "Đang tối ưu" : "Cập nhật đề xuất"}
          </Button>
        </div>
        {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        {loading && !currentResult && <p role="status" className="text-sm text-muted-foreground">Tính tỷ trọng phù hợp với danh mục đã chọn…</p>}

        {currentResult && <div className="space-y-4 border-t pt-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Lợi suất kỳ vọng" value={currentResult.metrics.expectedReturn} percent />
            <Metric label="Biến động năm hóa" value={currentResult.metrics.annualizedVolatility} percent />
            <Metric label="Điểm ESG" value={currentResult.metrics.esgScore} />
            <Metric label="Rủi ro tài chính" value={currentResult.metrics.rFinTotal} />
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[360px] text-left text-xs">
              <thead><tr className="border-b bg-muted/30 text-muted-foreground"><th className="p-2">Mã</th><th className="p-2">Tỷ trọng đề xuất</th><th className="p-2">Vốn đề xuất</th></tr></thead>
              <tbody>{currentResult.tickers.map((ticker) => <tr key={ticker} className="border-b last:border-0">
                <td className="p-2 font-semibold">{ticker}</td>
                <td className="p-2 font-mono">{formatPct(currentResult.weights[ticker], 2)}</td>
                <td className="p-2 font-mono">{money(capital * currentResult.weights[ticker])} ₫</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>}
      </CardContent>
    </Card>
  );
}

function CoefficientSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-3"><Label className="text-sm">{label}</Label><span className="font-mono text-sm tabular-nums">{(value / 100).toFixed(2)}</span></div>
    <Slider value={[value]} min={0} max={30} step={1} getAriaLabel={() => label} onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)} />
  </div>;
}

function Metric({ label, value, percent = false }: { label: string; value: number; percent?: boolean }) {
  const format = percent ? formatPct(value, 2) : formatNumber(value, 3);
  return <div className="rounded-lg border p-2.5">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="mt-1 font-mono text-sm font-semibold tabular-nums">{format}</p>
  </div>;
}
