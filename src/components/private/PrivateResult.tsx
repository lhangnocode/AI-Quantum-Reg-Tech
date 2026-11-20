"use client";

import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EsgRadar } from "@/components/charts/EsgRadar";
import { ZScoreGauge } from "@/components/charts/ZScoreGauge";
import { OsintTimeline } from "@/components/company/OsintTimeline";
import { RiskFormula } from "@/components/company/RiskFormula";
import { XTable } from "@/components/company/XTable";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ZoneBadge } from "@/components/dashboard/ZoneBadge";
import { InfoTip } from "@/components/common/InfoTip";
import { formatNumber, formatText } from "@/lib/format";
import { ALTMAN_FORMULA } from "@/lib/risk";
import { getOsintPeriod } from "@/lib/osint-period";
import { ExtractionTable } from "./ExtractionTable";
import type { PrivateAnalysis } from "@/lib/types";

/** Kết quả Cổng 2 – tái dùng component của Cổng 1 (Gauge, Radar, Timeline). */
export function PrivateResult({ result }: { result: PrivateAnalysis }) {
  const { company, zscore, esg, events, posint } = result;
  const total =
    typeof zscore.rfinBase === "number" && typeof posint === "number" ? zscore.rfinBase + posint : "TODO";
  const osintPeriod = getOsintPeriod();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{company.name}</h3>
          <p className="text-xs text-muted-foreground">
            Chưa niêm yết · Ngành {formatText(company.subsector)} · Năm tài chính {company.fiscalYear === "TODO" ? "—" : company.fiscalYear}
          </p>
        </div>
        {zscore.zone !== "TODO" && <ZoneBadge zone={zscore.zone} />}
      </div>

      {result.extraction && (
        <DashboardCard
          title="Chỉ tiêu trích xuất từ báo cáo"
          description={`OCR + ${result.extraction.ai?.mode === "live" ? `LLM ${result.extraction.ai.provider}/${result.extraction.ai.model}` : "parser quy tắc"}; đối chiếu từng số với trang và quote nguồn trước khi dùng`}
        >
          <ExtractionTable extraction={result.extraction} />
        </DashboardCard>
      )}

      {(
        <Alert>
          <Info />
          <AlertTitle>Phạm vi tự động của bản hiện tại</AlertTitle>
          <AlertDescription>
            Z&apos;-Score tính từ số liệu trích trong báo cáo. Điểm ESG và quét OSINT chưa tự động (Vòng 2) nên hiển thị “—”;
            RFin,Total chỉ có khi đã có POSINT.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard
          title="Altman Z'-Score"
          description="Biến thể cho doanh nghiệp chưa niêm yết"
          action={
            <InfoTip label="Công thức Z'">
              <span className="font-mono">{ALTMAN_FORMULA["Z'"]}</span>
              <span>Safe &gt; 2,90 · Grey 1,23–2,90 · Distress &lt; 1,23</span>
            </InfoTip>
          }
        >
          <ZScoreGauge z={zscore.z} model="Z'" />
          <XTable values={zscore} />
        </DashboardCard>

        <DashboardCard title="Điểm ESG" description={`ESGi = ${formatNumber(esg.esgScore, 4)}`}>
          <div className="flex-1">
            <EsgRadar pillars={esg.pillars} />
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="Dòng thời gian OSINT" description="36 tháng gần nhất">
        <OsintTimeline events={events} fromDate={osintPeriod.fromDate} toDate={osintPeriod.toDate} />
      </DashboardCard>

      <DashboardCard title="Tổng hợp rủi ro tài chính" description="RFin,Base + POSINT = RFin,Total">
        <RiskFormula base={zscore.rfinBase} posint={posint} total={total} />
      </DashboardCard>
    </div>
  );
}
