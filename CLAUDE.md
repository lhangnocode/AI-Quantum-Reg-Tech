# CLAUDE.md – QuantumRegTech MVP

Ngữ cảnh cho Claude Code khi làm việc trong repo này.

## Dự án
Nền tảng RegTech (AI + Quantum) đánh giá tín nhiệm ESG và tối ưu danh mục cho 4 DN F&B niêm yết: **VNM, SAB, MCM, SBT**. Đội QuantumRegTech – AI-Quantum Challenge 2026.

**Giai đoạn hiện tại: MVP chỉ UI + mock data.** Không triển khai Qiskit, OCR, crawler, LLM thật.
Đã có đủ 5 màn hình (trạng thái chi tiết trong `docs/UI_DESIGN.md` §4 và §6).

**Next.js 16** – API khác tài liệu cũ (`params` là Promise, `error.tsx` nhận `retry`, `PageProps`/`LayoutProps` global). Đọc `AGENTS.md` và `node_modules/next/dist/docs/` trước khi dùng API lạ. shadcn/ui ở đây chạy trên **Base UI** (không phải Radix): Tooltip/Trigger dùng `render` prop thay cho `asChild`.

## Tài liệu bắt buộc đọc trước khi code
- `docs/TECH_STACK.md` – stack, cấu trúc thư mục, quy ước
- `docs/UI_DESIGN.md` – design tokens, đặc tả màn hình, component inventory
- `docs/MOCK_DATA.md` – schema dữ liệu (= hợp đồng API) và số liệu chuẩn
- `docs/FIGMA_CLAUDE_CODE.md` – cách đọc thiết kế Figma

## Lệnh
```bash
npm run dev     # localhost:3000
npm run build
npm run lint
npm test          # unit test (Vitest) – đối chiếu số liệu với MOCK_DATA.md
npm run test:e2e  # e2e (Playwright) – lần đầu chạy: npx playwright install chromium
```

## Quy tắc
1. Component **chỉ lấy dữ liệu qua `src/lib/api.ts`**, không import trực tiếp `src/data/*.json`.
2. Types trong `src/lib/types.ts` phải khớp schema ở `docs/MOCK_DATA.md`. Đổi schema → cập nhật cả hai.
3. **Không tự bịa số liệu tài chính.** Chỉ dùng số trong `docs/MOCK_DATA.md`; ô `TODO` để nguyên và hiển thị "—".
4. Màu chỉ dùng design token (`risk-safe`, `risk-grey`, `risk-distress`, `primary`, `quantum`, `chart-1..5`); không hard-code hex. `quantum` chỉ cho Lõi Lượng tử/QUBO. ECharts lấy màu qua `useCssVars()`.
5. Màu rủi ro luôn đi kèm nhãn chữ (vd. badge "Distress").
6. Định dạng số kiểu Việt qua `src/lib/format.ts` (`9,95%`, `50,9 tỷ`).
7. Mỗi trang có trạng thái loading (Skeleton), empty, error.
8. UI tiếng Việt; thuật ngữ chuyên môn có thể kèm tiếng Anh trong ngoặc.
9. Mọi tính năng lượng tử hiển thị nhãn "Mô phỏng / Vòng 2"; không tuyên bố đã chạy trên phần cứng lượng tử.
10. Ưu tiên component shadcn/ui có sẵn trước khi tự viết.
11. Đổi số liệu hoặc logic tính → chạy `npm test`; đổi UI/luồng → chạy `npm run test:e2e` và cập nhật `tests/e2e` nếu cần.
12. Thay đổi đáng kể (màn hình, schema, token, quy tắc) → cập nhật `docs/` tương ứng.

## Khi nhận link Figma
Dùng Figma MCP để đọc frame, map màu/spacing sang token có sẵn trong `globals.css` thay vì copy giá trị thô, và đặt component vào đúng thư mục theo `docs/TECH_STACK.md` mục 4.
