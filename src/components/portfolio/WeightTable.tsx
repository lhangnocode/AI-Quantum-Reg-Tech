import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBillion, formatNumber, formatPct } from "@/lib/format";
import type { CompanyOverview } from "@/lib/overview";
import type { Weights } from "@/lib/types";

/** Bảng tỷ trọng: Ri, RFin,Total, ESGi, w*, số tiền. */
export function WeightTable({ items, weights, capital }: { items: CompanyOverview[]; weights: Weights; capital: number }) {
  return (
    <div className="overflow-x-auto">
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead className="text-right">Rᵢ</TableHead>
            <TableHead className="text-right">RFin,Total</TableHead>
            <TableHead className="text-right">ESGi</TableHead>
            <TableHead className="text-right">wᵢ*</TableHead>
            <TableHead className="text-right">Số tiền</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="font-mono tabular">
          {items.map(({ company, esg, rfinTotal }) => {
            const w = weights[company.ticker] ?? 0;
            return (
              <TableRow key={company.ticker}>
                <TableCell className="font-sans font-semibold">{company.ticker}</TableCell>
                <TableCell className="text-right">{formatPct(company.expectedReturn)}</TableCell>
                <TableCell className="text-right">{formatNumber(rfinTotal)}</TableCell>
                <TableCell className="text-right">{formatNumber(esg.esgScore, 4)}</TableCell>
                <TableCell className="text-right font-semibold">{formatPct(w, 1)}</TableCell>
                <TableCell className="text-right">{formatBillion(w * capital)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
