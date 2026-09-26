import type { CompanyOverview } from "./overview";
import { formatNumber } from "./format";
import { GREENWASHING_LABEL } from "./risk";
import type { AltmanZone } from "./types";

export interface Assessment {
  level: AltmanZone;
  label: string;
  summary: string;
}

/**
 * Kết luận tổng cho báo cáo thẩm định – quy tắc hiển thị, suy ra từ số liệu có sẵn:
 * Distress hoặc RFin,Total ≥ 0,5 → "Rủi ro cao"; có sự kiện OSINT hoặc tẩy xanh cao → "Cần theo dõi"; còn lại → "Đạt".
 */
export function assess({ company, zscore, esg, events, posint, rfinTotal }: CompanyOverview): Assessment {
  const parts = [
    `${company.ticker} có Z = ${formatNumber(zscore.z)}, thuộc vùng ${zscore.zone === "safe" ? "an toàn (Safe)" : zscore.zone === "grey" ? "cảnh báo (Grey)" : "kiệt quệ (Distress)"} → RFin,Base = ${formatNumber(zscore.rfinBase)}.`,
    events.length > 0
      ? `Ghi nhận ${events.length} sự kiện OSINT đang hiệu lực (POSINT +${formatNumber(posint)}).`
      : "Không ghi nhận sự kiện OSINT trong 36 tháng.",
    esg.greenwashingRisk !== "TODO"
      ? `Rủi ro tẩy xanh: ${GREENWASHING_LABEL[esg.greenwashingRisk].toLowerCase()}; ESGi = ${formatNumber(esg.esgScore, 4)}.`
      : `ESGi = ${formatNumber(esg.esgScore, 4)}.`,
    `Điểm rủi ro tài chính tổng hợp RFin,Total = ${formatNumber(rfinTotal)}.`,
  ];

  const level: AltmanZone =
    zscore.zone === "distress" || rfinTotal >= 0.5
      ? "distress"
      : events.length > 0 || esg.greenwashingRisk === "high"
        ? "grey"
        : "safe";
  const label = { distress: "Rủi ro cao", grey: "Cần theo dõi", safe: "Đạt" }[level];

  return { level, label, summary: parts.join(" ") };
}
