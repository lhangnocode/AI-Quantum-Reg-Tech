import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { XTable } from "@/components/company/XTable";
import { ZoneBadge } from "@/components/dashboard/ZoneBadge";
import { PrintButton } from "@/components/report/PrintButton";
import { ReportSection } from "@/components/report/ReportSection";
import { buttonVariants } from "@/components/ui/button";
import { getCompanies, getEsgIndicators, getMethodology } from "@/lib/api";
import { PILLARS, pillarDisclosure } from "@/lib/esg";
import { assess } from "@/lib/assessment";
import { formatEventDate, formatNumber, formatPct, formatText } from "@/lib/format";
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
  const [overview, method, companies, esgSet] = await Promise.all([
    getOverview(ticker),
    getMethodology(),
    getCompanies(),
    getEsgIndicators(),
  ]);
  if (!overview) notFound();

  const { company, zscore, esg, allEvents, posint, rfinTotal } = overview;
  const a = assess(overview);
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
            <strong>{esg.greenwashingRisk === "TODO" ? "chưa đánh giá" : GREENWASHING_LABEL[esg.greenwashingRisk]}</strong>
          </p>
          {esgSet.values[company.ticker] && (
            <p className="mt-1">
              Mức độ công bố {esgSet.year} (thực hành áp dụng · số liệu định lượng):{" "}
              {PILLARS.map(({ key }) => {
                const d = pillarDisclosure(esgSet, company.ticker, key);
                return `${key} ${d.practicesYes}/${d.practicesTotal} · ${d.quantDisclosed}/${d.quantTotal}`;
              }).join("; ")}
              .
            </p>
          )}
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
            <p className="text-muted-foreground">Chưa đủ nguồn để đối chiếu.</p>
          )}
        </ReportSection>

        <ReportSection n={5} title="Sự kiện công khai (36 tháng)">
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
            Tỷ trọng danh mục được tính từ dữ liệu tài chính, mức rủi ro và mục tiêu đầu tư. Mở{" "}
            <Link href="/portfolio" className="underline">Danh mục</Link> để chọn các mã và xem phân bổ đề xuất.
          </p>
        </ReportSection>

        <ReportSection n={7} title="Phương pháp & nguồn dữ liệu">
          <ul className="list-disc space-y-0.5 pl-5">
            <li>
              Rf = {formatPct(method.riskFree.value)}; MRP = {formatPct(method.equityRiskPremium.value)};{" "}
              <span className="font-mono">{method.capm}</span>.
            </li>
            <li>Nguồn Rf/MRP: {method.riskFree.source === method.equityRiskPremium.source
              ? method.riskFree.source
              : `Rf: ${method.riskFree.source}; MRP: ${method.equityRiskPremium.source}`}.</li>
            <li>
              <span className="font-mono">{method.altman}</span> – {method.altmanZones}.
            </li>
            <li>Điểm phạt POSINT: {method.posintTiers}.</li>
            <li>
              Hạn chế ESG: các chỉ tiêu tuyệt đối (E_01, E_06, E_08, S_01) thiên lệch theo quy mô doanh nghiệp; chỉ tiêu số bị N/A
              được loại khỏi xếp hạng thay vì bị trừ điểm (vd. IDP chỉ được chấm trên 4–6 chỉ tiêu số).
            </li>
            <li>Nguồn: {method.dataSource}.</li>
            <li>Trường dữ liệu chưa được xác nhận hiển thị bằng “—”.</li>
          </ul>
        </ReportSection>

        <ReportSection n={8} title="Tuyên bố miễn trừ">
          <p className="text-muted-foreground">
            Đây là báo cáo phân tích theo dữ liệu hiện có, không phải khuyến nghị đầu tư. Các ô “—” là số liệu chưa được xác nhận.
          </p>
        </ReportSection>
      </article>
    </div>
  );
}
