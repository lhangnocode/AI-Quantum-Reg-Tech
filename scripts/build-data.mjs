// Screen data (companies, Z-score, ESG, OSINT, methodology, ESG indicators) for the latest data year.
// Single source: data/QuantumRegTech_Input_Data_final.xlsx → scripts/build-financial-engine-data.mjs →
// data/generated/financial_engine.json (recomputed + reconciled) → this script → data/generated/*.json.
// Run via `npm run data` (the engine script runs first). Generated JSON is not committed.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "generated");
const TODO = "TODO";

const engine = JSON.parse(readFileSync(join(OUT, "financial_engine.json"), "utf8"));
const dataYear = Math.max(...engine.periods);
const records = engine.records.filter((r) => r.dataYear === dataYear);
if (!records.length) throw new Error(`financial_engine.json: không có bản ghi năm ${dataYear}`);
const forecastYear = records[0].forecastYear;

// Mô tả ngành (nhận diện, không phải số liệu tài chính).
const SUBSECTOR = {
  IDP: "Sữa · đồ uống", KDC: "Thực phẩm · dầu ăn", MCH: "Hàng tiêu dùng", MCM: "Sữa", PAN: "Nông nghiệp · thực phẩm",
  QNS: "Đường · sữa đậu nành", SAB: "Bia · nước giải khát", SBT: "Đường", VNM: "Sữa",
};
// Sàn niêm yết: VNM/SAB/MCM/SBT theo sheet Companies của workbook 4 mã cũ; 5 mã còn lại theo trang /stocks (nhóm nhập).
const EXCHANGE = { VNM: "HOSE", SAB: "HOSE", MCM: "HOSE", SBT: "HOSE", MCH: "HOSE", KDC: "HOSE", PAN: "HOSE", QNS: "UPCoM", IDP: "UPCoM" };
const ZONE = { SAFE: "safe", GREY: "grey", DISTRESS: "distress" };
const OSINT_TYPE = [[/thuế/i, "tax"], [/môi trường/i, "environment"], [/chứng khoán|công bố thông tin/i, "securities"], [/báo chí/i, "media"]];
const vi = (n) => String(n).replace(".", ",");
const eventDate = (event) => {
  const exactDate = /(?:^|\D)(\d{2})\/(\d{2})\/(\d{4})(?:\D|$)/.exec(event.dateNote ?? "");
  return exactDate ? `${exactDate[3]}-${exactDate[2]}` : String(event.decisionYear);
};

const companies = records.map((r) => ({
  ticker: r.ticker,
  name: engine.companies[r.ticker].name,
  exchange: EXCHANGE[r.ticker] ?? TODO,
  subsector: SUBSECTOR[r.ticker] ?? "Thực phẩm và đồ uống",
  listed: true,
  beta: r.calculated.returns.beta,
  expectedReturn: r.calculated.returns.capmExpected,
  realizedReturn: r.calculated.returns.adjustedPricePeriod,
  dataYear: r.dataYear,
  forecastYear: r.forecastYear,
}));

const zscore = Object.fromEntries(records.map((r) => {
  const a = r.calculated.altman;
  return [r.ticker, {
    model: "Z", x1: a.x1, x2: a.x2, x3: a.x3, x4: a.x4, x5: a.x5, z: a.zScore, zone: ZONE[a.zone], rfinBase: a.rFinBase,
    fiscalYear: r.dataYear, source: r.provenance.rawCells.financials,
  }];
}));

const esg = Object.fromEntries(records.map((r) => [r.ticker, {
  esgScore: r.calculated.esg.total,
  pillars: { ...r.calculated.esg.pillars, transparency: TODO, compliance: TODO },
  greenwashingRisk: TODO,
  evidence: [],
}]));

