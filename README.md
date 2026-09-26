# QuantumRegTech – MVP Prototype

> Nền tảng RegTech ứng dụng AI & Điện toán Lượng tử trong Đánh giá Tín nhiệm ESG và Tối ưu Danh mục Đầu tư ngành F&B Việt Nam.
> Đội thi: **QuantumRegTech (AQ2026-205)** – AI-Quantum Challenge 2026.

## Mục tiêu của MVP

Hoàn thiện **giao diện sản phẩm** chạy trên **dữ liệu mock** (lấy từ Phụ lục B của hồ sơ Vòng 1), để demo trọn luồng người dùng:

`Tra cứu doanh nghiệp → Xem rủi ro Tẩy xanh / Z-Score / OSINT → Tối ưu danh mục → Xuất báo cáo thẩm định`

### Trong phạm vi (In scope)
- UI đầy đủ 5 màn hình (Dashboard, Cổng 1, Cổng 2, Portfolio, Report)
- Mock data theo đúng schema API tương lai
- Deploy link demo công khai (Vercel)

### Ngoài phạm vi (tạm thời bỏ qua)
- Chạy Lõi Lượng tử thật (QAOA/VQE trên IBM Qiskit)
- OCR thật cho Cổng 2 (giả lập bằng progress bar + kết quả mẫu)
- Crawler OSINT / NLP thật (dữ liệu sự kiện nhập tay vào JSON)

## Bộ tài liệu

| File | Nội dung |
|---|---|
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | Công nghệ sử dụng, cấu trúc thư mục, lệnh khởi tạo, lộ trình nâng cấp Vòng 2 |
| [`docs/UI_DESIGN.md`](docs/UI_DESIGN.md) | Design system, đặc tả từng màn hình, user journey, quy trình Figma → code |
| [`docs/MOCK_DATA.md`](docs/MOCK_DATA.md) | Schema dữ liệu (= hợp đồng API), số liệu 4 doanh nghiệp, endpoint tương lai |
| [`docs/FIGMA_CLAUDE_CODE.md`](docs/FIGMA_CLAUDE_CODE.md) | Kết nối Figma MCP với Claude Code, câu lệnh mẫu, xử lý lỗi |
| [`CLAUDE.md`](CLAUDE.md) | Ngữ cảnh & quy tắc cho Claude Code khi làm việc trong repo |

## Chạy dự án (sau khi khởi tạo)

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # kiểm tra build trước khi deploy
```

## Nhóm

| Thành viên | Vai trò MVP |
|---|---|
| Trịnh Minh Tâm (Trưởng nhóm) | Nội dung tài chính, kịch bản demo, rà soát số liệu |
| Nguyễn Thu Uyên | Dữ liệu ESG/OSINT, text giải thích trong UI |
| Đặng Đình Khang | Dev A – Dashboard + Cổng 1 |
| Trần Hữu Huy Hoàng | Dev B – Portfolio + tab QUBO |
| Nguyễn Đình Văn | Dev C – Cổng 2 + Report + deploy |

> Phân công dev là gợi ý – nhóm điều chỉnh theo thế mạnh từng người.
