# Tech Stack – QuantumRegTech MVP

## 1. Nguyên tắc chọn công nghệ

1. **UI trước, backend sau** – toàn bộ MVP chạy được chỉ với frontend + file Excel dữ liệu (chuyển sang JSON lúc build).
2. **Một điểm đổi duy nhất** – UI chỉ gọi hàm trong `src/lib/api.ts`. Khi có backend thật, chỉ sửa file này.
3. **Dùng component có sẵn** – không tự thiết kế button/table/dialog từ đầu.
4. **Deploy được ngay ngày 1** – luôn có link demo chạy được.

## 2. Stack

| Lớp | Công nghệ | Vai trò |
|---|---|---|
| Framework | **Next.js 16 (App Router, Turbopack) + TypeScript** · React 19 · Node 22 | Routing, build, SSR/SSG |
| Styling | **Tailwind CSS v4** | Utility-first, token khai báo bằng CSS variables trong `src/app/globals.css` (không có `tailwind.config`) |
| UI components | **shadcn/ui** style `base-nova` (**Base UI** `@base-ui/react` bên dưới, không phải Radix) | Card, Table, Tabs, Slider, Select, Checkbox, Badge, Progress, Tooltip, Sonner… |
| Icon | **lucide-react** | Bộ icon đồng bộ với shadcn |
| Biểu đồ cơ bản | **Recharts 3** | Radar ESG, Donut phân bổ vốn, Bar backtest |
| Biểu đồ nâng cao | **Apache ECharts 6** (`echarts-for-react/lib/core`, import theo module) | Gauge Z-Score, Heatmap ma trận QUBO (Heatmap rủi ro: chưa làm) |
| Đọc PDF / OCR (Cổng 2) | **pdf.js** (`pdfjs-dist` 6 – bản đã vá lỗi chạy mã khi mở PDF độc hại) + **Tesseract.js 7** + `@tesseract.js-data/vie` | Chạy trong trình duyệt; worker, lõi WASM, mô hình tiếng Việt tự host ở `public/vendor` |
| State | **Zustand 5** (`src/store/portfolio.ts`) | Tham số α β γ δ, solver, danh sách DN theo dõi |
| Font | **Be Vietnam Pro** (UI), **JetBrains Mono** (số liệu) qua `next/font` | Hỗ trợ tiếng Việt đầy đủ |
| Dữ liệu | **File Excel** `data/QuantumRegTech_Data.xlsx` → `scripts/build-data.mjs` (**exceljs**) → JSON trong `src/data/` | Nguồn duy nhất; schema JSON = hợp đồng API tương lai (xem `DATA.md`) |
| Xuất PDF | Trang `/report/[ticker]` + CSS `@media print` → *Save as PDF* | Không cần thư viện PDF |
| Deploy | **Vercel** | Preview link cho mỗi branch/PR |
| Code quality | ESLint (`eslint-config-next`) | Có sẵn khi khởi tạo Next.js (Prettier chưa cài) |
| Test | **Vitest** (unit) + **Playwright** (e2e) | `npm test`, `npm run test:e2e` – xem mục 6 |
| (Tuỳ chọn) Backend | **FastAPI** + SciPy (COBYLA) | Chạy tối ưu danh mục "live" khi kéo slider |

### Vì sao không dùng Streamlit cho bản MVP này?
Hồ sơ Vòng 1 ghi Streamlit. Nhóm đổi vì mục tiêu hiện tại là **UI sản phẩm hoàn thiện**, và Streamlit hạn chế về layout, theming và tương tác.

Câu trả lời khi BGK hỏi: *"Streamlit vẫn phù hợp cho notebook phân tích nội bộ. Bản sản phẩm tách Frontend (Next.js) và Backend (FastAPI) để mở API cho ngân hàng, quỹ tích hợp – đúng với hạng mục API trong đề xuất."*

## 3. Khởi tạo dự án

> **Đã khởi tạo xong** – thành viên mới chỉ cần `npm install` (và `npx playwright install chromium` nếu chạy e2e). Các lệnh dưới đây ghi lại cách dự án đã được tạo.

