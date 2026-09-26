# UI Design – QuantumRegTech MVP

## 1. Định hướng thiết kế

- **Cảm giác:** công cụ thẩm định chuyên nghiệp cho ngân hàng/quỹ – nghiêm túc, đáng tin, nhiều dữ liệu nhưng dễ đọc.
- **Tham chiếu phong cách:** Bloomberg Terminal (mật độ dữ liệu) + Linear/Vercel dashboard (gọn, thoáng).
- **Ngôn ngữ UI:** tiếng Việt; thuật ngữ chuyên môn giữ tiếng Anh trong ngoặc khi cần (vd. "Tẩy xanh (Greenwashing)").
- **Nguyên tắc:** mỗi con số rủi ro đều có **màu + nhãn chữ + tooltip giải thích** – không để màu tự mang nghĩa.

## 2. Design tokens

### Màu sắc

| Token | Light | Dark | Dùng cho |
|---|---|---|---|
| `--primary` | `#0F766E` (teal 700) | `#14B8A6` | Nút chính, link, điểm nhấn thương hiệu "xanh bền vững" |
| `--quantum` | `#6D28D9` (violet 700) | `#A78BFA` | Mọi thứ liên quan Lõi Lượng tử / QUBO |
| `--background` | `#F8FAFC` | `#0B1120` | Nền trang |
| `--card` | `#FFFFFF` | `#111827` | Nền card |
| `--muted-foreground` | `#64748B` | `#94A3B8` | Chú thích, label phụ |
| `--risk-safe` | `#16A34A` | `#22C55E` | Altman Safe Zone, không vi phạm |
| `--risk-grey` | `#D97706` | `#F59E0B` | Altman Grey Zone, cảnh báo mức 1 |
| `--risk-distress` | `#DC2626` | `#EF4444` | Distress Zone, vi phạm mức 2–3 |

Token được khai báo trong `src/app/globals.css` (`:root` / `.dark`) và dùng qua class Tailwind: `bg-primary`, `text-quantum`, `bg-risk-safe/10`, `text-risk-distress`…

> `--quantum` **chỉ** dùng cho Lõi Lượng tử / QUBO (tab "Lõi Lượng tử"). Cổng 2 dùng `--primary`, không dùng màu quantum.

**Bảng màu phân loại cho biểu đồ** (mỗi DN một màu, thứ tự cố định VNM → SAB → MCM → SBT, không theo hạng). Đã kiểm tra bằng công cụ mô phỏng mù màu (CVD); cố ý tránh cam/đỏ để không trùng màu rủi ro.

| Token | Light | Dark | Dùng cho |
|---|---|---|---|
| `--chart-1` | `#2A78D6` | `#3987E5` | DN thứ 1 (VNM) |
| `--chart-2` | `#1BAF7A` | `#199E70` | DN thứ 2 (SAB) |
| `--chart-3` | `#4A3AA7` | `#9085E9` | DN thứ 3 (MCM) |
| `--chart-4` | `#E87BA4` | `#D55181` | DN thứ 4 (SBT) |
| `--chart-5` | `#64748B` | `#94A3B8` | Chuỗi trung tính (Baseline trong `BacktestChart`) |

`--chart-2` và `--chart-4` có tương phản < 3:1 trên nền trắng → luôn kèm legend/bảng số bên cạnh (đã làm trong `AllocationDonut`).

Vùng Altman (Z gốc, DN niêm yết): **Safe > 2,99**, **Grey 1,81–2,99**, **Distress < 1,81**.
Vùng Altman Z' (DN chưa niêm yết – Cổng 2, theo Altman 1983): **Safe > 2,90**, **Grey 1,23–2,90**, **Distress < 1,23** – *cần nhóm tài chính xác nhận*.

### Typography
- UI: **Be Vietnam Pro** – 14px body, 12px caption, 20/24/30px heading.
- Số liệu: **JetBrains Mono** (tabular-nums) cho bảng, KPI, tỷ trọng.
- Định dạng số kiểu Việt: `9,95%`, `50,9 tỷ`, `Z = 6,18`.

### Khoảng cách & bo góc
- Lưới 8px; padding card 24px; gap giữa card 16–24px.
- Bo góc: card `12px`, button/input `8px`, badge `9999px`.
- Card Dashboard theo Figma Make: bo `16px` (`rounded-2xl`), padding `20px` – dùng chung qua `DashboardCard`.
- Đổ bóng rất nhẹ (`shadow-sm`), ưu tiên viền `1px` màu `--border`.

