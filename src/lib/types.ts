// Types khớp schema trong docs/DATA.md (= hợp đồng API Vòng 2).
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
  /** "document" = số liệu trích từ tệp tải lên; "sample" = kết quả mẫu (sheet Private_Sample). */
  source: "document" | "sample";
  /** Chi tiết trích xuất – chỉ có khi source = "document". */
  extraction?: DocumentExtraction;
  /** ISO timestamp lúc tệp gốc bị xoá (Zero-Retention). */
  deletedAt: string;
}

/** 9 chỉ tiêu BCTC dùng cho Z': TSNH, TTS, Nợ NH, Nợ phải trả, VCSH, LNST chưa PP, DT thuần, LNTT, CP lãi vay. */
export type FinKey = "CA" | "TA" | "CL" | "TL" | "EQ" | "RE" | "Revenue" | "PBT" | "Interest";

export interface ExtractedField {
  key: FinKey;
  label: string;
  /** Mã số chỉ tiêu trên mẫu BCTC (Thông tư 200). */
  code: string;
  value: number | null;
  page?: number;
  source?: "text" | "ocr";
  /** Dòng gốc chứa số liệu – để người dùng đối chiếu. */
  line?: string;
}

export interface DocumentExtraction {
  fileType: "pdf";
  pages: number;
  processedPages: number;
  /** Các trang phải OCR (trang ảnh scan). */
  ocrPages: number[];
  unit?: string;
  fields: ExtractedField[];
  warnings: string[];
}

export type PrivateStage = "ocr" | "normalize" | "zscore" | "osint";

/** Tham số chung – sheet Params (docs/DATA.md). */
export interface Methodology {
  riskFree: { value: number; source: string };
  equityRiskPremium: { value: number; source: string };
  capm: string;
  altman: string;
  altmanZones: string;
  posintTiers: string;
  dataSource: string;
}

/** Chỉ tiêu ESG công bố – sheet ESG_ChiTieu (docs/DATA.md §5). */
export type EsgPillar = "E" | "S" | "G";

export interface EsgIndicator {
  code: string;
  pillar: EsgPillar;
  name: string;
  /** "bool": có / không thực hành; "number": số liệu định lượng. */
  type: "bool" | "number";
  /** 1: cao hơn là tốt; -1: thấp hơn là tốt. */
  polarity: 1 | -1;
  /** false: chỉ tiêu bị loại khỏi chấm điểm (thiên vị quy mô) – chỉ để tham khảo. */
  use: boolean;
  /** Số tuyệt đối phụ thuộc quy mô (tổng nước, năng lượng, ngân sách…) → không xếp hạng trực tiếp. */
  sizeDependent: boolean;
  unit?: string;
}

export interface EsgIndicatorSet {
  year: number;
  source: string;
  indicators: EsgIndicator[];
  /** values[ticker][code]: số (bool = 0/1) hoặc null nếu chưa công bố. */
  values: Record<Ticker, Record<string, number | null>>;
}
