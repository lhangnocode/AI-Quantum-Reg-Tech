// Recompute financial-engine records only from the workbook's curated raw GOC_* sheets.
// Calculated Excel sheets are used as reconciliation targets, never as model inputs.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_RELATIVE = "data/QuantumRegTech_Input_Data_final.xlsx";
const SOURCE = join(ROOT, SOURCE_RELATIVE);
const OUTPUT = join(ROOT, "data", "generated", "financial_engine.json");
// Legal names (identity only, not financial data): used by the OSINT agent prompt and the UI.
const COMPANY_NAMES = {
  VNM: "CTCP Sữa Việt Nam", MCH: "CTCP Hàng tiêu dùng Masan", MCM: "CTCP Giống bò sữa Mộc Châu",
  SBT: "CTCP Thành Thành Công - Biên Hòa", QNS: "CTCP Đường Quảng Ngãi", KDC: "CTCP Tập đoàn KIDO",
  PAN: "CTCP Tập đoàn PAN", IDP: "CTCP Sữa Quốc tế", SAB: "Tổng CTCP Bia - Rượu - Nước giải khát Sài Gòn",
};

function cellValue(cell) {
  const raw = cell.value;
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "object" && ("formula" in raw || "sharedFormula" in raw)) return raw.result ?? null;
  if (typeof raw === "object" && "richText" in raw) return raw.richText.map((part) => part.text).join("").trim();
  return raw;
}
function rows(sheet, headerRow = 1) {
  const headers = sheet.getRow(headerRow).values.slice(1).map((v) => String(v ?? "").trim());
  return Array.from({ length: sheet.rowCount - headerRow }, (_, i) => {
    const rowNumber = headerRow + i + 1;
    return Object.fromEntries([["__row", rowNumber], ...headers.map((header, j) => [header, cellValue(sheet.getRow(rowNumber).getCell(j + 1))]).filter(([k]) => k)]);
  }).filter((row) => Object.entries(row).some(([key, v]) => key !== "__row" && v !== null));
}
function num(v, label) {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${label}: expected finite number, got ${String(v)}.`);
  return v;
}
function ratio(a, b, label) {
  if (b === 0) throw new Error(`${label}: denominator is zero.`);
  return num(a, `${label} numerator`) / b;
}
function reconcile(actual, expected, label, tolerance = 0.00006) {
  if (typeof expected !== "number" || Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: computed ${actual} does not match workbook reference ${expected}.`);
  }
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(SOURCE);
const inputRows = rows(workbook.getWorksheet("GOC_ZSCORE"));
const returnRows = rows(workbook.getWorksheet("GOC_RREAL"));
const events = rows(workbook.getWorksheet("OSINT_Events"));
const referenceRows = rows(workbook.getWorksheet("TINH_TONG_HOP"));
const esgReferenceRows = rows(workbook.getWorksheet("ESG_Scores"));
const params = rows(workbook.getWorksheet("Params"), 3);
const param = new Map(params.map((p) => [p.Tham_so, p.Gia_tri]));
// Params uses a compact level/value matrix in columns A:C, not a named table.
const paramsSheet = workbook.getWorksheet("Params");
const penaltyByLevel = new Map();
for (let r = 12; r <= 15; r++) penaltyByLevel.set(num(cellValue(paramsSheet.getCell(r, 1)), `Params!A${r}`), num(cellValue(paramsSheet.getCell(r, 3)), `Params!C${r}`));

const returnsByKey = new Map(returnRows.map((r) => [`${r.Data_Year}:${r.Ticker}`, r]));
const referenceByKey = new Map(referenceRows.map((r) => [`${r.Data_Year}:${r.Ticker}`, r]));
const esgReferenceByKey = new Map(esgReferenceRows.map((r) => [`${r.Year}:${r.Ticker}`, r]));
const eventsByForecastKey = new Map();
for (const event of events) {
  if (event.Include !== 1 || typeof event.Ticker !== "string") continue;
  const forecastYear = num(event.Decision_Year, "OSINT decision year") + 1;
  const key = `${forecastYear}:${event.Ticker.toUpperCase()}`;
  const level = num(event.Proposed_Level, `OSINT ${key} level`);
  const list = eventsByForecastKey.get(key) ?? [];
  const isPanTaxInspection = event.Ticker.toUpperCase() === "PAN" && event.Decision_Year === 2024 && /thanh tra 2022/i.test(event.Summary ?? "");
  list.push({ ticker: event.Ticker.toUpperCase(), entity: event.Entity, decisionYear: event.Decision_Year, forecastYear, level, authority: event.Authority ?? null, violationType: event.Violation_Type ?? null, dateNote: event.Date_Note ?? null, sourceUrl: event.Source_URL ?? null, summary: isPanTaxInspection
    ? "Khai sai thiếu thuế: phạt khoảng 210 triệu, truy thu khoảng 1 tỷ thuế TNDN (quyết định xử phạt ngày 31/01/2024 về cuộc thanh tra năm 2022)"
    : event.Summary ?? null, includedSubsidiary: event.Is_Subsidiary === 1 });
  eventsByForecastKey.set(key, list);
}

