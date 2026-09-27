// Chuyển data/QuantumRegTech_Data.xlsx → src/data/*.json (schema = hợp đồng API, xem docs/DATA.md).
// Chạy: npm run data (tự chạy trước dev / build / test). File JSON sinh ra không commit.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.argv[2] ?? join(ROOT, "data", "QuantumRegTech_Data.xlsx");
const OUT = join(ROOT, "src", "data");
const TODO = "TODO";

/** Giá trị ô: công thức → kết quả đã lưu; rich text / hyperlink → chuỗi; rỗng → null. */
function cellValue(cell, where) {
  const v = cell.value;
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "object" || v instanceof Date) return typeof v === "string" ? v.trim() : v;
  if ("formula" in v || "sharedFormula" in v) {
    if (v.result === undefined || (typeof v.result === "object" && v.result?.error)) {
      throw new Error(`${where}: công thức chưa có kết quả – mở file bằng Excel/LibreOffice rồi lưu lại.`);
    }
    return v.result;
  }
  if ("richText" in v) return v.richText.map((t) => t.text).join("").trim();
  if ("hyperlink" in v) return String(v.text ?? v.hyperlink).trim();
  return v;
}

/** Đọc sheet dạng bảng (dòng 1 = key) thành mảng object. */
function readTable(wb, name) {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`Thiếu sheet "${name}" trong ${SRC}`);
  const keys = [];
  ws.getRow(1).eachCell((c, i) => (keys[i] = String(c.value).trim()));
  const rows = [];
  ws.eachRow((row, r) => {
    if (r === 1) return;
    const o = {};
    keys.forEach((k, i) => k && (o[k] = cellValue(row.getCell(i), `${name}!${row.getCell(i).address}`)));
    if (Object.values(o).some((v) => v !== null)) rows.push(o);
  });
  return rows;
}

const kv = (rows) => Object.fromEntries(rows.map((r) => [r.key, r.value]));
const todo = (v) => (v === null || v === undefined ? TODO : v);
const num = (v, where) => {
  if (v === TODO || v === null) return TODO;
  if (typeof v !== "number") throw new Error(`${where}: cần số, nhận "${v}"`);
  return v;
};
const vi = (n) => String(n).replace(".", ",");

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(SRC);

const params = kv(readTable(wb, "Params"));
const market = Object.fromEntries(readTable(wb, "Market").map((r) => [r.ticker, r]));

const companies = readTable(wb, "Companies").map((c) => {
  const m = market[c.ticker];
  if (!m) throw new Error(`Market thiếu mã ${c.ticker}`);
  return {
    ticker: c.ticker,
    name: c.name,
    exchange: todo(c.exchange),
    subsector: c.subsector,
    listed: c.listed === 1,
    beta: num(m.beta, `Market ${c.ticker}.beta`),
    expectedReturn: num(m.expected_return, `Market ${c.ticker}.expected_return`),
    realizedReturn: num(m.realized_return, `Market ${c.ticker}.realized_return`),
  };
});

const zscore = Object.fromEntries(
  readTable(wb, "ZScore").map((z) => [
    z.ticker,
    {
      model: z.model,
      x1: todo(z.x1), x2: todo(z.x2), x3: todo(z.x3), x4: todo(z.x4), x5: todo(z.x5),
      z: num(z.z, `ZScore ${z.ticker}.z`),
      zone: z.zone,
      rfinBase: num(z.rfin_base, `ZScore ${z.ticker}.rfin_base`),
      fiscalYear: z.fiscal_year,
    },
  ])
);

const evidence = readTable(wb, "ESG_Evidence");
const esg = Object.fromEntries(
  readTable(wb, "ESG").map((e) => [
    e.ticker,
    {
      esgScore: num(e.esg_score, `ESG ${e.ticker}.esg_score`),
      pillars: { E: todo(e.E), S: todo(e.S), G: todo(e.G), transparency: todo(e.transparency), compliance: todo(e.compliance) },
      greenwashingRisk: todo(e.greenwashing_risk),
      evidence: evidence
        .filter((v) => v.ticker === e.ticker)
        .map((v) => ({
          claim: todo(v.claim),
          claimSource: todo(v.claim_source),
          counter: todo(v.counter),
          counterSource: todo(v.counter_source),
          counterUrl: v.counter_url ?? "",
          contradiction: num(v.contradiction, `ESG_Evidence ${v.ticker}.contradiction`),
          taxonomyRef: todo(v.taxonomy_ref),
        })),
    },
  ])
);

const osint = readTable(wb, "OSINT").map((e) => ({
  id: e.id,
  ticker: e.ticker,
  date: `${e.year}-${typeof e.month === "number" ? String(e.month).padStart(2, "0") : TODO}`,
  type: e.type,
  severity: e.severity,
  penalty: e.penalty,
  title: e.title,
  source: e.source,
  url: e.url ?? "",
  active: e.active === 1,
}));

const weights = readTable(wb, "Portfolio");
const summary = Object.fromEntries(readTable(wb, "Portfolio_Summary").map((s) => [s.scenario, s]));
const pick = (col) => Object.fromEntries(weights.map((w) => [w.ticker, w[col]]));

