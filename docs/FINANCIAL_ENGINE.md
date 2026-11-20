# Financial Engine and Methodology

**Status:** `scripts/build-financial-engine-data.mjs` independently recalculates 36 company-year records and exposes them at `GET /api/v1/financial-engine`. Source: `data/QuantumRegTech_Input_Data_final.xlsx`. Profile screens use the latest data year (2024); `/portfolio` lets the user pick any data year t and compares with realized returns of t+1. The portfolio page offers the existing preference-based allocation and a separate classical Markowitz + ESG research recommendation using the Kaggle notebook and `data/market_prices_monthly.csv`.
**Related:** [DATA.md](DATA.md), [spec data model](../specs/001-investor-due-diligence-demo/data-model.md)

## Rules for all calculations

- Implement formulas in deterministic code, with method version, inputs, units, fiscal period, source, and intermediate values returned.
- Use `null`/TODO for missing inputs. Never let an LLM infer financial values or fill gaps.
- Do not mix Altman Z, Z′, or Z″-EM coefficients/thresholds. Label each model on screen/report.
- Workbook's canonical listed-company demo decision is Altman Z (1968), zone thresholds 2.99 / 1.81, and weight bounds 15%–55%. AQ_Input v3 Z″-EM and 5%–40% bounds are a separate unreconciled methodology, not an interchangeable update.
- Maintain a methodology version and a data-quality issue for every unconfirmed source or conflicting workbook value.

## Altman Z (listed-company demo)

For listed manufacturers, with workbook-specific inputs:

```text
X1 = (Current Assets - Current Liabilities) / Total Assets
X2 = Retained Earnings / Total Assets
X3 = (EBT + Interest Expense) / Total Assets
X4 = Market Capitalization / Total Liabilities
X5 = Net Revenue / Total Assets
Z  = 1.2 X1 + 1.4 X2 + 3.3 X3 + 0.6 X4 + 1.0 X5
```

The workbook uses EBT + interest expense for X3 (a proxy; disclose this rather than calling it audited EBIT). Zone: Safe `Z > 2.99`; Grey `1.81 ≤ Z ≤ 2.99`; Distress `Z < 1.81`.

## Altman Z′ (private-company PDF)

For the existing private-company extraction flow:

```text
X1 = (Current Assets - Current Liabilities) / Total Assets
X2 = Retained Earnings / Total Assets
X3 = (EBT + Interest Expense) / Total Assets
X4 = Book Equity / Total Liabilities
X5 = Net Revenue / Total Assets
Z′ = 0.717 X1 + 0.847 X2 + 3.107 X3 + 0.420 X4 + 0.998 X5
```

Use the Z′ zones documented by the private-company methodology in code. Do not apply listed Z thresholds to Z′. Private Grey-zone RFin mapping is unresolved in `docs/DATA.md`; show missing until the data owner approves it. Validate nonzero denominators and unit consistency. PDF values need page/line citations.

## CAPM expected return

```text
Ri = Rf + βi × MRP
```

Use annual risk-free rate `Rf`, beta `βi`, and market risk premium `MRP` with source and as-of date/year. In the current workbook, 2024 inputs for forecast 2025 are `Rf = 3.068%` (Vietnam 10-year government bond yield at 31/12/2024) and `MRP = 8.35%` (Damodaran, NYU Stern). The older `Rf = 2.77%` label was removed because it did not match the selected workbook input. This explains the change from the older appendix; it is not a universal default. Recheck the source observations before presenting these as independently verified market data.

## RFin base

For listed Z methodology, workbook design:

```text
Z ≥ 2.99  => RFin_base = 0.10
Z ≤ 1.81  => RFin_base = 0.70
1.81 < Z < 2.99 => linear interpolation from 0.70 down to 0.10
```

This is an internal risk mapping, not an original Altman probability. Formula between thresholds:

```text
RFin_base = 0.70 - (Z - 1.81) × (0.60 / (2.99 - 1.81))
```

Do not claim a probability of default. Clamp behavior and valid upper bound for total risk must be explicitly configured; the product must not silently clamp.