// Parse each year block in GOC_ESG: rows below the repeated header contain 32 indicators.
const esgSheet = workbook.getWorksheet("GOC_ESG");
const esgBlocks = new Map();
let activeYear = null;
const companyColumns = new Map();
for (let r = 1; r <= esgSheet.rowCount; r++) {
  const first = cellValue(esgSheet.getCell(r, 1));
  if (typeof first === "string" && /^NĂM\s+\d{4}/i.test(first)) activeYear = Number(first.match(/\d{4}/)[0]);
  if (first === "Mã" && activeYear) {
    for (let c = 5; c <= 13; c++) companyColumns.set(String(cellValue(esgSheet.getCell(r, c))).toUpperCase(), c);
    esgBlocks.set(activeYear, { indicators: [] });
    continue;
  }
  if (!activeYear || !/^[ESG]_\d{2}$/.test(String(first ?? ""))) continue;
  const indicator = { code: String(first), name: String(cellValue(esgSheet.getCell(r, 2)) ?? "").trim(), type: cellValue(esgSheet.getCell(r, 3)), polarity: cellValue(esgSheet.getCell(r, 4)), values: {} };
  for (const [ticker, column] of companyColumns) indicator.values[ticker] = cellValue(esgSheet.getCell(r, column));
  esgBlocks.get(activeYear).indicators.push(indicator);
}
const esgScores = new Map();
for (const [year, block] of esgBlocks) {
  const indicators = block.indicators;
  if (indicators.length !== 32) throw new Error(`GOC_ESG ${year}: expected 32 raw indicators, found ${indicators.length}.`);
  const tickers = [...companyColumns.keys()];
  const perTicker = new Map(tickers.map((ticker) => [ticker, { E: [], S: [], G: [] }]));
  for (const indicator of indicators) {
    const numeric = tickers.map((ticker) => ({ ticker, value: indicator.values[ticker] })).filter(({ value }) => typeof value === "number" && Number.isFinite(value));
    for (const ticker of tickers) {
      const value = indicator.values[ticker];
      // Numeric N/A is excluded from its peer ranking; Boolean N/A counts as zero per workbook rules.
      if (indicator.type === "Num" && typeof value !== "number") continue;
      const observed = indicator.type === "Bool" && typeof value !== "number" ? 0 : value;
      const peerValues = indicator.type === "Bool" ? tickers.map((t) => typeof indicator.values[t] === "number" ? indicator.values[t] : 0) : numeric.map((x) => x.value);
      const worse = peerValues.filter((peer) => indicator.polarity === "(-)" ? peer > observed : peer < observed).length;
      const tied = peerValues.filter((peer) => peer === observed).length;
      const score = (worse + 0.5 * tied) / peerValues.length;
      perTicker.get(ticker)[indicator.code[0]].push(score);
    }
  }
  for (const [ticker, pillars] of perTicker) {
    const avg = (arr) => arr.reduce((sum, x) => sum + x, 0) / arr.length;
    const E = avg(pillars.E), S = avg(pillars.S), G = avg(pillars.G);
    esgScores.set(`${year}:${ticker}`, { E, S, G, total: 0.4 * E + 0.35 * S + 0.25 * G });
  }
}

// Params!A20:E23 – Rf/MRP per data year (CAPM inputs are read per row from GOC_ZSCORE; this is for display/provenance).
const marketParams = {};
for (let r = 20; r <= 23; r++) {
  const year = num(cellValue(paramsSheet.getCell(r, 1)), `Params!A${r}`);
  marketParams[year] = { forecastYear: num(cellValue(paramsSheet.getCell(r, 2)), `Params!B${r}`), riskFree: num(cellValue(paramsSheet.getCell(r, 3)), `Params!C${r}`), marketRiskPremium: num(cellValue(paramsSheet.getCell(r, 4)), `Params!D${r}`), source: String(cellValue(paramsSheet.getCell(r, 5)) ?? "") };
}

const distress = num(param.get("Z_nguy_hiem"), "Z_nguy_hiem");
const safe = num(param.get("Z_an_toan"), "Z_an_toan");
const rMin = num(param.get("R_min"), "R_min");
const rMax = num(param.get("R_max"), "R_max");
if (safe <= distress || rMax < rMin) throw new Error("Invalid Altman/R_fin Params.");