```bash
# Repo đã có sẵn docs/, README.md, CLAUDE.md nên tạo ở thư mục tạm rồi chép vào (bỏ README/CLAUDE.md sinh ra)
npx create-next-app@latest quantumregtech --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes

npx shadcn@latest init -d
npx shadcn@latest add button card badge table tabs slider dialog input progress \
  sheet tooltip separator skeleton sonner dropdown-menu select alert checkbox label

npm i recharts echarts echarts-for-react zustand lucide-react
npm i pdfjs-dist@^6.3.289 tesseract.js@7 @tesseract.js-data/vie   # OCR Cổng 2
npm i -D @types/node@^22 vitest @playwright/test exceljs   # @types/node ^22 để tương thích Vitest; exceljs đọc file Excel dữ liệu
npx playwright install chromium
```

**Lưu ý Next.js 16** (khác tài liệu cũ trên mạng – đọc `AGENTS.md` và `node_modules/next/dist/docs/` khi nghi ngờ):
- `params` của page là **Promise**: `const { ticker } = await props.params`; kiểu `PageProps<"/company/[ticker]">` là global, sinh bởi `npx next typegen` (hoặc `dev`/`build`).
- `error.tsx` nhận prop **`retry`** (không phải `reset`).
- `layout.tsx` dùng kiểu global `LayoutProps<"/">`.

## 4. Cấu trúc thư mục

```
src/
├── app/
│   ├── layout.tsx                # Sidebar + Header, font, TooltipProvider, Toaster
│   ├── globals.css               # Design token (UI_DESIGN §2) + style in A4
│   ├── page.tsx                  # Dashboard tổng quan
│   ├── loading.tsx · error.tsx · not-found.tsx
│   ├── company/[ticker]/page.tsx # Cổng 1 – chi tiết doanh nghiệp (+ loading.tsx)
│   ├── private/page.tsx          # Cổng 2 – upload bảo mật (mock)
│   ├── portfolio/page.tsx        # Tối ưu danh mục + tab Lõi Lượng tử (+ loading.tsx)
│   └── report/[ticker]/page.tsx  # Báo cáo thẩm định (in PDF) (+ loading.tsx)
├── components/
│   ├── ui/                       # shadcn (tự sinh; slider.tsx có thêm prop getAriaLabel)
│   ├── charts/                   # ZScoreGauge, EsgRadar, AllocationDonut, BacktestChart, QuboHeatmap, EmptyChart
│   ├── dashboard/                # DashboardCard, StatCard, ZoneBadge, EsgCard, FinancialHealthCard, OsintCard
│   ├── company/                  # XTable, GreenwashingEvidence, OsintTimeline, RiskFormula, CompanyActions
│   ├── private/                  # UploadStepper, StepperHeader, Dropzone, ProcessingPanel, PrivateResult, RetentionBanner
│   ├── portfolio/                # PortfolioOptimizer, WeightSliders, WeightTable, CompareTable, QuantumCore
│   ├── report/                   # ReportSection, PrintButton
│   ├── common/                   # InfoTip, PageSkeleton
│   └── layout/                   # Sidebar, Header, GatewayBadge
├── data/                         # *.json SINH TỪ data/QuantumRegTech_Data.xlsx (npm run data, không commit)
├── lib/
│   ├── api.ts                    # ⭐ Lớp truy cập dữ liệu duy nhất
│   ├── types.ts                  # TypeScript types (khớp docs/DATA.md §5)
│   ├── overview.ts               # Ghép companies + zscore + esg + osint → CompanyOverview (tính POSINT, RFin,Total)
│   ├── portfolio.ts              # nearestScenario(), portfolioReturn()
│   ├── assessment.ts             # Kết luận tổng của báo cáo (quy tắc ở UI_DESIGN §4.5)
│   ├── format.ts                 # format %, tỷ VNĐ, bytes, giờ, ngày sự kiện; TODO → "—"
│   ├── risk.ts                   # altmanZone(), ngưỡng Z/Z', nhãn & class màu theo vùng
│   ├── use-css-vars.ts           # Đọc token CSS cho ECharts (canvas), tự cập nhật khi đổi theme
│   ├── ocr/                      # Cổng 2: extract-pdf.ts (pdf.js + Tesseract, client), parse-financials.ts (9 chỉ tiêu), zprime.ts
│   └── utils.ts                  # cn()
└── store/
    └── portfolio.ts              # Zustand store
data/
└── QuantumRegTech_Data.xlsx      # ⭐ Nguồn dữ liệu duy nhất (xem docs/DATA.md)
scripts/
├── build-data.mjs                # Excel → src/data/*.json (chạy trước dev / build / test)
├── copy-ocr-assets.mjs           # node_modules → public/vendor (worker pdf.js, lõi Tesseract, mô hình vie) – không commit
└── make-sample-pdf.mjs           # Tạo BCTC mẫu (DN giả định) để thử Cổng 2
tests/
├── unit/                         # Vitest – format, risk, đối chiếu số liệu với Phụ lục B
├── e2e/                          # Playwright – smoke mọi trang + luồng Cổng 1/2 (PDF chữ, PDF scan/OCR), Danh mục
└── fixtures/                     # bctc-mau-qrt-2024.pdf, …-scan.pdf, …expected.json
```