## POSINT and total financial risk

Workbook policy tiers:

| Evidence level | Example policy signal | Penalty |
|---|---|---:|
| 0 | No qualifying approved event | 0.00 |
| 1 | Media report, warning, or reminder | +0.05 |
| 2 | Verified administrative penalty decision | +0.10 |
| 3 | Prosecution, suspension, or severe event | +0.20 or approved policy value |

```text
POSINT = penalty_table[max(level for approved, active findings)]
RFin_total = RFin_base + POSINT
```

The workbook policy uses the highest included event level for a decision year; penalties are **not summed**. An article or allegation without a formal decision must not be described as a confirmed fine.

POSINT is a policy penalty, not a probability. A news article alone cannot be promoted to a formal penalty. Current MCM event details/severity are documented as a data-quality decision in `docs/DATA.md`; preserve the selected workbook interpretation and warning unless a data owner changes it.

## ESG

- Display existing ESG total as provided, with workbook source/version.
- E/S/G radar only when the relevant pillar values exist.
- `ESG_ChiTieu` disclosure counts are disclosure measures, not ESG scores. Never normalize those counts into pillar scores without an approved methodology.
- Do not derive a total or pillar from missing indicators. ESG rubric, weights, normalization, and missing-data treatment need an approved version before recomputation.

## Portfolio objective and constraints

The manual scenario presets combine configured priorities for expected return, ESG, and financial safety:

```text
uᵢ = pR × N(Rᵢ) + pE × N(ESGᵢ) + pS × (1 − N(RFinᵢ))
qᵢ = exp(4 × uᵢ)
```

`N` min-max normalizes each input among the selected companies. Each preset's priorities sum to one. The system distributes weights in proportion to `qᵢ` and reapplies a concentration cap: 35% per company for three or more selections, 55% for two, and 100% for a single selection. The amounts are rounded so displayed allocations add back to the entered capital. The UI lets users select a preset and edit capital; it does not expose these three priorities as sliders.

This is an automatic allocation from the selected tickers and configured objective profile. It remains available alongside the covariance-based recommendation. The measured CAPM, ESG, and financial-risk inputs come from the selected historical data year. P_OSINT events accepted in the session raise R_fin,total via the Params table (highest level, no summing) before weights are computed.

The separate notebook-based recommendation currently uses:

```text
maximize wᵀ(μ + γ·ESG − δ·RFin) − (λ/2)·wᵀΣw
λ = MRP / annualized_variance(VN-Index)
Σi wi = 1; 0.02 ≤ wi ≤ 0.40; 3–9 selected tickers
γ, δ ∈ [0.00, 0.30], step 0.01
```

The two adjustable parameters are γ (ESG preference) and δ (financial-risk penalty). Notebook starting values are γ=0.30 and δ=0.25. The service uses SLSQP (classical numerical optimization), CAPM return `μ`, workbook ESGi and RFin, and annualized covariance from monthly price returns over up to 36 months ending in data year t. It applies OSINT severity accepted in the current session before optimization. It does not implement QUBO or QAOA.

The notebook selected γ/δ by comparing historical outcomes from 2022–2025, so these values are ex-post calibration rather than out-of-sample validation. The monthly series and workbook outcomes also disagree by +8.10 percentage points for PAN 2023 and −8.02 percentage points for KDC 2024. The historical comparison is preserved in [the evaluation report](Bao_cao_danh_gia_Markowitz_ESG.docx), separate from the customer allocation view. Users can apply a computed allocation to the current portfolio view or return to automatic weights.

For a future discrete/QUBO extension of the current classical recommendation, the research target is:

```text
maximize F(W) = Σi wi(αRi + γESGi - δRFin_i) - β ΣiΣj wi wj σij
```

Subject to:

```text
Σi wi = 1
investment-policy bounds to be selected and documented
```

`σij` must use aligned adjusted-price return series with documented frequency/window and annualization. The current browser recommendation is continuous SLSQP; do not label it as a QUBO/QAOA or quantum run. Report infeasibility if constraints conflict and independently validate solver output.

