import { AlertTriangle, FileText, ScanText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EMPTY, formatNumber } from "@/lib/format";
import type { DocumentExtraction } from "@/lib/types";

/** Bảng 9 chỉ tiêu trích từ BCTC – kèm trang, cách đọc (lớp chữ / OCR) và dòng gốc để đối chiếu. */
export function ExtractionTable({ extraction }: { extraction: DocumentExtraction }) {
  const { fields, warnings, pages, processedPages, ocrPages, unit } = extraction;
  const found = fields.filter((f) => f.value !== null).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="h-auto px-2 py-0.5 text-[11px]">
          {found}/{fields.length} chỉ tiêu
        </Badge>
        <span>
          Đã xử lý {processedPages}/{pages} trang ·{" "}
          {ocrPages.length > 0 ? `OCR trang ${ocrPages.join(", ")}` : "đọc lớp chữ, không cần OCR"}
          {unit && ` · Đơn vị: ${unit}`}
        </span>
      </div>

      {warnings.length > 0 && (
        <Alert className="border-risk-grey/40 bg-risk-grey/5">
          <AlertTriangle className="text-risk-grey" />
          <AlertTitle>Cần kiểm tra lại</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Chỉ tiêu</TableHead>
              <TableHead className="text-center">Mã số</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
              <TableHead className="text-center">Trang</TableHead>
              <TableHead>Dòng gốc trong báo cáo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((f) => (
              <TableRow key={f.key}>
                <TableCell className="font-medium">{f.label}</TableCell>
                <TableCell className="text-center font-mono">{f.code}</TableCell>
                <TableCell className="text-right font-mono tabular">
                  {f.value === null ? <span className="text-risk-distress">Không tìm thấy</span> : formatNumber(f.value, 0)}
                </TableCell>
                <TableCell className="text-center">
                  {f.page ? (
                    <span className="inline-flex items-center gap-1" title={f.source === "ocr" ? "Nhận dạng ký tự (OCR)" : "Lớp chữ của PDF"}>
                      {f.source === "ocr" ? <ScanText className="size-3" /> : <FileText className="size-3" />}
                      {f.page}
                    </span>
                  ) : (
                    EMPTY
                  )}
                </TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground" title={f.line}>
                  {f.line ?? EMPTY}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
