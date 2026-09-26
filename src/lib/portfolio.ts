import type { Company, PortfolioParams, Scenario, Weights } from "./types";

/** Kịch bản tính sẵn gần nhất (khoảng cách Euclid trên α β γ δ). */
export function nearestScenario(scenarios: Scenario[], p: PortfolioParams): Scenario | undefined {
  const dist = (s: Scenario) =>
    (s.params.alpha - p.alpha) ** 2 + (s.params.beta - p.beta) ** 2 + (s.params.gamma - p.gamma) ** 2 + (s.params.delta - p.delta) ** 2;
  return scenarios.reduce<Scenario | undefined>((best, s) => (!best || dist(s) < dist(best) ? s : best), undefined);
}

/** Σ wᵢ × Rᵢ – lợi nhuận danh mục theo trường `expectedReturn` hoặc `realizedReturn`. */
export function portfolioReturn(weights: Weights, companies: Company[], field: "expectedReturn" | "realizedReturn"): number {
  return companies.reduce((sum, c) => sum + (weights[c.ticker] ?? 0) * c[field], 0);
}