## Performance measures

```text
Expected portfolio return = Σi wi × Ri
Realized portfolio return = Σi wi × realized_return_i
Weighted ESG = Σi wi × ESGi   # only if every selected ESGi is comparable and available
Weighted RFin = Σi wi × RFin_total_i
Portfolio variance = Wᵀ Σ W
Portfolio volatility = sqrt(Wᵀ Σ W)
```

Every aggregate must list excluded/missing inputs and the selected time period. Do not compare portfolio realized return to a market benchmark unless the benchmark series exists.

## Current implementation boundary

- `npm run data` runs `build-financial-engine-data.mjs` (recalculate + reconcile all 36 rows) and then `build-data.mjs` (screen JSON for the latest data year). The old 4-ticker workbook, its Baseline/ESG-aware scenarios and `Portfolio_Summary` checks were removed.
- Realized return = adjusted price end / start of the forecast year − 1 (`GOC_RREAL`). It is retained for retrospective analysis; it is not annualized, rolling, out-of-sample, or a live feed.
- The portfolio builder retains preference-based weights and separately calls `POST /api/v1/portfolio/optimize` for the notebook-based classical Markowitz + ESG recommendation. This path uses 36 months of monthly prices when available, 2%–40% per-ticker bounds, and 3–9 tickers. It is not QUBO/QAOA or a validated forward investment strategy.
- ESG pillar and total scores are recomputed from raw ESG indicators. The nine-company percentile scores are relative to this peer group and change if the group changes.
- The OSINT LLM can propose category/severity only from provider-supplied title/excerpt text. The quote must be a literal substring of the excerpt. Reviewer action is session-local and cannot write an official score.

## Input_Data_final workbook ingestion

- `scripts/build-financial-engine-data.mjs` calculates market capitalization, X1–X5, Altman Z and zone, the workbook's linear R_fin map, maximum included OSINT penalty by forecast year, CAPM expected return, adjusted-price period return, and E/S/G from `GOC_ZSCORE`, `GOC_RREAL`, `GOC_ESG`, `Params`, and `OSINT_Events`.
- It independently recomputes ESG peer percentile scores per indicator from the raw ESG observations. Numeric N/A values are excluded from that indicator's ranking; Boolean N/A values count as zero. Pillars use the workbook's 40/35/25 weights. The nine-company peer universe makes the scores relative, not absolute.
- Calculated metrics are reconciled against cached results in `TINH_TONG_HOP` and `ESG_Scores`. The cached sheets are validation targets only and are not used as model inputs.
- The workbook has four annual price-period observations per company; the notebook's monthly series is `data/market_prices_monthly.csv`. It supports a prototype covariance calculation, but the price-series/workbook discrepancies and ex-post coefficient selection mean the result is not independently validated or out-of-sample.
- Raw rows preserve workbook cell provenance but do not have per-field primary-source URLs. Beta, Rf, and MRP are supplied values whose calculation windows and retrieval dates still need source review. The workbook includes 2024 data paired with 2025 forecast/outcome fields; these are historical outcomes, not current forward estimates.
- `GET /api/v1/financial-engine?data_year=2024&ticker=VNM` returns the recalculated record and its limitations. The portfolio builder and stock list consume these records; other assessment screens still use their existing data path.

## ViFinQA reuse

The local ViFinQA project is useful as an extraction and validation reference, especially for mapping Vietnamese annual-report rows to stable account concepts and preserving consolidated/separate report metadata. Its generated facts include accounting-identity and cross-year checks; those are suitable patterns for QC in this engine, not proof that every OCR fact is correct.

Do not bulk-copy the local corpus or its extracted statements into this product yet. The ViFinQA README identifies the underlying TiniX OCR statements as CC BY-NC 4.0 and says the question annotations have no separate license. Use the parser/QC approach first; obtain an appropriate data license before any commercial or redistributed use. For each imported value, retain the source report, statement type, page/table, account code or normalized label, unit scale, period, and review status.