const records = inputRows.map((input) => {
  const dataYear = num(input.Data_Year, "GOC_ZSCORE Data_Year");
  const forecastYear = num(input.Forecast_Year, `${dataYear} Forecast_Year`);
  const ticker = String(input.Ticker).toUpperCase();
  const key = `${dataYear}:${ticker}`;
  const reference = referenceByKey.get(key);
  const price = returnsByKey.get(key);
  const esg = esgScores.get(key);
  const esgReference = esgReferenceByKey.get(key);
  if (!reference || !price || !esg || !esgReference) throw new Error(`${key}: missing raw or reconciliation row.`);
  const raw = {
    currentAssets: num(input.TS_ngan_han, `${key} current assets`), totalAssets: num(input.Tong_TS, `${key} total assets`),
    currentLiabilities: num(input.No_ngan_han, `${key} current liabilities`), totalLiabilities: num(input.Tong_No, `${key} total liabilities`),
    retainedEarnings: num(input.LN_chua_PP, `${key} retained earnings`), revenue: num(input.Doanh_thu, `${key} revenue`),
    profitBeforeTax: num(input.LNTT, `${key} PBT`), interestExpense: num(input.Chi_phi_lai_vay, `${key} interest`),
    closePrice: num(input.Gia_dong_cua, `${key} close price`), sharesOutstanding: num(input.KL_cp, `${key} shares`),
    marketCapitalization: num(input.Gia_dong_cua, `${key} close price`) * num(input.KL_cp, `${key} shares`) / 1_000_000,
    adjustedPriceStart: num(price.Gia_adj_dau, `${key} adjusted start`), adjustedPriceEnd: num(price.Gia_adj_cuoi, `${key} adjusted end`),
    beta: num(input.Beta, `${key} beta`),
  };
  if (raw.totalAssets <= 0 || raw.totalLiabilities <= 0 || raw.adjustedPriceStart <= 0) throw new Error(`${key}: invalid denominator or price.`);
  const ratios = {
    x1: ratio(raw.currentAssets - raw.currentLiabilities, raw.totalAssets, `${key} X1`),
    x2: ratio(raw.retainedEarnings, raw.totalAssets, `${key} X2`),
    x3: ratio(raw.profitBeforeTax + raw.interestExpense, raw.totalAssets, `${key} X3`),
    x4: ratio(raw.marketCapitalization, raw.totalLiabilities, `${key} X4`),
    x5: ratio(raw.revenue, raw.totalAssets, `${key} X5`),
  };
  const zScore = 1.2 * ratios.x1 + 1.4 * ratios.x2 + 3.3 * ratios.x3 + 0.6 * ratios.x4 + ratios.x5;
  const zone = zScore > safe ? "SAFE" : zScore >= distress ? "GREY" : "DISTRESS";
  const rFinBase = zScore >= safe ? rMin : zScore <= distress ? rMax : rMax - (rMax - rMin) * (zScore - distress) / (safe - distress);
  const appliedEvents = eventsByForecastKey.get(`${forecastYear}:${ticker}`) ?? [];
  const penaltyLevel = appliedEvents.reduce((max, event) => Math.max(max, event.level), 0);
  const penalty = penaltyByLevel.get(penaltyLevel);
  if (penalty === undefined) throw new Error(`${key}: missing OSINT penalty level ${penaltyLevel}.`);
  const rFinTotal = rFinBase + penalty;
  const riskFree = num(input.Rf, `${key} Rf`);
  const marketRiskPremium = num(input.MRP, `${key} MRP`);
  const capmExpected = riskFree + raw.beta * marketRiskPremium;
  const realizedReturn = raw.adjustedPriceEnd / raw.adjustedPriceStart - 1;
  for (const [name, actual] of Object.entries({ X1: ratios.x1, X2: ratios.x2, X3: ratios.x3, X4: ratios.x4, X5: ratios.x5, Z_Score: zScore, R_fin_base: rFinBase, R_fin_total: rFinTotal, Ri_CAPM: capmExpected, R_real: realizedReturn })) reconcile(actual, reference[name], `${key} ${name}`);
  for (const [name, actual] of Object.entries({ E_Score: esg.E, S_Score: esg.S, G_Score: esg.G, ESG_Total: esg.total })) reconcile(actual, esgReference[name], `${key} raw ESG ${name}`, 0.00011);
  if (zone !== reference.Zone) throw new Error(`${key} zone mismatch: ${zone} vs ${reference.Zone}.`);
  const referencePenaltyLevel = typeof reference.Penalty_Level === "number" ? reference.Penalty_Level : 0;
  if (penaltyLevel !== referencePenaltyLevel) throw new Error(`${key} OSINT level mismatch: ${penaltyLevel} vs ${referencePenaltyLevel}.`);
  return {
    dataYear, forecastYear, ticker, raw,
    calculated: {
      altman: { ...ratios, zScore, zone, rFinBase, rFinTotal },
      osint: { penaltyLevel, penalty, events: appliedEvents },
      returns: { beta: raw.beta, riskFree, marketRiskPremium, capmExpected, adjustedPricePeriod: realizedReturn },
      esg: { pillars: { E: esg.E, S: esg.S, G: esg.G }, total: esg.total, method: "Per-indicator peer percentile from GOC_ESG; numeric N/A excluded, Boolean N/A treated as zero; pillar weights 40/35/25.", relativeUniverseSize: 9 },
    },
    provenance: {
      sourceWorkbook: SOURCE_RELATIVE,
      rawCells: { financials: `GOC_ZSCORE!A${input.__row}:P${input.__row}`, realizedPrices: `GOC_RREAL!A${price.__row}:E${price.__row}`, esgSheet: "GOC_ESG (year block; indicator rows by code)" },
      reconciliationCells: { financial: `TINH_TONG_HOP!A${reference.__row}:Z${reference.__row}`, esg: `ESG_Scores!A${esgReference.__row}:F${esgReference.__row}` },
      financialStatementSourceLinks: null, status: "curated_historical_workbook",
    },
  };
});

