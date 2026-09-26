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

Vùng Altman (Z gốc): **Safe > 2.99**, **Grey 1.81–2.99**, **Distress < 1.81**.

### Typography
- UI: **Be Vietnam Pro** – 14px body, 12px caption, 20/24/30px heading.
- Số liệu: **JetBrains Mono** (tabular-nums) cho bảng, KPI, tỷ trọng.
- Định dạng số kiểu Việt: `9,95%`, `50,9 tỷ`, `Z = 6,18`.

### Khoảng cách & bo góc
- Lưới 8px; padding card 24px; gap giữa card 16–24px.
- Bo góc: card `12px`, button/input `8px`, badge `9999px`.
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

## 4. Đặc tả màn hình

### 4.1 Dashboard – `/`
**Mục tiêu:** trong 5 giây, người xem biết doanh nghiệp nào an toàn, doanh nghiệp nào cần chú ý.

| Khu vực | Component | Dữ liệu |
|---|---|---|
| Hàng KPI | 4 stat card: Số DN giám sát · Cảnh báo OSINT · DN vùng Distress · Lợi nhuận thực tế danh mục ESG-aware | `companies`, `osint_events`, `portfolio` |
| Lưới DN | 4 `CompanyCard`: mã, tên, badge vùng Altman, Z, ESGi, RFin,Total, số sự kiện OSINT | `companies` + `zscore` + `esg` |
| Heatmap rủi ro | ECharts heatmap: hàng = DN, cột = Tẩy xanh · Tài chính · Pháp lý · ESG | tổng hợp |
| Hoạt động gần đây | List sự kiện OSINT mới nhất | `osint_events` |

### 4.2 Cổng 1 – Tra cứu công khai – `/company/[ticker]`
| Khu vực | Component | Ghi chú |
|---|---|---|
| Header DN | Tên, mã, sàn, ngành, badge "Cổng 1 · Công khai" | |
| Z-Score | `ZScoreGauge` (ECharts gauge, 3 dải màu) + bảng X1–X5 | Tooltip công thức Z |
| ESG | `EsgRadar` (E, S, G, Minh bạch, Tuân thủ) + điểm ESGi | |
| **Bằng chứng Tẩy xanh** | `GreenwashingEvidence`: 2 cột "Doanh nghiệp tuyên bố" ↔ "Dữ liệu ngoại cảnh", mỗi cặp có mức mâu thuẫn + nguồn | Điểm "khoe AI" chính |
| OSINT | `OsintTimeline` 36 tháng, chấm màu theo mức 1/2/3, điểm phạt POSINT | |
| Tổng hợp rủi ro | Công thức trực quan: `RFin,Base + POSINT = RFin,Total` | |
| CTA | "Thêm vào danh mục" · "Xuất báo cáo thẩm định" | |

### 4.3 Cổng 2 – Nạp dữ liệu bảo mật – `/private`
Luồng 4 bước (stepper):
1. **Tải lên** – dropzone (PDF/XLSX), checkbox cam kết bảo mật.
2. **Xử lý** – progress giả lập: `OCR trích xuất → Chuẩn hoá chỉ tiêu → Tính Z'-Score → Quét OSINT` (mỗi bước 0,8–1,2s).
3. **Kết quả** – tái dùng component của Cổng 1 (Gauge, Radar, Timeline) cho DN chưa niêm yết mẫu.
4. **Xoá dữ liệu** – banner `🔒 Zero-Retention: tệp gốc đã được xoá lúc HH:mm:ss` + nút tải báo cáo.

> Màn này **chưa có trong mockup Vòng 1** – ưu tiên làm để trả lời câu hỏi về bảo mật.