// Sự kiện đã duyệt trong workbook (Include = 1). active = tính vào P_OSINT của năm dữ liệu đang hiển thị
// (sự kiện năm t → dự báo t+1); các năm khác là lịch sử.
const osint = engine.osintEvents.map((e, i) => ({
  id: `wb-${e.ticker}-${e.decisionYear}-${i + 1}`,
  ticker: e.ticker,
  date: eventDate(e),
  dateNote: e.dateNote ?? null,
  decisionYear: e.decisionYear,
  forecastYear: e.forecastYear,
  type: OSINT_TYPE.find(([re]) => re.test(e.violationType ?? ""))?.[1] ?? "other",
  severity: e.level,
  penalty: engine.penaltyTable[e.level],
  title: e.summary ?? e.entity,
  source: e.authority ?? (e.sourceUrl ? new URL(e.sourceUrl).hostname.replace(/^www\./, "") : TODO),
  url: e.sourceUrl ?? "",
  active: e.decisionYear === dataYear,
}));

const market = engine.params.market[dataYear];
const penalty = engine.penaltyTable;
const methodology = {
  financialEngineVersion: engine.engineVersion,
  dataYear,
  forecastYear,
  calculatedMetrics: ["CAPM expected return", "adjusted-price period return", "Altman Z X1-X5", "Altman zone", "RFin base", "P_OSINT (max level per year)", "ESG peer percentile"],
  inputSource: engine.sourceWorkbook,
  realizedReturnPeriod: `Giá điều chỉnh đầu → cuối năm ${forecastYear} (sheet GOC_RREAL); kết quả lịch sử, không phải dự báo`,
  riskFree: { value: market.riskFree, source: market.source },
  equityRiskPremium: { value: market.marketRiskPremium, source: market.source },
  capm: "Ri = Rf + β × MRP",
  altman: "Z = 1,2·X1 + 1,4·X2 + 3,3·X3 + 0,6·X4 + 1,0·X5 (Altman 1968)",
  altmanZones: `Safe > ${vi(engine.params.zSafe)} · Grey ${vi(engine.params.zDistress)}–${vi(engine.params.zSafe)} · Distress < ${vi(engine.params.zDistress)}`,
  penaltyTable: penalty,
  posintTiers: `Mức 1 = +${vi(penalty[1].toFixed(2))} · Mức 2 = +${vi(penalty[2].toFixed(2))} · Mức 3 = +${vi(penalty[3].toFixed(2))} (lấy mức cao nhất trong năm, không cộng dồn)`,
  dataSource: `${engine.sourceWorkbook} – dữ liệu năm ${dataYear}, dự báo ${forecastYear}`,
};

// Chỉ tiêu tuyệt đối phụ thuộc quy mô DN: workbook vẫn xếp hạng trực tiếp, UI chỉ cảnh báo khi so sánh.
const SIZE_DEPENDENT = new Set(["E_01", "E_06", "E_08", "S_01", "S_09"]);
const indicators = engine.esgIndicators[dataYear];
const esgTickers = records.map((r) => r.ticker);
const esgIndicators = {
  year: dataYear,
  source: `${engine.sourceWorkbook} – sheet GOC_ESG năm ${dataYear} (BCPTBV, BCTN, BCTC)`,
  indicators: indicators.map((r) => ({
    code: r.code,
    pillar: r.code.slice(0, 1),
    name: r.name,
    type: r.type === "Bool" ? "bool" : "number",
    polarity: String(r.polarity).includes("-") || String(r.polarity).includes("−") ? -1 : 1,
    use: true,
    sizeDependent: SIZE_DEPENDENT.has(r.code),
  })),
  values: Object.fromEntries(esgTickers.map((t) => [t, Object.fromEntries(indicators.map((r) => [r.code, r.values[t] ?? null]))])),
};

const files = {
  "companies.json": companies,
  "zscore.json": zscore,
  "esg.json": esg,
  "osint_events.json": osint,
  "methodology.json": methodology,
  "esg_indicators.json": esgIndicators,
  "universe_pending.json": [],
};
for (const [name, data] of Object.entries(files)) writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + "\n");
// Kịch bản danh mục và mẫu Cổng 2 của workbook 4 mã cũ không còn nguồn.
for (const stale of ["portfolio.json", "scenarios.json", "private_sample.json"]) rmSync(join(OUT, stale), { force: true });
console.log(`✓ ${Object.keys(files).length} file JSON màn hình ← financial_engine.json (năm dữ liệu ${dataYear}, ${records.length} mã)`);
