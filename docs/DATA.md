# Dữ liệu & Hợp đồng API – QuantumRegTech MVP

> **Nguồn dữ liệu duy nhất:** `data/QuantumRegTech_Input_Data_final.xlsx` – 9 DN F&B niêm yết (VNM, MCH, MCM, SBT, QNS, KDC, PAN, IDP, SAB), năm dữ liệu 2021–2024 → năm dự báo 2022–2025 (36 dòng). Workbook 4 mã cũ (`QuantumRegTech_Data.xlsx`) đã bỏ.
> Tài liệu phương pháp đi kèm: `docs/Bang_cong_thuc_chi_so_v3.xlsx` (27 chỉ tiêu). Schema JSON ở mục 5 là hợp đồng API.

## 1. Luồng dữ liệu

```
data/QuantumRegTech_Input_Data_final.xlsx
   │  scripts/build-financial-engine-data.mjs  – tính lại 36 dòng từ GOC_ZSCORE, GOC_RREAL, GOC_ESG, Params, OSINT_Events;
   │                                             đối chiếu TINH_TONG_HOP, ESG_Scores (lệch → build fail)
   ▼
data/generated/financial_engine.json ──► GET /api/v1/financial-engine ──► /portfolio, /financial-engine
   │  scripts/build-data.mjs  – lấy năm dữ liệu mới nhất (2024) cho các màn hình
   ▼
data/generated/{companies,zscore,esg,osint_events,methodology,esg_indicators,universe_pending}.json
   ├─► src/lib/api.ts ──► UI (/, /stocks, /company, /report)
   └─► backend/ (FastAPI, GENERATED_DATA_DIR)
```

- `npm run data` chạy hai script theo thứ tự trên; tự chạy qua `predev`, `prebuild`, `pretest`. JSON sinh ra không commit.
- **Chỉ đọc ô số gốc** (sheet `GOC_*`, `Params`, `OSINT_Events`). Ô công thức của workbook chỉ dùng để đối chiếu – không dùng làm đầu vào.
- Component không import trực tiếp `@data/*` – luôn qua `src/lib/api.ts` (ngoại lệ: route `src/app/api/osint/scan` đọc sự kiện đã duyệt khi FastAPI không chạy).

### Quy trình cập nhật số liệu
1. Nhóm tài chính sửa ô số gốc (chữ xanh dương) trong workbook, mở bằng Excel/LibreOffice và lưu để cập nhật ô đối chiếu.
2. `npm run data && npm test`.
3. Commit file Excel.

## 2. Quy tắc tính (code tất định, khớp workbook)

| Chỉ tiêu | Công thức |
|---|---|
| Vốn hoá (tỷ đồng) | Giá đóng cửa 31/12 (nghìn đồng) × KL cổ phiếu / 1.000.000 |
| X1–X5, Z | Altman 1968 gốc: `Z = 1,2X1 + 1,4X2 + 3,3X3 + 0,6X4 + 1,0X5` (X3 dùng LNTT + chi phí lãi vay) |
| Vùng | SAFE > 2,99 · GREY 1,81–2,99 · DISTRESS < 1,81 (`Params`) |
| R_fin,base | Nội suy tuyến tính Z → [0,10; 0,70] giữa hai ngưỡng |
| P_OSINT | Mức cao nhất của sự kiện `Include = 1` có `Decision_Year = t` → bảng `Params` (0 / 0,05 / 0,10 / 0,20); **không cộng dồn**. Sự kiện năm t tính vào dự báo năm t+1 |
| R_fin,total | R_fin,base + P_OSINT |
| Ri (CAPM) | `Rf + β × MRP`, Rf/MRP theo từng năm dữ liệu (`Params`, `Nguon_Rf_MRP`) |
| R_real | Giá điều chỉnh cuối / đầu năm dự báo − 1 (`GOC_RREAL`) – kết quả lịch sử để đối chiếu, không phải dự báo |
| ESG | Percentile từng chỉ tiêu trong 9 DN (Num N/A bị loại khỏi xếp hạng, Bool N/A = 0), trụ cột = trung bình, `ESG = 0,4E + 0,35S + 0,25G` |

**Sự kiện OSINT:** sự kiện trong `OSINT_Events` (`Include = 1`) đã được nhóm duyệt → dùng thẳng. Sự kiện mới do Firecrawl Agent tìm (`/portfolio` hoặc `/company/[ticker]` → Theo dõi sự kiện xử phạt) chỉ được tính khi người dùng chấp nhận và chọn mức; hiện chỉ áp dụng trong phiên.

