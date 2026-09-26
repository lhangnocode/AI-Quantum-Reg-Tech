import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EsgRadar } from "@/components/charts/EsgRadar";
import { ZScoreGauge } from "@/components/charts/ZScoreGauge";
import { InfoTip } from "@/components/common/InfoTip";
import { CompanyActions } from "@/components/company/CompanyActions";
import { GreenwashingEvidence } from "@/components/company/GreenwashingEvidence";
import { OsintTimeline } from "@/components/company/OsintTimeline";
import { RiskFormula } from "@/components/company/RiskFormula";
import { XTable } from "@/components/company/XTable";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ZoneBadge } from "@/components/dashboard/ZoneBadge";
import { GatewayBadge } from "@/components/layout/GatewayBadge";
import { getCompanies } from "@/lib/api";
import { formatNumber, formatPct, formatText } from "@/lib/format";
import { getOverview } from "@/lib/overview";
import { ALTMAN_FORMULA, GREENWASHING_LABEL, GREENWASHING_ZONE, ZONE_CLASS } from "@/lib/risk";
import { cn } from "@/lib/utils";

export async function generateStaticParams() {
  return (await getCompanies()).map((c) => ({ ticker: c.ticker }));
}

export async function generateMetadata(props: PageProps<"/company/[ticker]">) {
  const { ticker } = await props.params;
  return { title: `${ticker.toUpperCase()} – Tra cứu | QuantumRegTech` };
}

export default async function CompanyPage(props: PageProps<"/company/[ticker]">) {
  const { ticker } = await props.params;
  const [overview, companies] = await Promise.all([getOverview(ticker), getCompanies()]);
  if (!overview) notFound();

  const { company, zscore, esg, allEvents, posint, rfinTotal } = overview;
  const gw = esg.greenwashingRisk;

  return (
    <div className="space-y-5">
      {/* Chọn nhanh DN */}
      <nav aria-label="Chọn doanh nghiệp" className="flex flex-wrap gap-2">
        {companies.map((c) => (
          <Link
            key={c.ticker}
            href={`/company/${c.ticker}`}
            aria-current={c.ticker === company.ticker ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              c.ticker === company.ticker ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
            )}
          >
            {c.ticker}
          </Link>
        ))}
      </nav>

      {/* Header DN */}
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-2xl font-bold">{company.ticker}</h2>
            <ZoneBadge zone={zscore.zone} />
            <GatewayBadge gateway={1} />
          </div>
          <p className="text-sm font-medium">{company.name}</p>
          <p className="text-xs text-muted-foreground">
            Sàn {formatText(company.exchange)} · Ngành {company.subsector} · Năm tài chính {zscore.fiscalYear}
          </p>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-xs">
            <div>
              <dt className="text-muted-foreground">Lợi nhuận kỳ vọng (CAPM)</dt>
              <dd className="font-mono font-semibold tabular">{formatPct(company.expectedReturn)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">β</dt>
              <dd className="font-mono font-semibold tabular">{formatNumber(company.beta, 3)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lợi nhuận thực tế</dt>
              <dd className="font-mono font-semibold tabular">{formatPct(company.realizedReturn, 2, true)}</dd>
            </div>
          </dl>
        </div>
        <CompanyActions ticker={company.ticker} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Z-Score */}
        <DashboardCard
          title="Sức khoẻ tài chính – Altman Z-Score"
          description={`Mô hình ${zscore.model} · RFin,Base = ${formatNumber(zscore.rfinBase)}`}
          action={
            <InfoTip label="Công thức Z">
              <span className="font-mono">{ALTMAN_FORMULA[zscore.model]}</span>
              <span>Safe &gt; 2,99 · Grey 1,81–2,99 · Distress &lt; 1,81</span>
            </InfoTip>
          }
        >
          <ZScoreGauge z={zscore.z} model={zscore.model} />
          <div className="mb-3 -mt-4 flex justify-center">
            <ZoneBadge zone={zscore.zone} className="text-xs" />
          </div>
          <XTable values={zscore} />
        </DashboardCard>

        {/* ESG */}
        <DashboardCard
          title="Điểm ESG"
          description="5 trụ cột: E, S, G, Minh bạch, Tuân thủ"
          action={
            gw === "TODO" ? (
              <Badge variant="outline" className="h-auto px-2 py-0.5 text-[10px]">Rủi ro tẩy xanh: —</Badge>
            ) : (
              <Badge
                variant="secondary"
                className={cn("h-auto px-2 py-0.5 text-[10px] font-semibold", ZONE_CLASS[GREENWASHING_ZONE[gw]].soft, ZONE_CLASS[GREENWASHING_ZONE[gw]].text)}
              >
                <AlertTriangle /> Rủi ro tẩy xanh: {GREENWASHING_LABEL[gw]}
              </Badge>
            )
          }
        >
          <div className="mb-4 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tabular">{formatNumber(esg.esgScore, 4)}</span>
            <span className="text-xs text-muted-foreground">ESGi (thang 0–1)</span>
            <InfoTip label="ESGi">Điểm ESG tổng hợp dùng trong hàm mục tiêu tối ưu danh mục (trọng số γ).</InfoTip>
          </div>
          <div className="flex-1">
            <EsgRadar pillars={esg.pillars} />
          </div>
        </DashboardCard>
      </div>

      {/* Bằng chứng tẩy xanh */}
      <DashboardCard
        title="Bằng chứng Tẩy xanh (Greenwashing)"
        description="Đối chiếu tuyên bố của doanh nghiệp với dữ liệu ngoại cảnh – điểm mâu thuẫn do NLP trả về (mock)"
      >
        <GreenwashingEvidence evidence={esg.evidence} />
      </DashboardCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardCard title="Dòng thời gian OSINT" description="36 tháng gần nhất · chấm màu theo mức vi phạm" className="xl:col-span-2">
          <OsintTimeline events={allEvents} endYear={zscore.fiscalYear} />
        </DashboardCard>

        <DashboardCard title="Tổng hợp rủi ro tài chính" description="Điểm rủi ro đưa vào mô hình tối ưu danh mục">
          <div className="flex flex-1 flex-col justify-center gap-4">
            <RiskFormula base={zscore.rfinBase} posint={posint} total={rfinTotal} />
            <p className="text-center text-[11px] text-muted-foreground">
              RFin,Base theo vùng Altman; POSINT = tổng điểm phạt sự kiện OSINT đang hiệu lực.
            </p>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