## 5. Lớp `api.ts`

Mỗi hàm có 2 nhánh: `USE_MOCK` (mặc định) đọc JSON trong `src/data/` (sinh từ file Excel – xem `docs/DATA.md` §1) với độ trễ giả lập; ngược lại gọi `NEXT_PUBLIC_API_URL`. `api.ts` import JSON tĩnh (không đọc Excel lúc chạy) nên dùng được cả ở Server lẫn Client Component và trang vẫn prerender tĩnh.

```ts
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getCompanies(): Promise<Company[]> {
  if (USE_MOCK) { await delay(300); return companies as Company[]; }
  return getJson("/api/v1/companies");   // getJson ném lỗi khi !res.ok → error.tsx
}
```

| Hàm | Mock đọc từ (sheet Excel gốc) | Endpoint thật (DATA.md §5) |
|---|---|---|
| `getCompanies()` / `getCompany(ticker)` | `companies.json` (Companies + Market) | `GET /api/v1/companies` |
| `getZScore(ticker)` | `zscore.json` (ZScore) | `GET /api/v1/companies/{ticker}/zscore` |
| `getEsg(ticker)` | `esg.json` (ESG + ESG_Evidence) | `GET /api/v1/companies/{ticker}/esg` |
| `getOsintEvents(ticker, months)` | `osint_events.json` (OSINT) | `GET /api/v1/companies/{ticker}/osint?months=36` |
| `getPortfolio()` | `portfolio.json` (Params + Portfolio + Portfolio_Summary + QUBO_Matrix) | `POST /api/v1/portfolio/optimize` |
| `getScenarios()` | `scenarios.json` (Scenarios) | – (chỉ mock; có backend thì gọi optimize trực tiếp) |
| `getMethodology()` | `methodology.json` (Params) | `GET /api/v1/methodology` |
| `analyzePrivate(file, { onStage, onProgress, signal })` | PDF: đọc / OCR ngay trong trình duyệt (`lib/ocr`, import động); Excel: `private_sample.json` (Private_Sample) | `POST /api/v1/private/analyze` (multipart) |

Trang không gọi thẳng nhiều hàm lẻ mà dùng `getOverviews()` / `getOverview(ticker)` trong `lib/overview.ts`.

Quy tắc: **component không bao giờ `import` trực tiếp từ `src/data/`**.

## 6. Quy ước

- Branch: `feat/<màn-hình>`, `fix/<mô-tả>`; merge qua PR để có Vercel preview.
- Màu sắc: chỉ dùng token (`bg-primary`, `text-risk-distress`…), không hard-code mã hex trong component. Thư viện vẽ canvas (ECharts) lấy màu qua `useCssVars()`; Recharts (SVG) dùng thẳng `var(--token)`.
- Số liệu: luôn qua `format.ts` (`formatPct(0.0995) → "9,95%"`, dấu phẩy thập phân kiểu Việt). Ô `"TODO"` trong JSON → hiển thị "—"; biểu đồ thiếu số liệu → `EmptyChart`, **không tự điền số**.
- Mọi màn hình phải có trạng thái **loading (Skeleton)**, **empty**, **error**: dùng `loading.tsx`, `error.tsx`, `not-found.tsx` của App Router.
- Trang dữ liệu là Server Component gọi `api.ts`; phần tương tác (biểu đồ, slider, upload) tách thành Client Component (`"use client"`).

