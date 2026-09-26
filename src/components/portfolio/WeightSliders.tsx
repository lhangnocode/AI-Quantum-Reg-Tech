"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { InfoTip } from "@/components/common/InfoTip";
import { formatNumber } from "@/lib/format";
import type { PortfolioParams } from "@/lib/types";
import { usePortfolioStore, type Solver } from "@/store/portfolio";

const PARAMS: { key: keyof PortfolioParams; symbol: string; label: string; hint: string }[] = [
  { key: "alpha", symbol: "α", label: "Lợi nhuận", hint: "Trọng số lợi nhuận kỳ vọng Rᵢ (CAPM)" },
  { key: "beta", symbol: "β", label: "Rủi ro biến động", hint: "Trọng số phạt phương sai danh mục" },
  { key: "gamma", symbol: "γ", label: "ESG", hint: "Trọng số thưởng điểm ESGi" },
  { key: "delta", symbol: "δ", label: "Phạt rủi ro", hint: "Trọng số phạt RFin,Total (Z-Score + OSINT)" },
];

const SOLVERS = [
  { value: "classical-cobyla", label: "Cổ điển (COBYLA)" },
  { value: "qaoa", label: "Lượng tử (QAOA) – sắp có" },
];

export function WeightSliders() {
  const { params, solver, setParam, setSolver, resetParams } = usePortfolioStore();

  return (
    <div className="space-y-5">
      {PARAMS.map(({ key, symbol, label, hint }) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <span className="font-mono text-sm font-bold text-primary">{symbol}</span> {label}
              <InfoTip label={label}>{hint}</InfoTip>
            </Label>
            <span className="font-mono text-xs tabular">{formatNumber(params[key], 2)}</span>
          </div>
          <Slider
            value={[params[key]]}
            min={0}
            max={1}
            step={0.05}
            getAriaLabel={() => `${symbol} – ${label}`}
            onValueChange={(v) => setParam(key, Array.isArray(v) ? v[0] : v)}
          />
        </div>
      ))}

      <div className="space-y-2 border-t pt-4">
        <Label className="text-xs font-medium">Bộ giải (solver)</Label>
        <Select items={SOLVERS} value={solver} onValueChange={(v) => v && setSolver(v as Solver)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOLVERS.map((s) => (
              <SelectItem key={s.value} value={s.value} disabled={s.value === "qaoa"}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="ghost" size="sm" onClick={resetParams} className="w-full">
        <RotateCcw /> Đặt lại tham số
      </Button>
    </div>
  );
}
