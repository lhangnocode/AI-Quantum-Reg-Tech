# Dữ liệu & Hợp đồng API – QuantumRegTech MVP

> Thay cho `MOCK_DATA.md` (đã xoá). Nguồn dữ liệu duy nhất của app là file Excel **`data/QuantumRegTech_Data.xlsx`**.
> Schema JSON ở mục 5 **chính là hợp đồng API** cho Vòng 2: khi có backend thật, endpoint trả đúng cấu trúc này → UI không phải sửa.

## 1. Luồng dữ liệu

```
data/QuantumRegTech_Data.xlsx ──(npm run data · scripts/build-data.mjs)──► src/data/*.json ──► src/lib/api.ts ──► UI
        ▲ nhóm tài chính sửa                    tự chạy trước dev / build / test          (không commit)
```

- **Chỉ sửa file Excel**, không sửa `src/data/*.json` (bị ghi đè và nằm trong `.gitignore`).
- `npm run data` tự chạy qua `predev`, `prebuild`, `pretest` → Vercel build cũng tự sinh JSON.
- Component **không bao giờ** `import` trực tiếp từ `src/data/` – luôn qua `src/lib/api.ts`.
- Script báo lỗi rõ ràng khi: thiếu sheet, ô cần số lại chứa chữ, công thức chưa có kết quả (file sửa bằng công cụ không tính công thức → mở bằng Excel/LibreOffice rồi lưu lại).

### Quy trình cập nhật số liệu
1. Mở `data/QuantumRegTech_Data.xlsx` bằng Excel hoặc LibreOffice, sửa ô đầu vào (không sửa ô công thức nền xám).
2. Lưu file (để lưu kết quả công thức).
3. `npm run data && npm test` – unit test đối chiếu lại với số công bố ở mục 2.
4. `npm run dev` để xem trên UI, rồi commit file Excel.

## 2. Nguồn số liệu & số chuẩn

| Nguồn | Dùng cho |
|---|---|
| **Phụ lục B – Hồ sơ Vòng 1** (trước đây ghi trong `MOCK_DATA.md`) | Ri, β, Z công bố, vùng, RFin, POSINT, ESGi, tỷ trọng, kết quả danh mục, bằng chứng MCM |
| **`AQ_Input.xlsx`** – file nhập liệu v3 của nhóm tài chính (đã dùng xong và xoá khỏi repo; bản gốc do nhóm tài chính giữ) | BCTC hợp nhất 2024 → X1–X5; giá điều chỉnh 2025 → lợi nhuận thực tế; sàn MCM; tên/phân ngành; TH cho Cổng 2; chỉ tiêu ESG thô 2024 |

### Tham số chung (sheet `Params`)

| Tham số | Giá trị | Nguồn |
|---|---|---|
| Rf | 2,77% | TPCP 10 năm – VIS Rating |
| ERP | 8,35% | Damodaran – NYU Stern 2025 |
| CAPM | `Ri = Rf + βi × ERP` | |
| Altman Z (DN niêm yết) | `1,2X1 + 1,4X2 + 3,3X3 + 0,6X4 + 1,0X5` | Safe > 2,99 · Grey 1,81–2,99 · Distress < 1,81 |
| Altman Z' (Cổng 2) | `0,717X1 + 0,847X2 + 3,107X3 + 0,420X4 + 0,998X5` | Safe > 2,90 · Grey 1,23–2,90 · Distress < 1,23 (Altman 1983 – *cần xác nhận*) |
| Ràng buộc tỷ trọng | `0,15 ≤ wᵢ ≤ 0,55`, `Σwᵢ = 1` | |
| Vốn mô phỏng | 100 tỷ VNĐ | |
| Bậc phạt POSINT | Mức 1 = +0,05 · Mức 2 = +0,10 · Mức 3 ≥ +0,20 | |