const keys = new Set(records.map((r) => `${r.dataYear}:${r.ticker}`));
const missingNames = [...new Set(records.map((r) => r.ticker))].filter((ticker) => !COMPANY_NAMES[ticker]);
if (missingNames.length) throw new Error(`COMPANY_NAMES missing: ${missingNames.join(", ")}`);
if (records.length !== 36 || keys.size !== records.length) throw new Error(`Expected 36 unique company-year rows; got ${records.length}/${keys.size}.`);
const payload = {
  dataset: "QuantumRegTech_Input_Data_FINAL",
  engineVersion: "2.1.0-raw-input-recalculation",
  generatedAt: new Date().toISOString(), sourceWorkbook: SOURCE_RELATIVE,
  periods: [...new Set(records.map((r) => r.dataYear))].sort(), tickers: [...new Set(records.map((r) => r.ticker))].sort(), recordCount: records.length,
  companies: Object.fromEntries([...new Set(records.map((r) => r.ticker))].sort().map((ticker) => [ticker, { name: COMPANY_NAMES[ticker] }])),
  // Params!A12:C15 – OSINT level → P_OSINT. Live findings a reviewer accepts are converted with this table, never by the LLM.
  penaltyTable: Object.fromEntries([...penaltyByLevel].sort((a, b) => a[0] - b[0])),
  params: { zDistress: distress, zSafe: safe, rFinMin: rMin, rFinMax: rMax, market: marketParams },
  // Raw GOC_ESG indicators per year (N/A → null). Scores above are computed from these.
  esgIndicators: Object.fromEntries([...esgBlocks].map(([year, block]) => [year, block.indicators.map(({ code, name, type, polarity, values }) => ({
    code, name, type, polarity, values: Object.fromEntries(Object.entries(values).map(([ticker, value]) => [ticker, typeof value === "number" && Number.isFinite(value) ? value : null])),
  }))])),
  // Reviewed workbook events (Include = 1). They are already approved: used directly, not re-reviewed.
  osintEvents: [...eventsByForecastKey.values()].flat().sort((a, b) => a.ticker.localeCompare(b.ticker) || a.decisionYear - b.decisionYear),
  reconciliation: { reference: "TINH_TONG_HOP and ESG_Scores cached results (validation only)", status: "passed", metricsPerRecord: 14 },
  optimizerReadiness: { ready: true, missing: [], note: "The portfolio service uses the dated monthly-price series, a 36-month covariance window, SLSQP, and the notebook's 2%–40% allocation bounds. Historical performance is evaluated separately." },
  dataQuality: ["Financial statement raw values have workbook cell provenance but no per-cell source URL.", "Beta, Rf and MRP are supplied by the workbook; beta window and rate retrieval dates need source-level reconciliation.", "ESG is recomputed from raw GOC_ESG indicators; scores are relative to the current 9-company peer set.", "2024 inputs predict 2025; realized price return is a historical outcome, not a forward expectation."],
  records: records.sort((a, b) => a.dataYear - b.dataYear || a.ticker.localeCompare(b.ticker)),
};
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`✓ ${records.length} company-year rows recalculated from GOC_* and reconciled → ${OUTPUT}`);
