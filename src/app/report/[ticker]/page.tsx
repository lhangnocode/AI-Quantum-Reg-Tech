import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { XTable } from "@/components/company/XTable";
import { ZoneBadge } from "@/components/dashboard/ZoneBadge";
import { PrintButton } from "@/components/report/PrintButton";
import { ReportSection } from "@/components/report/ReportSection";
import { buttonVariants } from "@/components/ui/button";
import { getCompanies, getMethodology, getPortfolio } from "@/lib/api";
import { assess } from "@/lib/assessment";
import { formatBillion, formatEventDate, formatNumber, formatPct, formatText } from "@/lib/format";
import { getOverview } from "@/lib/overview";
import { GREENWASHING_LABEL, OSINT_TYPE_LABEL, ZONE_CLASS } from "@/lib/risk";
import { cn } from "@/lib/utils";

export async function generateStaticParams() {
  return (await getCompanies()).map((c) => ({ ticker: c.ticker }));
}

export async function generateMetadata(props: PageProps<"/report/[ticker]">) {
  const { ticker } = await props.params;
  return { title: `Báo cáo thẩm định ${ticker.toUpperCase()} | QuantumRegTech` };
}

export default async function ReportPage(props: PageProps<"/report/[ticker]">) {
  const { ticker } = await props.params;
  const [overview, portfolio, method, companies] = await Promise.all([
    getOverview(ticker),
    getPortfolio(),
    getMethodology(),
    getCompanies(),
  ]);
  if (!overview) notFound();

  const { company, zscore, esg, allEvents, posint, rfinTotal } = overview;
  const a = assess(overview);
  const w = portfolio.esgAware.weights[company.ticker];
  const wBase = portfolio.baseline.weights[company.ticker];
  const atFloor = w !== undefined && Math.abs(w - portfolio.constraints.minWeight) < 1e-9;
  const today = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date());

  return (
    <div className="space-y-4">
      {/* Thanh công cụ – ẩn khi in */}
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/company/${company.ticker}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft /> Về trang {company.ticker}
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex gap-1" aria-label="Chọn báo cáo">
            {companies.map((c) => (
              <Link
                key={c.ticker}
                href={`/report/${c.ticker}`}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-semibold",
                  c.ticker === company.ticker ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {c.ticker}
              </Link>
            ))}
          </nav>
          <PrintButton />
        </div>
      </div>

      {/* Trang A4 */}
      <article className="report-page mx-auto max-w-[210mm] space-y-5 rounded-lg border bg-card p-[20mm] text-card-foreground shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-3">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-primary uppercase">QuantumRegTech · Báo cáo thẩm định</p>
            <h2 className="text-xl font-bold">
              {company.name} <span className="font-mono">({company.ticker})</span>
            </h2>
            <p className="text-xs text-muted-foreground">Ngày lập: {today}</p>
          </div>
          <Badge variant="outline" className="h-auto gap-1 border-risk-grey/40 px-2 py-0.5 text-[10px] text-risk-grey">
            <FlaskConical /> Dữ liệu mẫu – PoC
          </Badge>
        </header>

        <ReportSection n={1} title="Thông tin doanh nghiệp">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            {[
              ["Mã CK", company.ticker],
              ["Sàn", formatText(company.exchange)],
              ["Ngành", company.subsector],
              ["Năm tài chính", String(zscore.fiscalYear)],
              ["β", formatNumber(company.beta, 3)],
              ["Rᵢ (CAPM)", formatPct(company.expectedReturn)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-dashed py-1">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </ReportSection>

        <ReportSection n={2} title="Kết luận tổng">
          <div className={cn("flex items-start gap-3 rounded-lg border p-3", ZONE_CLASS[a.level].soft)}>
            <Badge variant="secondary" className={cn("h-auto shrink-0 px-2 py-0.5 text-[11px] font-bold", ZONE_CLASS[a.level].text)}>
              {a.label}
            </Badge>
            <p>{a.summary}</p>
          </div>
        </ReportSection>

        <ReportSection n={3} title="Sức khoẻ tài chính – Altman Z-Score">
          <p className="mb-2 flex flex-wrap items-center gap-2">
            Z = <span className="font-mono font-bold">{formatNumber(zscore.z)}</span> <ZoneBadge zone={zscore.zone} /> · RFin,Base ={" "}
            <span className="font-mono font-bold">{formatNumber(zscore.rfinBase)}</span>
          </p>
          <XTable values={zscore} />
        </ReportSection>

        <ReportSection n={4} title="ESG & Tẩy xanh">
          <p>
            ESGi = <span className="font-mono font-bold">{formatNumber(esg.esgScore, 4)}</span> · Rủi ro tẩy xanh:{" "}
            <strong>{esg.greenwashingRisk === "TODO" ? "—" : GREENWASHING_LABEL[esg.greenwashingRisk]}</strong>
          </p>
          {esg.evidence.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {esg.evidence.map((e, i) => (
                <li key={i}>
                  Tuyên bố: {e.claim === "TODO" ? "—" : `“${e.claim}”`} ({formatText(e.claimSource)}) ↔ Ngoại cảnh: {formatText(e.counter)} ({formatText(e.counterSource)}). Mức mâu thuẫn{" "}
                  <span className="font-mono">{formatNumber(e.contradiction)}</span>.
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Chưa có cặp bằng chứng đối chiếu.</p>
          )}
        </ReportSection>

        <ReportSection n={5} title="Sự kiện OSINT (36 tháng)">
          {allEvents.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {allEvents.map((e) => (
                <li key={e.id}>
                  {formatEventDate(e.date)} · {OSINT_TYPE_LABEL[e.type]} · {e.title} (mức {e.severity}, +{formatNumber(e.penalty)}) –{" "}
                  {e.source}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Không ghi nhận sự kiện.</p>
          )}
          <p className="mt-1">
            POSINT = <span className="font-mono font-bold">+{formatNumber(posint)}</span> → RFin,Total ={" "}
            <span className="font-mono font-bold">{formatNumber(rfinTotal)}</span>
          </p>
        </ReportSection>

        <ReportSection n={6} title="Khuyến nghị tỷ trọng">
          <p>
            Mô hình ESG-aware ({formatBillion(portfolio.capital, 0)} VNĐ) phân bổ{" "}
            <span className="font-mono font-bold">{formatPct(w, 1)}</span> ({formatBillion(w === undefined ? undefined : w * portfolio.capital)})
            cho {company.ticker}
            {atFloor && " – mức sàn theo ràng buộc"}; Baseline Markowitz: <span className="font-mono">{formatPct(wBase, 1)}</span>.
          </p>
        </ReportSection>

        <ReportSection n={7} title="Phương pháp & nguồn dữ liệu">
          <ul className="list-disc space-y-0.5 pl-5">
            <li>
              Rf = {formatPct(method.riskFree.value)} ({method.riskFree.source}); ERP = {formatPct(method.equityRiskPremium.value)} (
              {method.equityRiskPremium.source}); <span className="font-mono">{method.capm}</span>.
            </li>
            <li>
              <span className="font-mono">{method.altman}</span> – {method.altmanZones}.
            </li>
            <li>Điểm phạt POSINT: {method.posintTiers}.</li>
            <li>
              Ràng buộc tỷ trọng: {formatPct(portfolio.constraints.minWeight, 0)} ≤ wᵢ ≤ {formatPct(portfolio.constraints.maxWeight, 0)}, Σwᵢ = 100%.
            </li>
            <li>Nguồn số liệu: {method.dataSource}.</li>
          </ul>
        </ReportSection>

        <ReportSection n={8} title="Tuyên bố miễn trừ">
          <p className="text-muted-foreground">
            Báo cáo được tạo tự động từ bản mẫu (PoC) phục vụ AI-Quantum Challenge 2026, sử dụng dữ liệu mẫu và chỉ mang tính minh hoạ.
            Không phải khuyến nghị đầu tư. Các ô “—” là số liệu chưa được nhóm tài chính xác nhận.
          </p>
        </ReportSection>
      </article>
    </div>
  );
}