> Ngưỡng Altman cũng được khai báo trong `src/lib/risk.ts` (`ALTMAN_SAFE`, `ALTMAN_THRESHOLDS`). Đổi ngưỡng trong `Params` → sửa cả `risk.ts`.

### Số liệu 4 doanh nghiệp (Phụ lục B – unit test đối chiếu)

| Mã | Ri | β | Z | Vùng | RFin,Base | POSINT | RFin,Total | ESGi | w* ESG-aware | w Baseline | Lợi nhuận thực tế |
|---|---|---|---|---|---|---|---|---|---|---|---|
| VNM | 7,70% | 0,590 | 6,18 | Safe | 0,10 | 0,00 | 0,10 | 0,5759 | 50,9% | 15,0% | +5,14% |
| SAB | 9,95% | 0,860 | 6,51 | Safe | 0,10 | 0,00 | 0,10 | 0,5117 | 19,1% | 55,0% | −6,30% |
| MCM | 8,78% | 0,720 | 6,90 | Safe | 0,10 | 0,10 | 0,20 | 0,2519 | 15,0% | 15,0% | −17,89% |
| SBT | 9,12% | 0,761 | 1,80 | Distress | 0,70 | 0,00 | 0,70 | 0,5842 | 15,0% | 15,0% | +114,9% |

| | Baseline (Markowitz) | ESG-aware (RegTech AI-Quantum) |
|---|---|---|
| Lợi nhuận kỳ vọng | 9,31% | 8,50% |
| Lợi nhuận thực tế | 11,86% | 15,96% |
| Chênh lệch thực tế | | **+4,11 điểm % so với Baseline** |

**Đối chiếu (đã kiểm tra):** Z tính lại từ BCTC 2024 (sheet `ZScore`) = 6,1797 · 6,5143 · 6,9009 · 1,7996 → làm tròn khớp Z công bố. Ri tính bằng CAPM và lợi nhuận thực tế tính từ giá 2025 khớp bảng trên. Trong Excel, Ri, lợi nhuận thực tế, X1–X5, Z, vùng và lợi nhuận danh mục là **công thức**, không nhập tay.

### Lưu ý diễn giải (từ Phụ lục B)
- **SAB:** Phụ lục B ghi "Lợi nhuận bù trừ điểm phạt Thuế" nhưng POSINT = 0. AQ_Input có sự kiện phạt thuế 2024 nhưng chưa có số QĐ/link → chưa đưa vào dữ liệu (mục 6).
- **SBT:** diễn giải đúng là "Bị siết do Z = 1,80 (Distress) → RFin,Base = 0,70" (POSINT = 0).
- **Backtest:** SBT ở mức 15% trong cả hai mô hình, phần vượt trội đến từ chuyển vốn SAB → VNM → nói "so với Baseline", không nói "so với thị trường chung".

## 3. Cấu trúc file Excel

Dòng 1 mỗi sheet = **tên cột máy đọc** (không đổi tên; rê chuột vào ô tiêu đề để xem giải thích). Dữ liệu từ dòng 2.
Ô **nền vàng ghi `TODO`** = chưa có số liệu → UI hiện "—". Ô **nền xám** = công thức.