## 3. Layout chung

```
┌──────────────┬──────────────────────────────────────────────┐
│  Logo        │  Header: breadcrumb · ô tìm mã CP · Cổng 1/2 │
│              ├──────────────────────────────────────────────┤
│  Sidebar     │                                              │
│  · Tổng quan │                 Nội dung trang               │
│  · Tra cứu   │                                              │
│  · Nạp DL BM │                                              │
│  · Danh mục  │                                              │
│  · Báo cáo   │                                              │
│              │                                              │
│  [Mock data] │                                              │
└──────────────┴──────────────────────────────────────────────┘
```
- Sidebar rộng 240px, thu gọn còn icon ở < 1024px, thành drawer ở mobile.
- Góc dưới sidebar luôn có badge **"Dữ liệu mẫu – PoC"** để minh bạch với BGK.
- Đã triển khai (`components/layout`): Sidebar 5 mục (Tổng quan `/`, Tra cứu `/company/VNM`, Nạp DL bảo mật `/private`, Danh mục `/portfolio`, Báo cáo `/report/VNM`), mục đang mở có nền `sidebar-accent` + chấm tròn. Header gồm tên trang + ngày, badge Cổng 2 (trang `/private`; Cổng 1 đặt trong header DN của trang), ô tìm mã CP. ⏳ Drawer mobile chưa làm.
- Khi in (`@media print`) sidebar và header bị ẩn.

## 4. Đặc tả màn hình

> Trạng thái: ✅ = đã làm · ⏳ = chưa làm. Chi tiết file xem mục 6.

### 4.1 Dashboard – `/` ✅
**Mục tiêu:** trong 5 giây, người xem biết doanh nghiệp nào an toàn, doanh nghiệp nào cần chú ý.

**Đã triển khai** theo layout Figma Make ("Design-QuantumRegTech-Dashboard"): hàng 4 KPI + lưới 2×2 gồm *Phân bổ danh mục ESG-aware* (donut + bảng w* / Baseline / Vốn), *Phân tích ESG* (thanh ESGi từng DN + badge tẩy xanh cao), *Sức khoẻ tài chính* (thanh Z có vạch ngưỡng 1,81 / 2,99 + badge vùng), *Giám sát tuân thủ AI-OSINT* (bảng trạng thái Tuân thủ / Cảnh báo / Vi phạm + khối tóm tắt tính từ dữ liệu). Mỗi dòng DN link tới `/company/[ticker]`.

Khác biệt so với bản Figma (do quy tắc trong `CLAUDE.md`):
- Bỏ số liệu Figma tự tạo (TH Group, 10,96%, 17,2%, 0,483, "giảm 23%") và ngưỡng Z sai (2,6 / 1,1).
- Nhãn "Q-Optimized" → "Cổ điển (COBYLA)"; ô "Quantum Engine" ở sidebar → badge "Dữ liệu mẫu – PoC".
- Radar ESG 6 trục → thanh ESGi từng DN (điểm trụ cột đang TODO).
- Bỏ chuông thông báo và avatar người dùng (chưa có dữ liệu).
- KPI "Lợi nhuận thực tế" không hiện chênh lệch vì tính lại từ số làm tròn ra +4,10 điểm %, trong khi MOCK_DATA ghi +4,11.

Các khu vực trong bảng dưới **chưa** có ở bản hiện tại: ⏳ Lưới `CompanyCard`, ⏳ Heatmap rủi ro, ⏳ Hoạt động gần đây (một phần đã có trong thẻ OSINT).

| Khu vực | Component | Dữ liệu |
|---|---|---|
| Hàng KPI | 4 stat card: Số DN giám sát · Cảnh báo OSINT · DN vùng Distress · Lợi nhuận thực tế danh mục ESG-aware | `companies`, `osint_events`, `portfolio` |
| Lưới DN | 4 `CompanyCard`: mã, tên, badge vùng Altman, Z, ESGi, RFin,Total, số sự kiện OSINT | `companies` + `zscore` + `esg` |
| Heatmap rủi ro | ECharts heatmap: hàng = DN, cột = Tẩy xanh · Tài chính · Pháp lý · ESG | tổng hợp |
| Hoạt động gần đây | List sự kiện OSINT mới nhất | `osint_events` |

