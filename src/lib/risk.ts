import type { AltmanZone, OsintSeverity } from "./types";

// Ngưỡng Altman Z gốc – docs/MOCK_DATA.md mục 1.
export const ALTMAN_SAFE = 2.99;
export const ALTMAN_DISTRESS = 1.81;

// Z' (Altman 1983, DN chưa niêm yết – Cổng 2): Safe > 2,90 · Grey 1,23–2,90 · Distress < 1,23.
export const ALTMAN_THRESHOLDS: Record<"Z" | "Z'", { distress: number; safe: number }> = {
  Z: { distress: ALTMAN_DISTRESS, safe: ALTMAN_SAFE },
  "Z'": { distress: 1.23, safe: 2.9 },
};

export function altmanZone(z: number, model: "Z" | "Z'" = "Z"): AltmanZone {
  const t = ALTMAN_THRESHOLDS[model];
  if (z > t.safe) return "safe";
  if (z >= t.distress) return "grey";
  return "distress";
}

export const ALTMAN_FORMULA: Record<"Z" | "Z'", string> = {
  Z: "Z = 1,2X1 + 1,4X2 + 3,3X3 + 0,6X4 + 1,0X5",
  "Z'": "Z' = 0,717X1 + 0,847X2 + 3,107X3 + 0,420X4 + 0,998X5",
};

export const X_LABELS = [
  { key: "x1", label: "X1", desc: "Vốn lưu động / Tổng tài sản" },
  { key: "x2", label: "X2", desc: "Lợi nhuận giữ lại / Tổng tài sản" },
  { key: "x3", label: "X3", desc: "EBIT / Tổng tài sản" },
  { key: "x4", label: "X4", desc: "Giá trị vốn chủ / Tổng nợ" },
  { key: "x5", label: "X5", desc: "Doanh thu / Tổng tài sản" },
] as const;

export const GREENWASHING_LABEL = { low: "Thấp", medium: "Trung bình", high: "Cao" } as const;
export const GREENWASHING_ZONE: Record<keyof typeof GREENWASHING_LABEL, AltmanZone> = {
  low: "safe",
  medium: "grey",
  high: "distress",
};

export const OSINT_TYPE_LABEL = {
  tax: "Thuế",
  environment: "Môi trường",
  securities: "Chứng khoán",
  media: "Truyền thông",
} as const;

export const ZONE_LABEL: Record<AltmanZone, string> = {
  safe: "Safe",
  grey: "Grey",
  distress: "Distress",
};

/** Class token Tailwind theo vùng – màu luôn đi kèm nhãn chữ. */
export const ZONE_CLASS: Record<AltmanZone, { text: string; bg: string; soft: string }> = {
  safe: { text: "text-risk-safe", bg: "bg-risk-safe", soft: "bg-risk-safe/10" },
  grey: { text: "text-risk-grey", bg: "bg-risk-grey", soft: "bg-risk-grey/10" },
  distress: { text: "text-risk-distress", bg: "bg-risk-distress", soft: "bg-risk-distress/10" },
};

/** Mức OSINT: 1 → cảnh báo (grey), 2–3 → vi phạm (distress). */
export function severityZone(severity: OsintSeverity): AltmanZone {
  return severity >= 2 ? "distress" : "grey";
}