| Sheet | Nội dung | Sinh ra |
|---|---|---|
| `README` | Hướng dẫn, nguồn số liệu | – |
| `Params` | `key` / `value` / `note` / `source`: Rf, ERP, công thức, ngưỡng Z/Z', bậc POSINT, ràng buộc, vốn, solver, α β γ δ, QUBO | `methodology.json`, một phần `portfolio.json` |
| `Companies` | ticker, name, exchange, subsector, listed (1/0), fy_end_month, note | `companies.json` |
| `Financials` | BCTC hợp nhất 2024 (tỷ đồng): CA, TA, CL, TL, RE, Revenue, PBT, Interest, MktCap | đầu vào của `ZScore` |
| `ZScore` | x1–x5, z, zone (**công thức**), z_appendix (đối chiếu), rfin_base, fiscal_year | `zscore.json` |
| `Market` | beta, price_start_next, price_end_next; expected_return, realized_return (**công thức**) | `companies.json` |
| `ESG` | esg_score, E, S, G, transparency, compliance, greenwashing_risk | `esg.json` |
| `ESG_Evidence` | Cặp bằng chứng tẩy xanh (claim ↔ counter, contradiction, nguồn) | `esg.json → evidence[]` |
| `OSINT` | id, ticker, year, month (TODO nếu chưa rõ), type, severity, penalty, title, source, url, active (1/0), note | `osint_events.json` |
| `Portfolio` | w_esg_aware, w_baseline; lợi nhuận tra từ Market | `portfolio.json` |
| `Portfolio_Summary` | Lợi nhuận kỳ vọng/thực tế (**SUMPRODUCT**), tổng tỷ trọng, số công bố để đối chiếu | `portfolio.json` |
| `Scenarios` | α β γ δ + tỷ trọng từng mã (cho slider) | `scenarios.json` |
| `QUBO_Matrix` | Vùng B3:Q18 cho ma trận Q 16×16 (để trống = chưa có) | `portfolio.json → qubo.matrix` |
| `Private_Sample` | Kết quả mẫu Cổng 2 dạng `key` / `value` (TH – chưa niêm yết), dùng khi tải tệp Excel | `private_sample.json` |
| `ESG_ChiTieu` | 32 chỉ tiêu ESG thô 2024 của VNM, SAB, MCM, SBT, TH (từ AQ_Input) – **app chưa đọc**, dùng để tính điểm trụ cột | – |
| `Cho_xac_nhan` | Danh sách việc cần nhóm quyết định (mục 6) | – |

Thêm doanh nghiệp: thêm dòng ở `Companies`, `Financials`, `ZScore` (chép công thức), `Market`, `ESG`, `Portfolio`, cột mới ở `Scenarios`; tỷ trọng phải tính lại bằng code tối ưu.

## 4. Quy ước giá trị

- `"TODO"` = chưa có số liệu. Kiểu TypeScript `Todo<T> = T | "TODO"` (`src/lib/types.ts`); UI hiện "—" qua `format.ts`, biểu đồ hiện `EmptyChart`. **Không điền số ước lượng.**
- Tỷ lệ lưu dạng thập phân (0,0995 = 9,95%); tiền trong `Financials` là tỷ đồng, `capital_vnd` là VNĐ.
- Ngày sự kiện OSINT: `year` + `month` → `"YYYY-MM"`; tháng chưa rõ → `"YYYY-TODO"` (timeline đặt ở cột "Chưa rõ").
- POSINT của DN = tổng `penalty` các sự kiện `active = 1`. RFin,Total = RFin,Base + POSINT (tính trong `src/lib/overview.ts`).

## 5. Schema JSON (= hợp đồng API)

### `companies.json`
```json
[{ "ticker": "VNM", "name": "CTCP Sữa Việt Nam", "exchange": "HOSE", "subsector": "Sữa", "listed": true,
   "beta": 0.59, "expectedReturn": 0.076965, "realizedReturn": 0.051366 }]
```

### `zscore.json`
```json
{ "VNM": { "model": "Z", "x1": 0.3469, "x2": 0.0631, "x3": 0.2158, "x4": 6.4001, "x5": 1.1231,
           "z": 6.1797, "zone": "safe", "rfinBase": 0.1, "fiscalYear": 2024 } }
```
`zone`: `"safe" | "grey" | "distress"`; `model`: `"Z" | "Z'"`.

### `esg.json`
```json
{ "MCM": { "esgScore": 0.2519,
           "pillars": { "E": "TODO", "S": "TODO", "G": "TODO", "transparency": "TODO", "compliance": "TODO" },
           "greenwashingRisk": "high",
           "evidence": [{ "claim": "TODO", "claimSource": "TODO",
                          "counter": "Nguy cơ ô nhiễm môi trường từ hoạt động chăn nuôi bò sữa",
                          "counterSource": "Tạp chí Môi trường và Xây dựng (2022)", "counterUrl": "https://…",
                          "contradiction": 0.78, "taxonomyRef": "TODO" }] } }
```
`greenwashingRisk`: `"low" | "medium" | "high" | "TODO"`; `contradiction`: 0–1; `evidence` có thể rỗng.