### 4.2 Cổng 1 – Tra cứu công khai – `/company/[ticker]` ✅
| Khu vực | Component | Ghi chú |
|---|---|---|
| Header DN | Tên, mã, sàn, ngành, badge "Cổng 1 · Công khai" | |
| Z-Score | `ZScoreGauge` (ECharts gauge, 3 dải màu) + bảng X1–X5 | Tooltip công thức Z |
| ESG | `EsgRadar` (E, S, G, Minh bạch, Tuân thủ) + điểm ESGi | |
| **Bằng chứng Tẩy xanh** | `GreenwashingEvidence`: 2 cột "Doanh nghiệp tuyên bố" ↔ "Dữ liệu ngoại cảnh", mỗi cặp có mức mâu thuẫn + nguồn | Điểm "khoe AI" chính |
| OSINT | `OsintTimeline` 36 tháng, chấm màu theo mức 1/2/3, điểm phạt POSINT | |
| Tổng hợp rủi ro | Công thức trực quan: `RFin,Base + POSINT = RFin,Total` | |
| CTA | "Thêm vào danh mục" · "Xuất báo cáo thẩm định" | |

Ghi chú triển khai:
- Thanh chọn nhanh 4 mã ở đầu trang; ô tìm mã CP trên Header chuyển tới `/company/{MÃ}`; mã không tồn tại → trang 404 tiếng Việt.
- `EsgRadar` hiện trạng thái rỗng "Chưa có điểm trụ cột E / S / G" vì `pillars` đang TODO – không tự điền số.
- `OsintTimeline`: lưới 3 năm × 12 tháng (kết thúc ở năm tài chính) + cột "Chưa rõ" cho sự kiện có ngày dạng `2022-TODO`; hover chấm → tooltip loại, mức, POSINT, nguồn.
- "Thêm vào danh mục" lưu mã vào Zustand (`watchlist`), hiện toast; `/portfolio` hiển thị "Đang theo dõi từ Cổng 1".

