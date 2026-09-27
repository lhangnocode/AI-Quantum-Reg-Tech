// Mức độ công bố ESG theo trụ cột – chỉ ĐẾM trên dữ liệu công bố thật (sheet ESG_ChiTieu),
// không chấm điểm, không trọng số tự đặt (điểm trụ cột chờ phương pháp aq_v3.py).
import type { EsgIndicator, EsgIndicatorSet, EsgPillar, Ticker } from "./types";

export const PILLARS: { key: EsgPillar; label: string }[] = [
  { key: "E", label: "Môi trường (E)" },
  { key: "S", label: "Xã hội (S)" },
  { key: "G", label: "Quản trị (G)" },
];

export interface PillarDisclosure {
  pillar: EsgPillar;
  /** Thực hành ESG (chỉ tiêu có / không) đang áp dụng. */
  practicesYes: number;
  practicesTotal: number;
  /** Số liệu định lượng đã công bố. */
  quantDisclosed: number;
  quantTotal: number;
}

/** Chỉ tiêu dùng để thống kê (bỏ chỉ tiêu use = false – thiên vị quy mô). */
const counted = (set: EsgIndicatorSet, pillar: EsgPillar) => set.indicators.filter((i) => i.pillar === pillar && i.use);

export function pillarDisclosure(set: EsgIndicatorSet, ticker: Ticker, pillar: EsgPillar): PillarDisclosure {
  const vals = set.values[ticker] ?? {};
  const list = counted(set, pillar);
  const bools = list.filter((i) => i.type === "bool");
  const nums = list.filter((i) => i.type === "number");
  return {
    pillar,
    practicesYes: bools.filter((i) => vals[i.code] === 1).length,
    practicesTotal: bools.length,
    quantDisclosed: nums.filter((i) => typeof vals[i.code] === "number").length,
    quantTotal: nums.length,
  };
}

/** Trung bình của nhóm so sánh (vd. 4 DN niêm yết) cho 1 trụ cột. */
export function peerAverage(set: EsgIndicatorSet, peers: Ticker[], pillar: EsgPillar) {
  const all = peers.filter((t) => set.values[t]).map((t) => pillarDisclosure(set, t, pillar));
  const avg = (f: (d: PillarDisclosure) => number) => (all.length ? all.reduce((s, d) => s + f(d), 0) / all.length : 0);
  return { practicesYes: avg((d) => d.practicesYes), quantDisclosed: avg((d) => d.quantDisclosed) };
}

/**
 * Hạng của DN trong nhóm so sánh cho 1 chỉ tiêu định lượng, theo chiều tốt (polarity).
 * Chỉ xếp giữa các DN có công bố; null nếu DN chưa công bố, chỉ tiêu là có / không, hoặc số tuyệt đối phụ thuộc quy mô.
 */
export function rankInPeers(set: EsgIndicatorSet, indicator: EsgIndicator, ticker: Ticker, peers: Ticker[]) {
  // Số tuyệt đối phụ thuộc quy mô: DN nhỏ luôn "phát thải ít" – xếp hạng sẽ gây hiểu sai.
  if (indicator.type !== "number" || indicator.sizeDependent) return null;
  const own = set.values[ticker]?.[indicator.code];
  if (typeof own !== "number") return null;
  const disclosed = peers
    .map((t) => set.values[t]?.[indicator.code])
    .filter((v): v is number => typeof v === "number");
  const better = disclosed.filter((v) => (indicator.polarity === 1 ? v > own : v < own)).length;
  return { rank: better + 1, of: disclosed.length };
}