### `osint_events.json`
```json
[{ "id": "evt-mcm-2022-01", "ticker": "MCM", "date": "2022-TODO", "type": "environment", "severity": 2, "penalty": 0.1,
   "title": "Báo chí phản ánh nguy cơ ô nhiễm môi trường", "source": "Tạp chí Môi trường và Xây dựng",
   "url": "https://…", "active": true }]
```
`type`: `"tax" | "environment" | "securities" | "media"`; `severity`: 1 | 2 | 3.

### `portfolio.json`
```json
{ "capital": 100000000000, "constraints": { "minWeight": 0.15, "maxWeight": 0.55 },
  "params": { "alpha": "TODO", "beta": "TODO", "gamma": "TODO", "delta": "TODO" }, "solver": "classical-cobyla",
  "esgAware": { "weights": { "VNM": 0.509, "SAB": 0.191, "MCM": 0.15, "SBT": 0.15 }, "expectedReturn": 0.08504, "realizedReturn": 0.15963 },
  "baseline": { "weights": { "VNM": 0.15, "SAB": 0.55, "MCM": 0.15, "SBT": 0.15 }, "expectedReturn": 0.09313, "realizedReturn": 0.11857 },
  "qubo": { "bitsPerAsset": 4, "numQubits": 16, "matrix": "TODO – 16×16, dán vào sheet QUBO_Matrix" } }
```
`qubo.matrix` là `number[][]` khi sheet `QUBO_Matrix` có đủ 16×16 số.

### `scenarios.json`
```json
[{ "params": { "alpha": 1, "beta": 1, "gamma": 0, "delta": 0 }, "weights": { "VNM": 0.15, "SAB": 0.55, "MCM": 0.15, "SBT": 0.15 } },
 { "params": { "alpha": 1, "beta": 1, "gamma": 1, "delta": 1 }, "weights": { "VNM": 0.509, "SAB": 0.191, "MCM": 0.15, "SBT": 0.15 } }]
```
UI chọn kịch bản gần nhất (khoảng cách Euclid trên α β γ δ) và tự tính lợi nhuận bằng Σ wᵢ × Rᵢ. Nên sinh 10–20 kịch bản từ code Python.

### `private_sample.json` (Cổng 2)
```json
{ "company": { "name": "CTCP Chuỗi Sữa TH", "subsector": "Sữa", "listed": false, "fiscalYear": 2024 },
  "zscore": { "model": "Z'", "x1": "TODO", "x2": "TODO", "x3": "TODO", "x4": "TODO", "x5": "TODO", "z": "TODO", "zone": "TODO", "rfinBase": "TODO" },
  "esg": { "esgScore": "TODO", "pillars": { "E": "TODO", "S": "TODO", "G": "TODO", "transparency": "TODO", "compliance": "TODO" }, "greenwashingRisk": "TODO", "evidence": [] },
  "events": [], "posint": "TODO" }
```
Kết quả Cổng 2 (`PrivateAnalysis` – `src/lib/types.ts`) = dạng trên + các trường:

