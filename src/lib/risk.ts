import type { AltmanZone, OsintSeverity } from "./types";

// Ngưỡng Altman Z gốc – docs/MOCK_DATA.md mục 1.
export const ALTMAN_SAFE = 2.99;
export const ALTMAN_DISTRESS = 1.81;

export function altmanZone(z: number): AltmanZone {
  if (z > ALTMAN_SAFE) return "safe";
  if (z >= ALTMAN_DISTRESS) return "grey";
  return "distress";
}

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