### 4.3 Cổng 2 – Nạp dữ liệu bảo mật – `/private` ✅
Luồng 4 bước (stepper, component `UploadStepper`, trạng thái `idle → processing → done → deleted`):
1. **Tải lên** – dropzone kéo-thả / bấm chọn (PDF, XLSX, XLS; tối đa 20 MB; báo lỗi ngay khi sai định dạng / quá lớn / tệp rỗng) + checkbox cam kết bảo mật. Nút "Bắt đầu phân tích" chỉ bật khi có tệp **và** đã tick.
2. **Xử lý** – progress giả lập: `OCR trích xuất → Chuẩn hoá chỉ tiêu → Tính Z'-Score → Quét OSINT` (mỗi bước 0,8–1,2s), mỗi bước có trạng thái Chờ / Đang chạy / Hoàn tất. Nút **"Huỷ & xoá tệp"** dừng (AbortController) và quay về bước 1.
3. **Kết quả** – tái dùng component Cổng 1 (`ZScoreGauge` mô hình Z', `XTable`, `EsgRadar`, `OsintTimeline`, `RiskFormula`) cho DN chưa niêm yết mẫu. Ngay khi xử lý xong, tham chiếu tệp gốc bị bỏ khỏi state; chỉ giữ tên + dung lượng để ghi nhật ký. Nút "Xác nhận xoá dữ liệu gốc" → bước 4.
4. **Xoá dữ liệu** – banner `Zero-Retention: tệp gốc đã được xoá lúc HH:mm:ss` (giờ lấy từ `deletedAt` do API trả) + tên/dung lượng tệp; nút "Tải báo cáo (PDF)" (`window.print()`, ẩn stepper khi in) và "Phân tích hồ sơ khác".

Phía trên stepper có 3 thẻ nguyên tắc: *Xử lý trong phiên* (bản PoC: tệp không rời trình duyệt; Vòng 2: TLS tới API OCR), *Zero-Retention*, *Không chia sẻ* (kết quả không vào dữ liệu công khai Cổng 1). Badge "Cổng 2 · Bảo mật" nằm trên Header.

> ⚠️ `private_sample.json` hiện toàn `TODO` (MOCK_DATA chưa có số liệu DN tư nhân mẫu) → bước 3 hiện Alert "Kết quả mẫu chưa có số liệu" và các ô "—". Nhóm tài chính cần điền để demo có số.

> Màn này **chưa có trong mockup Vòng 1** – ưu tiên làm để trả lời câu hỏi về bảo mật.

### 4.4 Tối ưu danh mục – `/portfolio` ✅
| Khu vực | Component |
|---|---|
| Tham số | 4 `Slider` α (lợi nhuận), β (rủi ro biến động), γ (ESG), δ (phạt rủi ro) + chọn solver: `Cổ điển (COBYLA)` / `Lượng tử (QAOA) – sắp có` (disabled) |
| Ràng buộc | Chip: `15% ≤ wᵢ ≤ 55%`, `Σwᵢ = 100%`, `Vốn: 100 tỷ VNĐ` |
| Kết quả | `AllocationDonut` + `WeightTable` (Ri, RFin,Total, ESGi, wᵢ*, số tiền) |
| So sánh | `CompareTable` Baseline vs ESG-aware: tỷ trọng, lợi nhuận kỳ vọng, lợi nhuận thực tế; `BacktestChart` bar |
| Tab "Lõi Lượng tử" | `QuboHeatmap` ma trận Q, thẻ thông số: số qubit, bit rời rạc/tài sản, độ sâu mạch dự kiến – nhãn "Mô phỏng / Vòng 2" |

Khi kéo slider: dùng kịch bản tính sẵn gần nhất trong `scenarios.json` (khoảng cách Euclid trên α β γ δ – `nearestScenario()`; hoặc gọi FastAPI nếu có); hiển thị skeleton 600ms.

Ghi chú triển khai:
- Slider mặc định α = β = γ = δ = 1 (kịch bản ESG-aware). `scenarios.json` hiện có 2 kịch bản (γ = δ = 0 → Baseline; γ = δ = 1 → ESG-aware) – cần thêm kịch bản từ code Python để slider "mượt" hơn.
- 2 thẻ KPI "Lợi nhuận kỳ vọng" / "Lợi nhuận thực tế" tính Σ wᵢ × Rᵢ theo kịch bản đang chọn (khớp bảng kết quả MOCK_DATA – có unit test).
- Tab "Lõi Lượng tử": số qubit 16, bit/tài sản 4, độ sâu mạch "—"; `QuboHeatmap` hiện trạng thái rỗng vì `qubo.matrix` = TODO.

### 4.5 Báo cáo thẩm định – `/report/[ticker]` ✅
- Khổ A4 dọc, lề 20mm, ẩn sidebar/header khi in (`@media print`).
- Mục: Thông tin DN → Kết luận tổng (1 đoạn + badge) → Z-Score → ESG & Tẩy xanh → OSINT → Khuyến nghị tỷ trọng → Phương pháp & nguồn dữ liệu → Tuyên bố miễn trừ.
- Nút "In / Lưu PDF" gọi `window.print()`; thanh chuyển nhanh 4 mã ở trên (ẩn khi in). Bản in hiện tại gọn trong 2 trang A4.
- **Kết luận tổng** sinh tự động từ số liệu (`lib/assessment.ts`), quy tắc hiển thị *cần nhóm tài chính duyệt*:
  - **Rủi ro cao**: vùng Distress hoặc RFin,Total ≥ 0,5 (vd. SBT)
  - **Cần theo dõi**: có sự kiện OSINT đang hiệu lực hoặc rủi ro tẩy xanh cao (vd. MCM)
  - **Đạt**: các trường hợp còn lại (vd. VNM, SAB)
- Mục "Phương pháp & nguồn dữ liệu" đọc từ `methodology.json` qua `getMethodology()`.

## 5. User journey demo (≈ 3 phút)

```
Dashboard ──► thấy MCM có cảnh báo OSINT, SBT ở vùng Distress
   │
   ▼
Cổng 1: /company/MCM ──► Bằng chứng tẩy xanh + phạt xả thải 2022 (POSINT +0,10)
   │
   ▼
Cổng 1: /company/SBT ──► Z = 1,80 (Distress) → RFin,Total = 0,70
   │
   ▼
/portfolio ──► kéo γ, δ về 0 → kịch bản Baseline (SAB 55%) ; kéo γ, δ lên → ESG-aware (VNM 50,9%, SBT ở sàn 15%)
           → so sánh Baseline (11,86%) vs ESG-aware (15,96%) → mở tab "Lõi Lượng tử" (Mô phỏng / Vòng 2)
   │
   ▼
Cổng 2: /private ──► upload hồ sơ DN tư nhân → kết quả → Zero-Retention
   │
   ▼
/report/VNM ──► In PDF
```

## 6. Component inventory

| Component | Vị trí | Nguồn | Trạng thái cần có | Tiến độ |
|---|---|---|---|---|
| `CompanyCard` | – | shadcn Card + Badge | default, hover, alert | ⏳ |
| `ZScoreGauge` | `components/charts` | ECharts gauge | Safe / Grey / Distress; mô hình Z / Z'; không có số (không kim, "—") | ✅ |
| `EsgRadar` | `components/charts` | Recharts RadarChart | 1 DN ✅ / so sánh 2 DN ⏳; rỗng khi pillars TODO ✅ | ✅ |
| `RiskHeatmap` | – | ECharts heatmap | | ⏳ |
| `GreenwashingEvidence` | `components/company` | Card + Badge | có / không có mâu thuẫn | ✅ |
| `OsintTimeline` | `components/company` | custom + Tooltip | rỗng / có sự kiện / ngày chưa rõ tháng | ✅ |
| `RiskFormula` | `components/company` | custom | có số / "—" | ✅ |
| `XTable` | `components/company` | shadcn Table | X1–X5 (TODO → "—") | ✅ |
| `WeightSliders` | `components/portfolio` | shadcn Slider + Select | | ✅ |
| `WeightTable` | `components/portfolio` | shadcn Table | | ✅ |
| `AllocationDonut` | `components/charts` | Recharts PieChart + bảng legend | hover tooltip | ✅ |
| `CompareTable` | `components/portfolio` | shadcn Table | | ✅ |
| `BacktestChart` | `components/charts` | Recharts BarChart | | ✅ |
| `QuboHeatmap` | `components/charts` | ECharts heatmap | có ma trận / rỗng (TODO) | ✅ |
| `UploadStepper` | `components/private` | Card + Progress + Checkbox | idle / processing / done / deleted | ✅ |
| `StatCard`, `DashboardCard`, `ZoneBadge` | `components/dashboard` | shadcn Card + Badge | | ✅ |
| `GatewayBadge` | `components/layout` | shadcn Badge | Cổng 1 / Cổng 2 | ✅ |
| `EmptyChart`, `InfoTip`, `PageSkeleton` | `components/charts`, `components/common` | | | ✅ |

## 7. Quy trình Figma → Code

1. **Figma:** mỗi màn hình là 1 frame đặt tên theo route (`/company/[ticker]`), dùng Auto Layout, đặt tên layer có nghĩa (`ZScoreGauge`, không phải `Frame 123`).
2. **Variables:** khai báo màu/spacing trong Figma Variables trùng tên token ở mục 2 → Claude đọc được và map sang Tailwind.
3. **Annotation:** ghi chú trên frame: nguồn dữ liệu (`esg.json → evidence[]`), hành vi tương tác, trạng thái rỗng/lỗi – đây cũng là phần "user journey & data flow annotations" hồ sơ đang thiếu.
4. **Code:** trong Claude Code, dán link frame và yêu cầu dựng component (xem `FIGMA_CLAUDE_CODE.md`).
5. **So khớp:** chụp màn hình bản code, đặt cạnh frame Figma, sửa sai lệch.

## 8. Checklist chất lượng UI

- [ ] Mọi số liệu khớp `MOCK_DATA.md` (người tài chính duyệt) – *unit test đã đối chiếu RFin,Total, Σw, lợi nhuận danh mục; vẫn cần người duyệt*
- [x] Màu rủi ro luôn đi kèm nhãn chữ
- [x] Có loading / empty / error cho từng trang
- [ ] Responsive ≥ 1280px hoàn hảo; 768px dùng được – *đã kiểm tra 1440px và 820px; sidebar thu gọn icon < 1024px, chưa có drawer mobile*
- [ ] Dark mode không vỡ biểu đồ – *token dark đã có và biểu đồ đọc đúng token, nhưng chưa có nút chuyển theme*
- [x] Badge "Dữ liệu mẫu – PoC" luôn hiển thị
- [x] Báo cáo in ra PDF gọn trong khổ A4
- [x] Tính năng lượng tử luôn gắn nhãn "Mô phỏng / Vòng 2"