```json
{ "source": "document",
  "extraction": { "fileType": "pdf", "pages": 2, "processedPages": 2, "ocrPages": [1, 2], "unit": "VND",
                  "fields": [{ "key": "TA", "label": "Tổng cộng tài sản", "code": "270", "value": 1457563223991,
                               "page": 1, "source": "ocr", "line": "TỔNG CỘNG TÀI SẢN 270 1.457.563.223.991 1.360.910.452.122" }],
                  "warnings": [] },
  "deletedAt": "2026-09-27T03:20:00.000Z" }
```
- `source`: `"document"` = số liệu trích từ tệp tải lên (PDF); `"sample"` = kết quả mẫu từ sheet `Private_Sample` (khi tải Excel).
- `extraction.fields`: 9 chỉ tiêu `CA` (100) · `TA` (270) · `CL` (310) · `TL` (300) · `EQ` (400) · `RE` (421) · `Revenue` (10) · `PBT` (50) · `Interest` (23); `value = null` nếu không tìm thấy.
- `deletedAt`: thời điểm xoá tệp gốc (Zero-Retention). Backend Vòng 2 phải trả cùng cấu trúc này.

### Cổng 2 – từ PDF đến Z'

| Chỉ tiêu Z' | Công thức (mã số B01-DN / B02-DN) |
|---|---|
| X1 | (Tài sản ngắn hạn 100 − Nợ ngắn hạn 310) / Tổng tài sản 270 |
| X2 | LNST chưa phân phối 421 / Tổng tài sản 270 |
| X3 | (Tổng LN kế toán trước thuế 50 + Chi phí lãi vay 23) / Tổng tài sản 270 |
| X4 | Vốn chủ sở hữu **sổ sách** 400 / Nợ phải trả 300 (DN chưa niêm yết không có vốn hoá) |
| X5 | Doanh thu thuần 10 / Tổng tài sản 270 |

`Z' = 0,717X1 + 0,847X2 + 3,107X3 + 0,420X4 + 0,998X5`; vùng theo ngưỡng Z'; RFin,Base theo vùng (Safe 0,10 · Distress 0,70 · Grey chưa quy định → "—"). POSINT, ESG của DN tải lên: "TODO" (chưa tự động). Code: `src/lib/ocr/` (`extract-pdf.ts`, `parse-financials.ts`, `zprime.ts`).

### `methodology.json`
```json
{ "riskFree": { "value": 0.0277, "source": "TPCP 10 năm – VIS Rating" },
  "equityRiskPremium": { "value": 0.0835, "source": "Damodaran – NYU Stern 2025" },
  "capm": "Ri = Rf + βi × ERP", "altman": "Z = 1,2X1 + 1,4X2 + 3,3X3 + 0,6X4 + 1,0X5",
  "altmanZones": "Safe > 2,99 · Grey 1,81–2,99 · Distress < 1,81",
  "posintTiers": "Mức 1 = +0,05 · Mức 2 = +0,10 · Mức 3 ≥ +0,20",
  "dataSource": "Phụ lục B – Hồ sơ Vòng 1; bổ sung AQ_Input.xlsx (BCTC 2024, giá 2025)" }
```

### Endpoint tương lai (Vòng 2)

| Method | Endpoint | Trả về |
|---|---|---|
| GET | `/api/v1/companies` | `companies.json` |
| GET | `/api/v1/companies/{ticker}/zscore` | 1 phần tử của `zscore.json` |
| GET | `/api/v1/companies/{ticker}/esg` | 1 phần tử của `esg.json` |
| GET | `/api/v1/companies/{ticker}/osint?months=36` | lọc `osint_events.json` |
| POST | `/api/v1/portfolio/optimize` body `{ tickers, params, constraints, solver }` | `portfolio.json` |
| POST | `/api/v1/private/analyze` (multipart, field `file`) | `PrivateAnalysis`: dạng `private_sample.json` + `source`, `extraction`, `deletedAt` |
| GET | `/api/v1/methodology` | `methodology.json` |
| GET | `/api/v1/reports/{ticker}` | dữ liệu báo cáo |

## 6. Còn thiếu & cần nhóm quyết định

Danh sách đầy đủ (kèm quyết định) ở sheet `Cho_xac_nhan` trong file Excel.

**Ô `TODO` còn lại**