**Lưu ý dữ liệu MCM:** workbook giữ bài phản ánh nước thải năm 2022 ở mức 1 (0,05), không phải mức 2 (0,10). Ghi chú nguồn nói chưa có quyết định xử phạt; chỉ tăng lên mức 2 nếu tìm được quyết định. Sự kiện vẫn nằm trong workbook và được tính theo năm quyết định 2022 → dự báo 2023. Vì vậy nó không làm tăng POSINT của năm dữ liệu 2024, và nằm ngoài cửa sổ timeline 36 tháng hiện tại. Không diễn giải việc này là sự kiện đã bị xóa.

**ESGi và tẩy xanh:** ESGi hiện là điểm phân vị công bố 32 chỉ tiêu ESG trong nhóm 9 doanh nghiệp, không phải chỉ số phát hiện tẩy xanh. Workbook chưa có cặp tuyên bố doanh nghiệp ↔ nguồn độc lập đã kiểm chứng; rủi ro tẩy xanh phải hiển thị `TODO`/“chưa đánh giá”. Không gọi giao diện hiện tại là bộ phát hiện NLP/RAG.

## 3. Sheet của workbook

| Sheet | Vai trò |
|---|---|
| `GOC_ZSCORE` | Số gốc năm t: BCTC (tỷ đồng), giá đóng cửa, KL cổ phiếu, β, Rf, MRP |
| `GOC_RREAL` | Giá điều chỉnh đầu/cuối năm dự báo |
| `GOC_ESG` | 32 chỉ tiêu ESG gốc × 9 DN × 4 năm (ô vàng = đã sửa sau đối chiếu) |
| `Params` | Ngưỡng Z, R_min/R_max, bảng điểm phạt, Rf/MRP theo năm |
| `OSINT_Events` | Sự kiện trong phạm vi 2021–2024 (`Include` = người duyệt) |
| `OSINT_Ngoai_pham_vi`, `OSINT_Coverage` | Sự kiện ngoài phạm vi / tình trạng quét – không dùng trong tính toán |
| `TINH_TONG_HOP`, `ESG_Scores` | Kết quả công thức – **chỉ để đối chiếu** |

## 4. Quy ước giá trị

- `"TODO"` = chưa có số liệu (`Todo<T>` trong `src/lib/types.ts`); UI hiện "—". **Không điền số ước lượng.**
- Tỷ lệ lưu dạng thập phân (0,0835 = 8,35%).
- `osint_events.json`: `date` = năm hoặc tháng quyết định; `active = true` khi sự kiện tính vào năm dữ liệu đang hiển thị.

## 5. Schema JSON (= hợp đồng API)

### `companies.json`
```json
[{ "ticker": "VNM", "name": "CTCP Sữa Việt Nam", "exchange": "HOSE", "subsector": "Sữa", "listed": true,
   "beta": 0.59, "expectedReturn": 0.079946, "realizedReturn": 0.0514, "dataYear": 2024, "forecastYear": 2025 }]
```

### `zscore.json`
```json
{ "VNM": { "model": "Z", "x1": 0.347, "x2": 0.063, "x3": 0.216, "x4": 7.02, "x5": 1.123,
           "z": 6.55, "zone": "safe", "rfinBase": 0.1, "fiscalYear": 2024, "source": "GOC_ZSCORE!A…:P…" } }
```

### `esg.json`
```json
{ "VNM": { "esgScore": 0.600, "pillars": { "E": 0.475, "S": 0.650, "G": 0.730, "transparency": "TODO", "compliance": "TODO" },
           "greenwashingRisk": "TODO", "evidence": [] } }
```

### `osint_events.json`
```json
[{ "id": "wb-PAN-2024-5", "ticker": "PAN", "date": "2024", "dateNote": "QĐ ngày 31/01/2024", "decisionYear": 2024,
   "forecastYear": 2025, "type": "tax", "severity": 2, "penalty": 0.1, "title": "Khai sai thiếu thuế…",
   "source": "Cục Thuế Hà Nội", "url": "https://…", "active": true }]
```
`type`: `"tax" | "environment" | "securities" | "media" | "other"`.

### `financial_engine.json` (`GET /api/v1/financial-engine?data_year=&ticker=`)
36 bản ghi `{ dataYear, forecastYear, ticker, raw, calculated: { altman, osint, returns, esg }, provenance }` + `companies`, `penaltyTable`, `params`, `esgIndicators` (32 chỉ tiêu gốc theo năm), `osintEvents` (sự kiện `Include = 1`), `optimizerReadiness`.

