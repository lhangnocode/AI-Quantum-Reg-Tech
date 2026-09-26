import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { X_LABELS } from "@/lib/risk";
import type { Todo } from "@/lib/types";

/** Bảng chỉ tiêu X1–X5 của mô hình Altman. Ô TODO hiển thị "—". */
export function XTable({ values }: { values: Record<(typeof X_LABELS)[number]["key"], Todo<number>> }) {
  return (
    <Table className="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 text-[10px] uppercase">Chỉ tiêu</TableHead>
          <TableHead className="h-8 text-[10px] uppercase">Ý nghĩa</TableHead>
          <TableHead className="h-8 text-right text-[10px] uppercase">Giá trị</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {X_LABELS.map(({ key, label, desc }) => (
          <TableRow key={key}>
            <TableCell className="py-1.5 font-semibold">{label}</TableCell>
            <TableCell className="py-1.5 text-muted-foreground">{desc}</TableCell>
            <TableCell className="py-1.5 text-right font-mono tabular">{formatNumber(values[key], 3)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
