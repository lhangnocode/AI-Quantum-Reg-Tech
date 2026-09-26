# Mock Data & API Contract – QuantumRegTech MVP

> Schema trong file này **chính là hợp đồng API** cho Vòng 2. Khi có backend thật, endpoint trả về đúng cấu trúc này → UI không phải sửa.
> Nguồn số liệu: **Phụ lục B – Hồ sơ Vòng 1**. Ô ghi `TODO` cần nhóm tài chính điền từ file Excel.

## 1. Tham số chung

| Tham số | Giá trị | Nguồn |
|---|---|---|
| Rf (lãi suất phi rủi ro) | 2,77% | TPCP 10 năm – VIS Rating |
| ERP (phần bù rủi ro) | 8,35% | Damodaran – NYU Stern 2025 |
| CAPM | `Ri = Rf + βi × ERP` | |
| Altman Z | `1,2X1 + 1,4X2 + 3,3X3 + 0,6X4 + 1,0X5` | Safe > 2,99 · Grey 1,81–2,99 · Distress < 1,81 |
| Ràng buộc tỷ trọng | `0,15 ≤ wi ≤ 0,55`, `Σwi = 1` | |
| Vốn mô phỏng | 100 tỷ VNĐ | |
| Bậc phạt POSINT | Mức 1 = +0,05 · Mức 2 = +0,10 · Mức 3 ≥ +0,20 | |

## 2. Số liệu 4 doanh nghiệp

| Mã | Ri | β (suy từ CAPM) | Z | Vùng | RFin,Base | POSINT | RFin,Total | ESGi | w* ESG-aware | w Baseline | Lợi nhuận thực tế |
|---|---|---|---|---|---|---|---|---|---|---|---|
| VNM | 7,70% | 0,590 | 6,18 | Safe | 0,10 | 0,00 | 0,10 | 0,5759 | 50,9% | 15,0% | +5,14% |
| SAB | 9,95% | 0,860 | 6,51 | Safe | 0,10 | 0,00 | 0,10 | 0,5117 | 19,1% | 55,0% | −6,30% |
| MCM | 8,78% | 0,720 | 6,90 | Safe | 0,10 | 0,10 | 0,20 | 0,2519 | 15,0% | 15,0% | −17,89% |
| SBT | 9,12% | 0,761 | 1,80 | Distress | 0,70 | 0,00 | 0,70 | 0,5842 | 15,0% | 15,0% | +114,9% |

**Kết quả danh mục (đã kiểm tra lại bằng tính toán):**

| | Baseline (Markowitz) | ESG-aware (RegTech AI-Quantum) |
|---|---|---|
| Lợi nhuận kỳ vọng | 9,31% | 8,50% |
| Lợi nhuận thực tế | 11,86% | 15,96% |
| Chênh lệch thực tế | | **+4,11 điểm % so với Baseline** |

### ⚠️ Cần thống nhất trước khi đưa lên UI
- **SAB:** Phụ lục B ghi "Lợi nhuận bù trừ điểm phạt Thuế", nhưng POSINT = 0 và "Không ghi nhận vi phạm". → Bỏ cụm "điểm phạt Thuế", hoặc thêm sự kiện và cập nhật POSINT.
- **SBT:** ghi "Bị phạt nặng do Z=1.80 & UBCKNN", nhưng POSINT = 0. → Sửa thành "Bị siết do Z = 1,80 (Distress) → RFin,Base = 0,70".
- **Diễn giải backtest:** SBT ở mức 15% trong **cả hai** mô hình, nên phần vượt trội đến từ việc chuyển vốn SAB → VNM. Đổi "vượt trội so với thị trường chung" thành "so với Baseline".
- **X1–X5 và điểm E/S/G con:** chưa có trong hồ sơ → cần lấy từ Excel.

## 3. Cấu trúc file & schema

```
src/data/
├── companies.json
├── zscore.json
├── esg.json
├── osint_events.json
├── portfolio.json
├── scenarios.json      (kịch bản cho slider – đã tạo, 2 kịch bản)
├── private_sample.json (DN chưa niêm yết mẫu cho Cổng 2 – đã tạo, toàn TODO)
└── methodology.json    (tham số chung mục 1 – đã tạo)
```

> Tất cả file trên **đã có trong repo**. Quy ước: ô chưa có số liệu ghi đúng chuỗi `"TODO"` (UI hiển thị "—"); không điền số ước lượng. Kiểu TypeScript: `Todo<T> = T | "TODO"` trong `src/lib/types.ts`.
> Sau khi sửa số liệu, chạy `npm test` – unit test kiểm tra Σwᵢ = 1, ràng buộc 15–55%, RFin,Total và lợi nhuận danh mục khớp bảng mục 2.