### Cổng 2 (`PrivateAnalysis`)
Kết quả Cổng 2 (`PrivateAnalysis` – `src/lib/types.ts`) = dạng trên + các trường:

```json
{ "source": "document",
  "extraction": { "fileType": "pdf", "pages": 2, "processedPages": 2, "ocrPages": [1, 2], "unit": "VND",
                  "fields": [{ "key": "TA", "label": "Tổng cộng tài sản", "code": "270", "value": 1457563223991,
                               "page": 1, "source": "ocr", "line": "TỔNG CỘNG TÀI SẢN 270 1.457.563.223.991 1.360.910.452.122" }],
                  "warnings": [] },
  "deletedAt": "2026-09-27T03:20:00.000Z" }
```
- `source`: `"document"` = số liệu trích từ tệp PDF tải lên (Cổng 2 hiện chỉ nhận PDF; không còn kết quả mẫu).
- `extraction.fields`: 9 chỉ tiêu `CA` (100) · `TA` (270) · `CL` (310) · `TL` (300) · `EQ` (400) · `RE` (421) · `Revenue` (10) · `PBT` (50) · `Interest` (23); `value = null` nếu không tìm thấy.
- `deletedAt`: thời điểm kết thúc xử lý phía giao diện. Trình duyệt bỏ tham chiếu tệp sau khi xử lý; trường này **không chứng minh** dữ liệu đã bị xoá khỏi bộ nhớ, log, cache hoặc hạ tầng của nhà cung cấp. Không gọi đây là cam kết Zero-Retention toàn hệ thống.

### Cổng 2 – từ PDF đến Z'

| Chỉ tiêu Z' | Công thức (mã số B01-DN / B02-DN) |
|---|---|
| X1 | (Tài sản ngắn hạn 100 − Nợ ngắn hạn 310) / Tổng tài sản 270 |
| X2 | LNST chưa phân phối 421 / Tổng tài sản 270 |
| X3 | (Tổng LN kế toán trước thuế 50 + Chi phí lãi vay 23) / Tổng tài sản 270 |
| X4 | Vốn chủ sở hữu **sổ sách** 400 / Nợ phải trả 300 (DN chưa niêm yết không có vốn hoá) |
| X5 | Doanh thu thuần 10 / Tổng tài sản 270 |

`Z' = 0,717X1 + 0,847X2 + 3,107X3 + 0,420X4 + 0,998X5`; vùng theo ngưỡng Z'; RFin,Base theo vùng (Safe 0,10 · Distress 0,70 · Grey chưa quy định → "—"). POSINT, ESG của DN tải lên: "TODO" (chưa tự động). Code: `src/lib/ocr/` (`extract-pdf.ts`, `parse-financials.ts`, `zprime.ts`).

### `esg_indicators.json` (chỉ tiêu ESG công bố, năm dữ liệu mới nhất)
```json
{ "year": 2024, "source": "data/QuantumRegTech_Input_Data_final.xlsx – sheet GOC_ESG năm 2024",
  "indicators": [{ "code": "E_09", "pillar": "E", "name": "Tỷ lệ năng lượng tái tạo (%)", "type": "number",
                   "polarity": 1, "use": true, "sizeDependent": false }],
  "values": { "VNM": { "E_09": 33.03 }, "IDP": { "E_09": null } } }
```
`null` = chưa công bố. `sizeDependent` (E_01, E_06, E_08, S_01, S_09 – số tuyệt đối): workbook vẫn xếp hạng trực tiếp khi tính điểm, UI không xếp hạng các chỉ tiêu này giữa các DN.

### `methodology.json`
`{ dataYear, forecastYear, riskFree, equityRiskPremium, capm, altman, altmanZones, posintTiers, penaltyTable, dataSource, … }`.

## 6. Còn thiếu & cần nhóm quyết định

- **Tối ưu danh mục:** API `/api/v1/portfolio/optimize` dùng `data/market_prices_monthly.csv` để ước lượng covariance trên cửa sổ 36 tháng và chạy Markowitz + ESG bằng SLSQP, giới hạn 2%–40%. Đây chưa phải QUBO/QAOA; kết quả lịch sử được lưu trong báo cáo đánh giá riêng.
- **Kịch bản Baseline / ESG-aware** và **mẫu Cổng 2 (TH)** của workbook cũ không còn nguồn → đã bỏ khỏi UI.
- **Điểm tẩy xanh, Minh bạch, Tuân thủ**: workbook mới không có → `TODO`.
- Danh sách số liệu cần nhóm tài chính kiểm lại: xem báo cáo rà soát workbook trong lịch sử trao đổi / `docs/DEMO_STATUS.md`.
