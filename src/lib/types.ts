// Types khớp schema trong docs/MOCK_DATA.md (= hợp đồng API Vòng 2).
// Ô chưa có số liệu được giữ nguyên là "TODO" và hiển thị "—" trên UI.

export type Todo<T> = T | "TODO";

export type Ticker = string;

export interface Company {
  ticker: Ticker;
  name: string;
  exchange: Todo<string>;
  subsector: string;
  listed: boolean;
  beta: number;
  expectedReturn: number;
  realizedReturn: number;
}

export type AltmanZone = "safe" | "grey" | "distress";

export interface ZScore {
  model: "Z" | "Z'";
  x1: Todo<number>;
  x2: Todo<number>;
  x3: Todo<number>;
  x4: Todo<number>;
  x5: Todo<number>;
  z: number;
  zone: AltmanZone;
  rfinBase: number;
  fiscalYear: number;
}

export type GreenwashingRisk = "low" | "medium" | "high";

export interface EsgEvidence {
  claim: string;
  claimSource: string;
  counter: string;
  counterSource: string;
  counterUrl: string;
  contradiction: number;
  taxonomyRef: string;
}

export interface Esg {
  esgScore: number;
  pillars: {
    E: Todo<number>;
    S: Todo<number>;
    G: Todo<number>;
    transparency: Todo<number>;
    compliance: Todo<number>;
  };
  greenwashingRisk: Todo<GreenwashingRisk>;
  evidence: EsgEvidence[];
}

export type OsintType = "tax" | "environment" | "securities" | "media";
export type OsintSeverity = 1 | 2 | 3;

export interface OsintEvent {
  id: string;
  ticker: Ticker;
  date: string;
  type: OsintType;
  severity: OsintSeverity;
  penalty: number;
  title: string;
  source: string;
  url: string;
  active: boolean;
}

export type Weights = Record<Ticker, number>;

export interface PortfolioScenario {
  weights: Weights;
  expectedReturn: number;
  realizedReturn: number;
}

export interface PortfolioResult {
  capital: number;
  constraints: { minWeight: number; maxWeight: number };
  params: { alpha: Todo<number>; beta: Todo<number>; gamma: Todo<number>; delta: Todo<number> };
  solver: string;
  esgAware: PortfolioScenario;
  baseline: PortfolioScenario;
  qubo: { bitsPerAsset: number; numQubits: number; matrix: Todo<number[][]> | string };
}

export interface PortfolioParams {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
}

/** Kịch bản tính sẵn (scenarios.json) – dùng cho slider khi chưa có backend. */
export interface Scenario {
  params: PortfolioParams;
  weights: Weights;
}

/** Kết quả Cổng 2 (POST /api/v1/private/analyze) – dạng Cổng 1 + deletedAt. */
export interface PrivateAnalysis {
  company: { name: string; subsector: Todo<string>; listed: false; fiscalYear: Todo<number> };
  zscore: Omit<ZScore, "z" | "zone" | "rfinBase" | "fiscalYear"> & {
    z: Todo<number>;
    zone: Todo<AltmanZone>;
    rfinBase: Todo<number>;
  };
  esg: Omit<Esg, "esgScore"> & { esgScore: Todo<number> };
  events: OsintEvent[];
  posint: Todo<number>;
  /** ISO timestamp lúc tệp gốc bị xoá (Zero-Retention). */
  deletedAt: string;
}

export type PrivateStage = "ocr" | "normalize" | "zscore" | "osint";

/** Tham số chung – docs/MOCK_DATA.md §1. */
export interface Methodology {
  riskFree: { value: number; source: string };
  equityRiskPremium: { value: number; source: string };
  capm: string;
  altman: string;
  altmanZones: string;
  posintTiers: string;
  dataSource: string;
}
