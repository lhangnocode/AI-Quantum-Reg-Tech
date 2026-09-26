# QuantumRegTech – MVP Prototype

> Nền tảng RegTech ứng dụng AI & Điện toán Lượng tử trong Đánh giá Tín nhiệm ESG và Tối ưu Danh mục Đầu tư ngành F&B Việt Nam.
> Đội thi: **QuantumRegTech (AQ2026-205)** – AI-Quantum Challenge 2026.

## Mục tiêu của MVP

Hoàn thiện **giao diện sản phẩm** chạy trên **dữ liệu mẫu** trong file Excel `data/QuantumRegTech_Data.xlsx` (Phụ lục B hồ sơ Vòng 1 + BCTC/giá từ file nhập liệu của nhóm tài chính), để demo trọn luồng người dùng:

`Tra cứu doanh nghiệp → Xem rủi ro Tẩy xanh / Z-Score / OSINT → Tối ưu danh mục → Xuất báo cáo thẩm định`

### Trong phạm vi (In scope)
- UI đầy đủ 5 màn hình (Dashboard, Cổng 1, Cổng 2, Portfolio, Report)
- Dữ liệu mẫu trong file Excel, chuyển sang JSON theo đúng schema API tương lai
- Deploy link demo công khai (Vercel)

### Ngoài phạm vi (tạm thời bỏ qua)
- Chạy Lõi Lượng tử thật (QAOA/VQE trên IBM Qiskit)
- OCR thật cho Cổng 2 (giả lập bằng progress bar + kết quả mẫu)
- Crawler OSINT / NLP thật (dữ liệu sự kiện nhập tay vào JSON)

## Bộ tài liệu

| File | Nội dung |
|---|---|
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | Công nghệ sử dụng, cấu trúc thư mục, lệnh khởi tạo, lộ trình nâng cấp Vòng 2 |
| [`docs/UI_DESIGN.md`](docs/UI_DESIGN.md) | Design system, đặc tả từng màn hình, user journey, quy trình Figma → code (kết nối Figma MCP) |
| [`docs/DATA.md`](docs/DATA.md) | File Excel dữ liệu, luồng Excel → JSON, schema (= hợp đồng API), số liệu chuẩn, việc cần xác nhận |
| [`CLAUDE.md`](CLAUDE.md) | Ngữ cảnh & quy tắc cho Claude Code khi làm việc trong repo |

## Trạng thái hiện tại

| Màn hình | Route | Trạng thái |
|---|---|---|
| Dashboard | `/` | ✅ (chưa có lưới CompanyCard, heatmap rủi ro) |
| Cổng 1 – Tra cứu công khai | `/company/[ticker]` | ✅ |
| Cổng 2 – Nạp dữ liệu bảo mật | `/private` | ✅ (kết quả mẫu chờ số liệu) |
| Tối ưu danh mục + Lõi Lượng tử | `/portfolio` | ✅ |
| Báo cáo thẩm định (in PDF) | `/report/[ticker]` | ✅ |

Số liệu còn thiếu (hiển thị "—") và các điểm cần nhóm tài chính quyết định: [`docs/DATA.md` mục 6](docs/DATA.md).

## Dữ liệu

Nguồn dữ liệu duy nhất: **`data/QuantumRegTech_Data.xlsx`**. Sửa số liệu trong file này → lưu → `npm run data && npm test`. Các file `src/data/*.json` được sinh tự động (trước `dev` / `build` / `test`) và không commit. Chi tiết: [`docs/DATA.md`](docs/DATA.md).

## Chạy dự án

Yêu cầu: Node.js 22.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # kiểm tra build trước khi deploy
npm run lint
npm run data       # Excel → src/data/*.json (tự chạy trước dev/build/test)
npm test           # unit test (Vitest)
npx playwright install chromium   # một lần, trước khi chạy e2e
npm run test:e2e   # e2e (Playwright) – tự build và chạy server
```

Biến môi trường (tuỳ chọn – mặc định dùng dữ liệu từ file Excel, không cần khai báo):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `true` | `false` → gọi backend thật |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Địa chỉ FastAPI (Vòng 2) |

Deploy: nối repo GitHub với Vercel (Framework preset: Next.js, giữ cấu hình mặc định). Push lên `main` → production; branch/PR → preview.

## Nhóm

| Thành viên | Vai trò MVP |
|---|---|
| Trịnh Minh Tâm (Trưởng nhóm) | Nội dung tài chính, kịch bản demo, rà soát số liệu |
| Nguyễn Thu Uyên | Dữ liệu ESG/OSINT, text giải thích trong UI |
| Đặng Đình Khang | Dev A – Dashboard + Cổng 1 |
| Trần Hữu Huy Hoàng | Dev B – Portfolio + tab QUBO |
| Nguyễn Đình Văn | Dev C – Cổng 2 + Report + deploy |

> Phân công dev là gợi ý – nhóm điều chỉnh theo thế mạnh từng người.
