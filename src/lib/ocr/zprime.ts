import { altmanZone, RFIN_BASE_BY_ZONE } from "@/lib/risk";
import type { ExtractedField, FinKey, PrivateAnalysis, Todo } from "@/lib/types";

// Altman Z' (1983) cho DN chưa niêm yết – X4 dùng vốn chủ sở hữu sổ sách thay cho vốn hoá.
const COEF = { x1: 0.717, x2: 0.847, x3: 3.107, x4: 0.42, x5: 0.998 } as const;

const ratio = (a: number | null, b: number | null): Todo<number> =>
  a === null || b === null || b === 0 ? "TODO" : a / b;

/** X1–X5, Z', vùng và RFin,Base từ các chỉ tiêu trích xuất; thiếu số liệu → "TODO". */
export function computeZPrime(fields: ExtractedField[]): PrivateAnalysis["zscore"] {
  const v = Object.fromEntries(fields.map((f) => [f.key, f.value])) as Record<FinKey, number | null>;
  const sum = (a: number | null, b: number | null) => (a === null || b === null ? null : a + b);
  const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

  const x = {
    x1: ratio(diff(v.CA, v.CL), v.TA), // Vốn lưu động / Tổng tài sản
    x2: ratio(v.RE, v.TA), // LNST chưa phân phối / Tổng tài sản
    x3: ratio(sum(v.PBT, v.Interest), v.TA), // EBIT / Tổng tài sản
    x4: ratio(v.EQ, v.TL), // Vốn chủ sở hữu (sổ sách) / Nợ phải trả
    x5: ratio(v.Revenue, v.TA), // Doanh thu thuần / Tổng tài sản
  };
  const nums = Object.values(x);
  if (nums.some((n) => n === "TODO")) {
    return { model: "Z'", ...x, z: "TODO", zone: "TODO", rfinBase: "TODO" };
  }
  const [x1, x2, x3, x4, x5] = nums as number[];
  const z = COEF.x1 * x1 + COEF.x2 * x2 + COEF.x3 * x3 + COEF.x4 * x4 + COEF.x5 * x5;
  const zone = altmanZone(z, "Z'");
  return { model: "Z'", ...x, z, zone, rfinBase: RFIN_BASE_BY_ZONE[zone] };
}