### `companies.json`
```json
[
  {
    "ticker": "VNM",
    "name": "CTCP Sữa Việt Nam",
    "exchange": "HOSE",
    "subsector": "Sữa",
    "listed": true,
    "beta": 0.590,
    "expectedReturn": 0.0770,
    "realizedReturn": 0.0514
  }
]
```

Giá trị trong repo: SAB = "Tổng CTCP Bia - Rượu - Nước giải khát Sài Gòn" (Đồ uống), MCM = "CTCP Giống bò sữa Mộc Châu" (Sữa), SBT = "CTCP Thành Thành Công - Biên Hòa" (Đường). `exchange` của **MCM đang là `"TODO"`** – cần xác nhận sàn niêm yết.

### `zscore.json`
```json
{
  "VNM": {
    "model": "Z",
    "x1": "TODO", "x2": "TODO", "x3": "TODO", "x4": "TODO", "x5": "TODO",
    "z": 6.18,
    "zone": "safe",
    "rfinBase": 0.10,
    "fiscalYear": 2024
  }
}
```
`zone`: `"safe" | "grey" | "distress"`; `model`: `"Z" | "Z'"` (Z' dùng cho DN chưa niêm yết ở Cổng 2).

### `esg.json`
```json
{
  "MCM": {
    "esgScore": 0.2519,
    "pillars": { "E": "TODO", "S": "TODO", "G": "TODO", "transparency": "TODO", "compliance": "TODO" },
    "greenwashingRisk": "high",
    "evidence": [
      {
        "claim": "Trích dẫn cam kết môi trường từ Báo cáo bền vững 2024 (TODO)",
        "claimSource": "Báo cáo bền vững MCM 2024, tr. TODO",
        "counter": "Nguy cơ ô nhiễm môi trường từ hoạt động chăn nuôi bò sữa",
        "counterSource": "Tạp chí Môi trường và Xây dựng (2022)",
        "counterUrl": "https://moitruongxaydungvn.vn/nguy-co-o-nhiem-moi-truong-tu-cong-ty-co-phan-giong-bo-sua-moc-chau",
        "contradiction": 0.78,
        "taxonomyRef": "Vietnam Green Taxonomy – TODO mục"
      }
    ]
  }
}
```
`greenwashingRisk`: `"low" | "medium" | "high"` (hoặc `"TODO"` – hiện VNM, SAB, SBT chưa có; chỉ MCM = `"high"`); `evidence` có thể là mảng rỗng (UI hiện "Chưa có cặp bằng chứng đối chiếu"); `contradiction`: 0–1 (điểm mâu thuẫn do NLP trả về – mock).

### `osint_events.json`
```json
[
  {
    "id": "evt-mcm-2022-01",
    "ticker": "MCM",
    "date": "2022-TODO",
    "type": "environment",
    "severity": 2,
    "penalty": 0.10,
    "title": "Phạt xả thải môi trường",
    "source": "Tạp chí Môi trường và Xây dựng",
    "url": "https://moitruongxaydungvn.vn/nguy-co-o-nhiem-moi-truong-tu-cong-ty-co-phan-giong-bo-sua-moc-chau",
    "active": true
  }
]
```
`type`: `"tax" | "environment" | "securities" | "media"`; `severity`: 1 | 2 | 3.
`date`: `"YYYY-MM"`; nếu nguồn chưa rõ tháng ghi `"YYYY-TODO"` → UI đặt chấm vào cột "Chưa rõ" của timeline và hiện "2022 (chưa rõ tháng)". POSINT của DN = tổng `penalty` các sự kiện `active: true`.

### `portfolio.json`
```json
{
  "capital": 100000000000,
  "constraints": { "minWeight": 0.15, "maxWeight": 0.55 },
  "params": { "alpha": "TODO", "beta": "TODO", "gamma": "TODO", "delta": "TODO" },
  "solver": "classical-cobyla",
  "esgAware": {
    "weights": { "VNM": 0.509, "SAB": 0.191, "MCM": 0.15, "SBT": 0.15 },
    "expectedReturn": 0.0850,
    "realizedReturn": 0.1596
  },
  "baseline": {
    "weights": { "VNM": 0.15, "SAB": 0.55, "MCM": 0.15, "SBT": 0.15 },
    "expectedReturn": 0.0931,
    "realizedReturn": 0.1186
  },
  "qubo": {
    "bitsPerAsset": 4,
    "numQubits": 16,
    "matrix": "TODO – 16×16, xuất từ code Python"
  }
}
```
> `params` hiện chưa có giá trị trong hồ sơ ("Risk = 0.7" là tham số duy nhất được nhắc tới) → nhóm IT lấy từ code.

### `scenarios.json` (tuỳ chọn – cho slider khi chưa có backend)
```json
[
  { "params": { "alpha": 1, "beta": 1, "gamma": 0, "delta": 0 }, "weights": { "VNM": 0.15, "SAB": 0.55, "MCM": 0.15, "SBT": 0.15 } },
  { "params": { "alpha": 1, "beta": 1, "gamma": 1, "delta": 1 }, "weights": { "VNM": 0.509, "SAB": 0.191, "MCM": 0.15, "SBT": 0.15 } }
]
```
Chạy code Python với ~10–20 bộ tham số để sinh file này; UI chọn bộ gần nhất với vị trí slider (khoảng cách Euclid trên α β γ δ). Lợi nhuận kỳ vọng / thực tế của mỗi kịch bản được UI tính lại bằng Σ wᵢ × Rᵢ từ `companies.json`, nên file chỉ cần `params` + `weights`.

### `private_sample.json` (Cổng 2 – kết quả mẫu DN chưa niêm yết)
```json
{
  "company": { "name": "Doanh nghiệp F&B chưa niêm yết (mẫu)", "subsector": "TODO", "listed": false, "fiscalYear": "TODO" },
  "zscore": { "model": "Z'", "x1": "TODO", "x2": "TODO", "x3": "TODO", "x4": "TODO", "x5": "TODO", "z": "TODO", "zone": "TODO", "rfinBase": "TODO" },
  "esg": { "esgScore": "TODO", "pillars": { "E": "TODO", "S": "TODO", "G": "TODO", "transparency": "TODO", "compliance": "TODO" }, "greenwashingRisk": "TODO", "evidence": [] },
  "events": [],
  "posint": "TODO"
}
```
API trả thêm `"deletedAt": "<ISO timestamp>"` (thời điểm xoá tệp gốc) – bản mock tự gán khi xử lý xong. Mô hình **Z'** = `0,717X1 + 0,847X2 + 3,107X3 + 0,420X4 + 0,998X5`; vùng Safe > 2,90 · Grey 1,23–2,90 · Distress < 1,23 (Altman 1983 – cần nhóm tài chính xác nhận).

### `methodology.json` (tham số chung – mục 1)
```json
{
  "riskFree": { "value": 0.0277, "source": "TPCP 10 năm – VIS Rating" },
  "equityRiskPremium": { "value": 0.0835, "source": "Damodaran – NYU Stern 2025" },
  "capm": "Ri = Rf + βi × ERP",
  "altman": "Z = 1,2X1 + 1,4X2 + 3,3X3 + 0,6X4 + 1,0X5",
  "altmanZones": "Safe > 2,99 · Grey 1,81–2,99 · Distress < 1,81",
  "posintTiers": "Mức 1 = +0,05 · Mức 2 = +0,10 · Mức 3 ≥ +0,20",
  "dataSource": "Phụ lục B – Hồ sơ Vòng 1"
}
```
Dùng cho mục "Phương pháp & nguồn dữ liệu" của báo cáo thẩm định.

## 4. Endpoint tương lai (Vòng 2)

| Method | Endpoint | Trả về |
|---|---|---|
| GET | `/api/v1/companies` | `companies.json` |
| GET | `/api/v1/companies/{ticker}/zscore` | 1 phần tử của `zscore.json` |
| GET | `/api/v1/companies/{ticker}/esg` | 1 phần tử của `esg.json` |
| GET | `/api/v1/companies/{ticker}/osint?months=36` | lọc `osint_events.json` |
| POST | `/api/v1/portfolio/optimize` body `{ tickers, params, constraints, solver }` | `portfolio.json` |
| POST | `/api/v1/private/analyze` (multipart, field `file`) | dạng `private_sample.json` + `{ deletedAt }` |
| GET | `/api/v1/methodology` | `methodology.json` |
| GET | `/api/v1/reports/{ticker}` | dữ liệu báo cáo |

## 5. Danh sách ô `TODO` cần nhóm tài chính điền

| File | Trường | Ảnh hưởng trên UI |
|---|---|---|
| `zscore.json` | `x1`–`x5` của cả 4 DN | Bảng X1–X5 (Cổng 1, báo cáo) hiện "—" |
| `esg.json` | `pillars` (E, S, G, Minh bạch, Tuân thủ) của cả 4 DN | Radar ESG hiện trạng thái rỗng |
| `esg.json` | `greenwashingRisk` của VNM, SAB, SBT | Badge "Rủi ro tẩy xanh: —" |
| `esg.json` | MCM `evidence[].claim`, `claimSource`, `taxonomyRef` | Cột "Doanh nghiệp tuyên bố" còn chữ TODO |
| `osint_events.json` | Tháng của sự kiện MCM (`2022-TODO`) | Timeline đặt ở cột "Chưa rõ" |
| `companies.json` | `exchange` của MCM | "Sàn —" |
| `portfolio.json` | `params` α β γ δ, `qubo.matrix` 16×16 | Heatmap QUBO rỗng |
| `scenarios.json` | Thêm 10–20 kịch bản từ code Python | Slider chỉ nhảy giữa 2 kịch bản |
| `private_sample.json` | Toàn bộ | Kết quả Cổng 2 hiện "—" |
