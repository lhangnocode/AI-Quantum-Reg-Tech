import type { Metadata } from "next";
import { Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFinancialEngineData } from "@/lib/financial-engine";

export const metadata: Metadata = { title: "Bộ máy tài chính | QuantumRegTech" };

const formatNumber = (value: number, digits = 2) => new Intl.NumberFormat("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const formatPct = (value: number) => `${formatNumber(value * 100, 2)}%`;
const zoneLabel: Record<string, string> = { SAFE: "An toàn", GREY: "Vùng xám", DISTRESS: "Nguy cơ" };

export default async function FinancialEnginePage() {
  let payload: Awaited<ReturnType<typeof getFinancialEngineData>>;
  try {
    payload = await getFinancialEngineData(2024);
  } catch (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Chưa tải được bộ máy tài chính</CardTitle><CardDescription>{error instanceof Error ? error.message : "Không kết nối được dịch vụ dữ liệu."}</CardDescription></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Khởi động FastAPI rồi tải lại trang này.</CardContent>
      </Card>
    );
  }

  const records = [...payload.records].sort((a, b) => a.ticker.localeCompare(b.ticker));
  const meanEsg = records.reduce((sum, item) => sum + item.calculated.esg.total, 0) / Math.max(records.length, 1);
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Database className="size-4" /> Phân tích dữ liệu tài chính và thị trường</div>
        <h1 className="text-2xl font-semibold tracking-tight">Bộ máy tài chính</h1>
        <p className="text-sm text-muted-foreground">Các chỉ số tài chính, lợi suất và điểm ESG được hệ thống tính theo phương pháp đã cấu hình.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardDescription>Doanh nghiệp</CardDescription><CardTitle>{records.length} mã</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>ESG trung bình</CardDescription><CardTitle>{formatNumber(meanEsg, 4)} / 1</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Phân vị tương đối trong nhóm {records.length} doanh nghiệp</CardContent></Card>
        <Card><CardHeader><CardDescription>Tối ưu danh mục</CardDescription><CardTitle>{payload.optimizerReadiness.ready ? "Sẵn sàng" : "Cần rà soát dữ liệu"}</CardTitle></CardHeader></Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Kết quả tính từ dữ liệu gốc</CardTitle>
          <CardDescription>Chỉ số tài chính, thị trường và ESG của doanh nghiệp.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Mã</TableHead><TableHead>Điểm Altman Z</TableHead><TableHead>Vùng rủi ro</TableHead><TableHead>Rủi ro tài chính tổng</TableHead>
              <TableHead>CAPM</TableHead><TableHead>Điểm ESG</TableHead><TableHead>Môi trường / Xã hội / Quản trị</TableHead>
            </TableRow></TableHeader>
            <TableBody>{records.map((record) => {
              const { altman, returns, esg } = record.calculated;
              return <TableRow id={record.ticker} key={record.ticker} className="scroll-mt-4">
                <TableCell className="font-semibold">{record.ticker}</TableCell>
                <TableCell>{formatNumber(altman.zScore)}</TableCell>
                <TableCell><Badge variant={altman.zone === "DISTRESS" ? "destructive" : "secondary"}>{zoneLabel[altman.zone] ?? altman.zone}</Badge></TableCell>
                <TableCell>{formatPct(altman.rFinTotal)}</TableCell>
                <TableCell>{formatPct(returns.capmExpected)}</TableCell>
                <TableCell className="font-medium">{formatNumber(esg.total, 4)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatNumber(esg.pillars.E, 2)} / {formatNumber(esg.pillars.S, 2)} / {formatNumber(esg.pillars.G, 2)}</TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