// Ma trận QUBO: vùng B3:Q18 – đủ số thì dùng, còn lại "TODO".
const qws = wb.getWorksheet("QUBO_Matrix");
const n = params.qubo_num_qubits;
const matrix = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cellValue(qws.getCell(i + 3, j + 2), "QUBO_Matrix")));
const hasMatrix = matrix.every((r) => r.every((v) => typeof v === "number"));

const portfolio = {
  capital: params.capital_vnd,
  constraints: { minWeight: params.min_weight, maxWeight: params.max_weight },
  params: { alpha: todo(params.alpha), beta: todo(params.beta), gamma: todo(params.gamma), delta: todo(params.delta) },
  solver: params.solver,
  esgAware: { weights: pick("w_esg_aware"), expectedReturn: summary.esg_aware.expected_return, realizedReturn: summary.esg_aware.realized_return },
  baseline: { weights: pick("w_baseline"), expectedReturn: summary.baseline.expected_return, realizedReturn: summary.baseline.realized_return },
  qubo: { bitsPerAsset: params.qubo_bits_per_asset, numQubits: n, matrix: hasMatrix ? matrix : `${TODO} – ${n}×${n}, dán vào sheet QUBO_Matrix` },
};

const tickers = weights.map((w) => w.ticker);
const scenarios = readTable(wb, "Scenarios").map((s) => ({
  params: { alpha: s.alpha, beta: s.beta, gamma: s.gamma, delta: s.delta },
  weights: Object.fromEntries(tickers.map((t) => [t, s[t]])),
}));

const ps = kv(readTable(wb, "Private_Sample"));
const privateSample = {
  company: { name: ps.company_name, subsector: todo(ps.subsector), listed: false, fiscalYear: todo(ps.fiscal_year) },
  zscore: {
    model: ps.z_model,
    x1: todo(ps.x1), x2: todo(ps.x2), x3: todo(ps.x3), x4: todo(ps.x4), x5: todo(ps.x5),
    z: todo(ps.z), zone: todo(ps.zone), rfinBase: todo(ps.rfin_base),
  },
  esg: {
    esgScore: todo(ps.esg_score),
    pillars: { E: todo(ps.E), S: todo(ps.S), G: todo(ps.G), transparency: todo(ps.transparency), compliance: todo(ps.compliance) },
    greenwashingRisk: todo(ps.greenwashing_risk),
    evidence: [],
  },
  events: [],
  posint: todo(ps.posint),
};

const methodology = {
  riskFree: { value: params.rf, source: readTable(wb, "Params").find((r) => r.key === "rf").source },
  equityRiskPremium: { value: params.erp, source: readTable(wb, "Params").find((r) => r.key === "erp").source },
  capm: params.capm_formula,
  altman: params.altman_formula,
  altmanZones: `Safe > ${vi(params.z_safe)} · Grey ${vi(params.z_distress)}–${vi(params.z_safe)} · Distress < ${vi(params.z_distress)}`,
  posintTiers: `Mức 1 = +${vi(params.posint_l1.toFixed(2))} · Mức 2 = +${vi(params.posint_l2.toFixed(2))} · Mức 3 ≥ +${vi(params.posint_l3.toFixed(2))}`,
  dataSource: params.data_source,
};

// Chỉ tiêu ESG công bố (sheet ESG_ChiTieu): Bool = có / không thực hành, Num = số liệu định lượng; ô trống = chưa công bố.
const esgRows = readTable(wb, "ESG_ChiTieu");
const esgTickers = Object.keys(esgRows[0] ?? {}).filter((k) => /^[A-Z]{2,4}$/.test(k));
const esgIndicators = {
  year: 2024,
  source: "Báo cáo phát triển bền vững / thường niên 2024 – AQ_Input.xlsx (sheet ESG)",
  indicators: esgRows.map((r) => ({
    code: r.code,
    pillar: r.code.slice(0, 1),
    name: r.name,
    type: r.type === "Bool" ? "bool" : "number",
    // (+) cao hơn là tốt, (-) thấp hơn là tốt.
    polarity: String(r.pol).includes("-") ? -1 : 1,
    // use = 0: chỉ tiêu bị loại khỏi chấm điểm (thiên vị quy mô) – chỉ để tham khảo.
    use: r.use === 1,
    // Số tuyệt đối phụ thuộc quy mô DN (rule "Chia DT" hoặc bị loại) → không xếp hạng trực tiếp giữa các DN.
    sizeDependent: r.rule === "Chia DT" || r.use !== 1,
    ...(r.unit ? { unit: r.unit } : {}),
  })),
  values: Object.fromEntries(
    esgTickers.map((t) => [t, Object.fromEntries(esgRows.map((r) => [r.code, typeof r[t] === "number" ? r[t] : null]))])
  ),
};

const files = {
  "companies.json": companies,
  "zscore.json": zscore,
  "esg.json": esg,
  "osint_events.json": osint,
  "portfolio.json": portfolio,
  "scenarios.json": scenarios,
  "private_sample.json": privateSample,
  "methodology.json": methodology,
  "esg_indicators.json": esgIndicators,
};
mkdirSync(OUT, { recursive: true });
for (const [name, data] of Object.entries(files)) writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + "\n");
console.log(`✓ ${Object.keys(files).length} file JSON ← ${SRC.replace(ROOT + "/", "")}`);