| Sheet | Trường | Ảnh hưởng trên UI |
|---|---|---|
| `ESG` | E, S, G, transparency, compliance (4 DN) | Radar ESG hiện trạng thái rỗng |
| `ESG` | greenwashing_risk của VNM, SAB, SBT | "Rủi ro tẩy xanh: —" |
| `ESG_Evidence` | MCM claim, claim_source, taxonomy_ref | "Chưa có trích dẫn tuyên bố" |
| `OSINT` | Tháng sự kiện MCM 2022 | Timeline đặt ở cột "Chưa rõ" |
| `Params` | α β γ δ | – |
| `QUBO_Matrix` | Ma trận Q 16×16 | Heatmap QUBO rỗng |
| `Scenarios` | Thêm kịch bản | Slider chỉ nhảy giữa 2 kịch bản |
| `Private_Sample` | BCTC, Z', ESG của TH | Kết quả mẫu (khi tải Excel) hiện "—". Tải PDF BCTC thì Z' được tính thật từ tệp. |

**Quyết định đã chốt khi gộp hai nguồn** (chi tiết ở sheet `Cho_xac_nhan`)

| # | Vấn đề | Quyết định | Lý do |
|---|---|---|---|
| 1 | AQ_Input v3 dùng mô hình khác (Z''-EM ngưỡng 2,6 / 1,1; sàn 5%, trần 40%) | **Giữ Phụ lục B** (Z gốc 2,99 / 1,81; 15–55%) | Mọi số công bố (tỷ trọng, lợi nhuận, +4,11 điểm %) tính theo mô hình này và đã kiểm chứng lại từ BCTC/giá. Ngưỡng 2,6 / 1,1 thuộc công thức Z''-EM, không áp được cho Z gốc. v3 chưa đủ dữ liệu và chưa có kết quả tối ưu. Chuyển sang v3 phải làm trọn gói. |
| 2 | OSINT MCM 2022: "Phạt xả thải" (Phụ lục B) vs "Phản ánh, chưa có QĐ" (AQ_Input) | **Dùng mô tả AQ_Input**, giữ điểm phạt +0,10 | Nguồn mới, cụ thể hơn; ghi "bị phạt" khi không có quyết định là sai sự thật về DN thật. Rubric AQ_Input cũng chấm mức này 0,10 → không đổi kết quả. **Cần sửa lời thuyết minh / slide "phạt xả thải".** |
| 3 | OSINT SAB 2024 (phạt thuế) không có số QĐ / link | **Không đưa vào** (POSINT SAB = 0) | Quy tắc của chính AQ_Input: chỉ ghi sự kiện có nguồn. Khi có nguồn: +0,05 → RFin,Total SAB = 0,15 → phải chạy lại tối ưu. |
| 4 | OSINT TH 2023 (phạt 560 triệu) chưa xác minh pháp nhân | **Không đưa vào** Cổng 2 | Cùng quy tắc; chưa chắc đúng pháp nhân bị phạt. |
| 5 | Điểm trụ cột E/S/G, Minh bạch, Tuân thủ | **Để trống (TODO)** | Tự chấm điểm = tự đặt phương pháp; kết quả sẽ không khớp ESGi đã công bố; "Minh bạch", "Tuân thủ" không có nhóm chỉ tiêu riêng. Chờ `aq_v3.py`. |
| 6 | β SBT: 0,761 (Phụ lục B) vs 0,76 (AQ_Input) | **Giữ 0,761** | 0,76 là số làm tròn; 0,761 cho Ri = 9,12% khớp Phụ lục B. |

**Còn mở:** niên độ SBT (kết thúc 30/6/2024 – cần đối chiếu BCTC kiểm toán); α β γ δ, ma trận QUBO, thêm kịch bản (IT lấy từ code Python).

**Có trong AQ_Input nhưng chưa dùng** (lấy từ bản gốc của nhóm tài chính khi cần): 5 DN khác (MCH, QNS, KDC, PAN, IDP), số liệu 2023, bảng Rubric/Audit, ESG các năm 2021–2023.
