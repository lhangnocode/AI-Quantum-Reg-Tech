import { describe, expect, it } from "vitest";
import { getCompanies, getPortfolio, getScenarios } from "@/lib/api";
import { assess } from "@/lib/assessment";
import { getOverview, getOverviews } from "@/lib/overview";
import { nearestScenario, portfolioReturn } from "@/lib/portfolio";

// Đối chiếu với docs/MOCK_DATA.md §2 – số liệu chuẩn.
describe("mock data khớp MOCK_DATA.md", () => {
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