### Kiểm thử

```bash
npm run lint && npx tsc --noEmit
npm run data        # Excel → src/data/*.json (tự chạy trước dev / build / test)
npm run assets      # tài nguyên OCR → public/vendor (tự chạy sau install, trước dev / build)
npm test            # Vitest – tests/unit (đối chiếu Z, Ri, lợi nhuận, RFin,Total, Σw, kết quả danh mục với Phụ lục B)
npm run test:e2e    # Playwright – tự build + chạy server cổng 3100, test tests/e2e
```
Khi sửa file Excel, chạy `npm test` để chắc số liệu vẫn nhất quán (Σwᵢ = 1, Z = công thức X1–X5, kết quả danh mục khớp Σ wᵢ × Rᵢ).

## 7. Lộ trình nâng cấp (Vòng 2)

| Hạng mục MVP (mock) | Thay bằng | Ghi chú |
|---|---|---|
| File Excel → JSON tĩnh | FastAPI đọc cùng file Excel / Postgres | Giữ nguyên schema JSON (DATA.md §5); đặt `NEXT_PUBLIC_USE_MOCK=false` |
| `portfolio.json` | FastAPI `POST /api/v1/portfolio/optimize` → SciPy/COBYLA | Code Python nhóm đã có, chỉ cần bọc API |
| Solver cổ điển | Qiskit (QAOA/VQE) qua cùng endpoint, thêm tham số `solver: "classical" \| "qaoa"` | UI đã có Select solver – chỉ cần bỏ `disabled` ở mục QAOA (`WeightSliders.tsx`) |
| `scenarios.json` (slider chọn kịch bản gần nhất) | Gọi optimize trực tiếp với α β γ δ | Sửa `PortfolioOptimizer` gọi API thay vì `nearestScenario()` |
| Sheet `OSINT` | Crawler (CafeF, Vietstock, SSC, Tổng cục Thuế) + NLP phân loại | Lưu vào Postgres/Supabase |
| Sheet `ESG_Evidence` (bằng chứng) | LLM + RAG đối chiếu Vietnam Green Taxonomy | Trả về đoạn trích + nguồn |
| OCR trong trình duyệt (Cổng 2) | Giữ nguyên, hoặc OCR phía máy chủ (PyMuPDF/pdfplumber + Tesseract/PaddleOCR) cho tệp lớn + xoá file sau xử lý | Nhánh gọi `POST /api/v1/private/analyze` đã viết sẵn; backend trả cùng `PrivateAnalysis` (kể cả `extraction`) và nên trả tiến độ (SSE) để giữ `onStage` / `onProgress` |
| Excel ở Cổng 2 (kết quả mẫu) | Đọc bảng CĐKT/KQKD từ Excel (exceljs phía client) | Dùng lại `parseFinancials` + `computeZPrime` |
| `qubo.matrix` = `"TODO"` | Ma trận Q 16×16 xuất từ code Python → dán vào sheet `QUBO_Matrix` | `QuboHeatmap` tự hiển thị khi là `number[][]` |

## 8. Lịch triển khai gợi ý (7–10 ngày)

| Ngày | Dev | Tài chính |
|---|---|---|
| 1 | Khởi tạo repo, layout, deploy Vercel | Chốt số liệu JSON |
| 2–4 | Mỗi dev 1–2 màn hình | Nội dung bằng chứng tẩy xanh, sự kiện OSINT |
| 5–6 | Nối data, biểu đồ, responsive, loading state | Rà số liệu trên UI, viết kịch bản demo |
| 7 | (Tuỳ chọn) FastAPI cho slider | Chạy thử demo |
| 8+ | Polish, quay video demo dự phòng | |