### 4.4 Tối ưu danh mục – `/portfolio`
| Khu vực | Component |
|---|---|
| Tham số | 4 `Slider` α (lợi nhuận), β (rủi ro biến động), γ (ESG), δ (phạt rủi ro) + chọn solver: `Cổ điển (COBYLA)` / `Lượng tử (QAOA) – sắp có` (disabled) |
| Ràng buộc | Chip: `15% ≤ wᵢ ≤ 55%`, `Σwᵢ = 100%`, `Vốn: 100 tỷ VNĐ` |
| Kết quả | `AllocationDonut` + `WeightTable` (Ri, RFin,Total, ESGi, wᵢ*, số tiền) |
| So sánh | `CompareTable` Baseline vs ESG-aware: tỷ trọng, lợi nhuận kỳ vọng, lợi nhuận thực tế; `BacktestChart` bar |
| Tab "Lõi Lượng tử" | `QuboHeatmap` ma trận Q, thẻ thông số: số qubit, bit rời rạc/tài sản, độ sâu mạch dự kiến – nhãn "Mô phỏng / Vòng 2" |

Khi kéo slider: dùng kịch bản tính sẵn gần nhất trong `scenarios.json` (hoặc gọi FastAPI nếu có); hiển thị skeleton 600ms.

### 4.5 Báo cáo thẩm định – `/report/[ticker]`
- Khổ A4 dọc, lề 20mm, ẩn sidebar/header khi in (`@media print`).
- Mục: Thông tin DN → Kết luận tổng (1 đoạn + badge) → Z-Score → ESG & Tẩy xanh → OSINT → Khuyến nghị tỷ trọng → Phương pháp & nguồn dữ liệu → Tuyên bố miễn trừ.
- Nút "In / Lưu PDF" gọi `window.print()`.

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
/portfolio ──► kéo γ, δ ↑ → VNM tăng, SBT về sàn 15% → so sánh Baseline (11,86%) vs ESG-aware (15,96%)
   │
   ▼
Cổng 2: /private ──► upload hồ sơ DN tư nhân → kết quả → Zero-Retention
   │
   ▼
/report/VNM ──► In PDF
```

## 6. Component inventory

| Component | Nguồn | Trạng thái cần có |
|---|---|---|
| `CompanyCard` | shadcn Card + Badge | default, hover, alert |
| `ZScoreGauge` | ECharts gauge | Safe / Grey / Distress |
| `EsgRadar` | Recharts RadarChart | 1 DN / so sánh 2 DN |
| `RiskHeatmap` | ECharts heatmap | |
| `GreenwashingEvidence` | Card + Table | có / không có mâu thuẫn |
| `OsintTimeline` | custom + Tooltip | rỗng / có sự kiện |
| `WeightSliders` | shadcn Slider | |
| `AllocationDonut` | Recharts PieChart | |
| `CompareTable` | shadcn Table | |
| `QuboHeatmap` | ECharts heatmap | |
| `UploadStepper` | Card + Progress | idle / processing / done / deleted |

## 7. Quy trình Figma → Code

1. **Figma:** mỗi màn hình là 1 frame đặt tên theo route (`/company/[ticker]`), dùng Auto Layout, đặt tên layer có nghĩa (`ZScoreGauge`, không phải `Frame 123`).
2. **Variables:** khai báo màu/spacing trong Figma Variables trùng tên token ở mục 2 → Claude đọc được và map sang Tailwind.
3. **Annotation:** ghi chú trên frame: nguồn dữ liệu (`esg.json → evidence[]`), hành vi tương tác, trạng thái rỗng/lỗi – đây cũng là phần "user journey & data flow annotations" hồ sơ đang thiếu.
4. **Code:** trong Claude Code, dán link frame và yêu cầu dựng component (xem `FIGMA_CLAUDE_CODE.md`).
5. **So khớp:** chụp màn hình bản code, đặt cạnh frame Figma, sửa sai lệch.

## 8. Checklist chất lượng UI

- [ ] Mọi số liệu khớp `MOCK_DATA.md` (người tài chính duyệt)
- [ ] Màu rủi ro luôn đi kèm nhãn chữ
- [ ] Có loading / empty / error cho từng trang
- [ ] Responsive ≥ 1280px hoàn hảo; 768px dùng được
- [ ] Dark mode không vỡ biểu đồ
- [ ] Badge "Dữ liệu mẫu – PoC" luôn hiển thị
- [ ] Báo cáo in ra PDF gọn trong khổ A4
