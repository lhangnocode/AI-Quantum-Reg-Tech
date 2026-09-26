import { describe, expect, it } from "vitest";
import { getCompanies, getPortfolio, getScenarios, getZScore } from "@/lib/api";
import { assess } from "@/lib/assessment";
import { getOverview, getOverviews } from "@/lib/overview";
import { nearestScenario, portfolioReturn } from "@/lib/portfolio";
import { altmanZone } from "@/lib/risk";

// Số công bố trong Phụ lục B – Hồ sơ Vòng 1 (docs/DATA.md §2). Dữ liệu app sinh từ data/QuantumRegTech_Data.xlsx.
const APPENDIX = {
  VNM: { z: 6.18, ri: 0.077, real: 0.0514 },
  SAB: { z: 6.51, ri: 0.0995, real: -0.063 },
  MCM: { z: 6.9, ri: 0.0878, real: -0.1789 },
  SBT: { z: 1.8, ri: 0.0912, real: 1.149 },
} as const;

describe("dữ liệu Excel khớp Phụ lục B", () => {
  it("Z tính từ BCTC 2024 (X1–X5) khớp Z công bố, vùng đúng ngưỡng", async () => {
    for (const [t, a] of Object.entries(APPENDIX)) {
      const z = await getZScore(t);
      expect(z.z, t).toBeCloseTo(a.z, 2);
      expect(z.zone, t).toBe(altmanZone(z.z));
      const x = [z.x1, z.x2, z.x3, z.x4, z.x5];
      expect(x.every((v) => typeof v === "number"), t).toBe(true);
      const [x1, x2, x3, x4, x5] = x as number[];
      expect(1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + x5, t).toBeCloseTo(z.z, 6);
    }
  });

  it("Ri (CAPM) và lợi nhuận thực tế (giá 2025) khớp Phụ lục B", async () => {
    for (const c of await getCompanies()) {
      const a = APPENDIX[c.ticker as keyof typeof APPENDIX];
      expect(c.expectedReturn, c.ticker).toBeCloseTo(a.ri, 3);
      expect(c.realizedReturn, c.ticker).toBeCloseTo(a.real, 3);
    }
  });

  it("kết quả danh mục khớp bảng công bố", async () => {
    const p = await getPortfolio();
    expect(p.baseline.expectedReturn).toBeCloseTo(0.0931, 3);
    expect(p.baseline.realizedReturn).toBeCloseTo(0.1186, 3);
    expect(p.esgAware.expectedReturn).toBeCloseTo(0.085, 3);
    expect(p.esgAware.realizedReturn).toBeCloseTo(0.1596, 3);
  });

  it("RFin,Total = RFin,Base + POSINT", async () => {
    const rows = Object.fromEntries((await getOverviews()).map((o) => [o.company.ticker, o.rfinTotal]));
    expect(rows.VNM).toBeCloseTo(0.1);
    expect(rows.SAB).toBeCloseTo(0.1);
    expect(rows.MCM).toBeCloseTo(0.2);
    expect(rows.SBT).toBeCloseTo(0.7);
  });

  it("Σ wᵢ = 100% và nằm trong [15%, 55%]", async () => {
    const p = await getPortfolio();
    for (const w of [p.esgAware.weights, p.baseline.weights]) {
      const values = Object.values(w);
      expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(p.constraints.minWeight - 1e-9);
        expect(v).toBeLessThanOrEqual(p.constraints.maxWeight + 1e-9);
      }
    }
  });

  it("lợi nhuận danh mục tính lại khớp bảng kết quả", async () => {
    const [companies, p] = await Promise.all([getCompanies(), getPortfolio()]);
    expect(portfolioReturn(p.baseline.weights, companies, "expectedReturn")).toBeCloseTo(p.baseline.expectedReturn, 4);
    expect(portfolioReturn(p.baseline.weights, companies, "realizedReturn")).toBeCloseTo(p.baseline.realizedReturn, 4);
    expect(portfolioReturn(p.esgAware.weights, companies, "expectedReturn")).toBeCloseTo(p.esgAware.expectedReturn, 4);
    expect(portfolioReturn(p.esgAware.weights, companies, "realizedReturn")).toBeCloseTo(p.esgAware.realizedReturn, 4);
  });

  it("slider chọn kịch bản gần nhất", async () => {
    const s = await getScenarios();
    expect(nearestScenario(s, { alpha: 1, beta: 1, gamma: 0.1, delta: 0 })?.weights.SAB).toBe(0.55);
    expect(nearestScenario(s, { alpha: 1, beta: 1, gamma: 0.9, delta: 0.8 })?.weights.VNM).toBe(0.509);
  });

  it("kết luận báo cáo", async () => {
    expect(assess((await getOverview("SBT"))!).label).toBe("Rủi ro cao");
    expect(assess((await getOverview("MCM"))!).label).toBe("Cần theo dõi");
    expect(assess((await getOverview("VNM"))!).label).toBe("Đạt");
  });
});
