# Tech Stack – QuantumRegTech MVP

## 1. Nguyên tắc chọn công nghệ

1. **UI trước, backend sau** – toàn bộ MVP chạy được chỉ với frontend + file JSON.
2. **Một điểm đổi duy nhất** – UI chỉ gọi hàm trong `src/lib/api.ts`. Khi có backend thật, chỉ sửa file này.
3. **Dùng component có sẵn** – không tự thiết kế button/table/dialog từ đầu.
4. **Deploy được ngay ngày 1** – luôn có link demo chạy được.

## 2. Stack

| Lớp | Công nghệ | Vai trò |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Routing, build, SSR/SSG |
| Styling | **Tailwind CSS** | Utility-first, dùng design token trong `globals.css` |
| UI components | **shadcn/ui** (Radix UI bên dưới) | Card, Table, Tabs, Slider, Dialog, Badge, Progress, Tooltip… |
| Icon | **lucide-react** | Bộ icon đồng bộ với shadcn |
| Biểu đồ cơ bản | **Recharts** | Radar ESG, Bar, Donut phân bổ vốn, Line backtest |
| Biểu đồ nâng cao | **Apache ECharts** (`echarts-for-react`) | Gauge Z-Score, Heatmap rủi ro, Heatmap ma trận QUBO |
| State | **Zustand** | Tham số α β γ δ, doanh nghiệp đang chọn |
| Font | **Be Vietnam Pro** (UI), **JetBrains Mono** (số liệu) qua `next/font` | Hỗ trợ tiếng Việt đầy đủ |
| Mock data | JSON tĩnh trong `src/data/` | Schema = hợp đồng API tương lai (xem `MOCK_DATA.md`) |
| Xuất PDF | Trang `/report/[ticker]` + CSS `@media print` → *Save as PDF* | Không cần thư viện PDF |
| Deploy | **Vercel** | Preview link cho mỗi branch/PR |
| Code quality | ESLint + Prettier | Có sẵn khi khởi tạo Next.js |
| (Tuỳ chọn) Backend | **FastAPI** + SciPy (COBYLA) | Chạy tối ưu danh mục "live" khi kéo slider |

### Vì sao không dùng Streamlit cho bản MVP này?
Hồ sơ Vòng 1 ghi Streamlit. Nhóm đổi vì mục tiêu hiện tại là **UI sản phẩm hoàn thiện**, và Streamlit hạn chế về layout, theming và tương tác.

Câu trả lời khi BGK hỏi: *"Streamlit vẫn phù hợp cho notebook phân tích nội bộ. Bản sản phẩm tách Frontend (Next.js) và Backend (FastAPI) để mở API cho ngân hàng, quỹ tích hợp – đúng với hạng mục API trong đề xuất."*

## 3. Khởi tạo dự án

```bash
npx create-next-app@latest quantumregtech --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd quantumregtech

npx shadcn@latest init
npx shadcn@latest add button card badge table tabs slider dialog input progress \
  sheet tooltip separator skeleton sonner dropdown-menu select alert

npm i recharts echarts echarts-for-react zustand lucide-react
```

## 4. Cấu trúc thư mục

```
src/
├── app/
│   ├── layout.tsx                # Sidebar + Header, font, theme
│   ├── page.tsx                  # Dashboard tổng quan
│   ├── company/[ticker]/page.tsx # Cổng 1 – chi tiết doanh nghiệp
│   ├── private/page.tsx          # Cổng 2 – upload bảo mật (mock)
│   ├── portfolio/page.tsx        # Tối ưu danh mục + tab QUBO
│   └── report/[ticker]/page.tsx  # Báo cáo thẩm định (in PDF)
├── components/
│   ├── ui/                       # shadcn (tự sinh)
│   ├── charts/                   # ZScoreGauge, EsgRadar, RiskHeatmap, AllocationDonut, BacktestChart, QuboHeatmap
│   ├── company/                  # CompanyCard, GreenwashingEvidence, OsintTimeline
│   ├── portfolio/                # WeightSliders, WeightTable, CompareTable
│   └── layout/                   # Sidebar, Header, GatewayBadge
├── data/                         # *.json mock
├── lib/
│   ├── api.ts                    # ⭐ Lớp truy cập dữ liệu duy nhất
│   ├── types.ts                  # TypeScript types (khớp MOCK_DATA.md)
│   ├── format.ts                 # format %, tỷ VNĐ, ngày
│   └── risk.ts                   # altmanZone(), riskColor()
└── store/
    └── portfolio.ts              # Zustand store
```

## 5. Mẫu lớp `api.ts`

```ts
// src/lib/api.ts
import companies from "@/data/companies.json";
import portfolio from "@/data/portfolio.json";
import type { Company, PortfolioResult } from "./types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getCompanies(): Promise<Company[]> {
  if (USE_MOCK) { await delay(300); return companies as Company[]; }
  return fetch(`${API_URL}/api/v1/companies`).then((r) => r.json());
}

export async function getPortfolio(): Promise<PortfolioResult> {
  if (USE_MOCK) { await delay(800); return portfolio as PortfolioResult; }
  return fetch(`${API_URL}/api/v1/portfolio/optimize`, { method: "POST" }).then((r) => r.json());
}
```

Quy tắc: **component không bao giờ `import` trực tiếp từ `src/data/`**.

## 6. Quy ước

- Branch: `feat/<màn-hình>`, `fix/<mô-tả>`; merge qua PR để có Vercel preview.
- Màu sắc: chỉ dùng token (`bg-primary`, `text-risk-distress`…), không hard-code mã hex trong component.
- Số liệu: luôn qua `format.ts` (`formatPct(0.0995) → "9,95%"`, dấu phẩy thập phân kiểu Việt).
- Mọi màn hình phải có trạng thái **loading (Skeleton)**, **empty**, **error**.

## 7. Lộ trình nâng cấp (Vòng 2)

| Hạng mục MVP (mock) | Thay bằng | Ghi chú |
|---|---|---|
| `portfolio.json` | FastAPI `POST /api/v1/portfolio/optimize` → SciPy/COBYLA | Code Python nhóm đã có, chỉ cần bọc API |
| Solver cổ điển | Qiskit (QAOA/VQE) qua cùng endpoint, thêm tham số `solver: "classical" \| "qaoa"` | UI không đổi, chỉ thêm toggle |
| `osint_events.json` | Crawler (CafeF, Vietstock, SSC, Tổng cục Thuế) + NLP phân loại | Lưu vào Postgres/Supabase |
| `esg.json` (bằng chứng) | LLM + RAG đối chiếu Vietnam Green Taxonomy | Trả về đoạn trích + nguồn |
| Upload giả ở Cổng 2 | OCR (PyMuPDF/pdfplumber) + xoá file sau xử lý (Zero-Retention) | |

## 8. Lịch triển khai gợi ý (7–10 ngày)

| Ngày | Dev | Tài chính |
|---|---|---|
| 1 | Khởi tạo repo, layout, deploy Vercel | Chốt số liệu JSON |
| 2–4 | Mỗi dev 1–2 màn hình | Nội dung bằng chứng tẩy xanh, sự kiện OSINT |
| 5–6 | Nối data, biểu đồ, responsive, loading state | Rà số liệu trên UI, viết kịch bản demo |
| 7 | (Tuỳ chọn) FastAPI cho slider | Chạy thử demo |
| 8+ | Polish, quay video demo dự phòng | |
