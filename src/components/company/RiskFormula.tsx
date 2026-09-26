import { formatNumber } from "@/lib/format";
import type { Todo } from "@/lib/types";
import { cn } from "@/lib/utils";

function Term({ label, value, emphasis }: { label: string; value: Todo<number>; emphasis?: boolean }) {
  return (
    <div className={cn("flex min-w-20 flex-col items-center rounded-xl border px-3 py-2.5", emphasis && "border-primary/40 bg-primary/5")}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-xl font-bold tabular", emphasis && "text-primary")}>{formatNumber(value)}</span>
    </div>
  );
}

/** Công thức trực quan RFin,Base + POSINT = RFin,Total. */
export function RiskFormula({ base, posint, total }: { base: Todo<number>; posint: Todo<number>; total: Todo<number> }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-lg text-muted-foreground">
      <Term label="RFin,Base" value={base} />
      <span>+</span>
      <Term label="POSINT" value={posint} />
      <span>=</span>
      <Term label="RFin,Total" value={total} emphasis />
    </div>
  );
}
