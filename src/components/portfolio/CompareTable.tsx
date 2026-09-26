import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPct } from "@/lib/format";
import type { PortfolioResult } from "@/lib/types";
import { cn } from "@/lib/utils";

/** So sánh Baseline (Markowitz) vs ESG-aware: tỷ trọng, lợi nhuận kỳ vọng, lợi nhuận thực tế. */
export function CompareTable({ portfolio, tickers }: { portfolio: PortfolioResult; tickers: string[] }) {
  const { baseline, esgAware } = portfolio;
  const rows = [
    ...tickers.map((t) => ({ label: `Tỷ trọng ${t}`, a: baseline.weights[t], b: esgAware.weights[t], digits: 1, highlight: false })),
    { label: "Lợi nhuận kỳ vọng", a: baseline.expectedReturn, b: esgAware.expectedReturn, digits: 2, highlight: false },
    { label: "Lợi nhuận thực tế", a: baseline.realizedReturn, b: esgAware.realizedReturn, digits: 2, highlight: true },
  ];

  return (
    <Table className="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead />
          <TableHead className="text-right">Baseline (Markowitz)</TableHead>
          <TableHead className="text-right text-primary">ESG-aware (RegTech)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.label} className={cn(r.highlight && "bg-primary/5 font-semibold")}>
            <TableCell>{r.label}</TableCell>
            <TableCell className="text-right font-mono tabular">{formatPct(r.a, r.digits)}</TableCell>
            <TableCell className="text-right font-mono tabular">{formatPct(r.b, r.digits)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
