import { Atom, Cpu, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuboHeatmap } from "@/components/charts/QuboHeatmap";
import type { PortfolioResult } from "@/lib/types";

/** Tab "Lõi Lượng tử" – luôn gắn nhãn "Mô phỏng / Vòng 2". */
export function QuantumCore({ qubo }: { qubo: PortfolioResult["qubo"] }) {
  const stats = [
    { icon: Atom, label: "Số qubit", value: String(qubo.numQubits) },
    { icon: Layers, label: "Bit rời rạc / tài sản", value: String(qubo.bitsPerAsset) },
    { icon: Cpu, label: "Độ sâu mạch dự kiến", value: "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-quantum/30 bg-quantum/5 p-3 text-xs">
        <Badge variant="secondary" className="h-auto bg-quantum px-2 py-0.5 text-[10px] font-semibold text-quantum-foreground">
          Mô phỏng / Vòng 2
        </Badge>
        <span className="text-muted-foreground">
          Bài toán tối ưu được mã hoá thành QUBO để giải bằng QAOA. Chưa chạy trên phần cứng lượng tử.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-quantum/10 text-quantum">
              <Icon className="size-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="font-mono text-lg font-bold tabular">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">Ma trận QUBO Q</p>
        <QuboHeatmap matrix={qubo.matrix} numQubits={qubo.numQubits} />
      </div>
    </div>
  );
}
