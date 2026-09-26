// ⭐ Lớp truy cập dữ liệu duy nhất. Khi có backend thật, chỉ sửa file này.
import companies from "@/data/companies.json";
import zscore from "@/data/zscore.json";
import esg from "@/data/esg.json";
import osintEvents from "@/data/osint_events.json";
import portfolio from "@/data/portfolio.json";
import scenarios from "@/data/scenarios.json";
import privateSample from "@/data/private_sample.json";
import methodology from "@/data/methodology.json";
import type {
  Company,
  Esg,
  Methodology,
  OsintEvent,
  PortfolioResult,
  PrivateAnalysis,
  PrivateStage,
  Scenario,
  Ticker,
  ZScore,
} from "./types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export async function getCompanies(): Promise<Company[]> {
  if (USE_MOCK) { await delay(300); return companies as Company[]; }
  return getJson("/api/v1/companies");
}

export async function getCompany(ticker: Ticker): Promise<Company | undefined> {
  const all = await getCompanies();
  return all.find((c) => c.ticker === ticker.toUpperCase());
}

export async function getZScore(ticker: Ticker): Promise<ZScore> {
  if (USE_MOCK) { await delay(200); return (zscore as Record<Ticker, ZScore>)[ticker]; }
  return getJson(`/api/v1/companies/${ticker}/zscore`);
}

export async function getEsg(ticker: Ticker): Promise<Esg> {
  if (USE_MOCK) { await delay(200); return (esg as Record<Ticker, Esg>)[ticker]; }
  return getJson(`/api/v1/companies/${ticker}/esg`);
}

export async function getOsintEvents(ticker: Ticker, months = 36): Promise<OsintEvent[]> {
  if (USE_MOCK) {
    await delay(200);
    return (osintEvents as OsintEvent[]).filter((e) => e.ticker === ticker);
  }
  return getJson(`/api/v1/companies/${ticker}/osint?months=${months}`);
}

export async function getPortfolio(): Promise<PortfolioResult> {
  if (USE_MOCK) { await delay(800); return portfolio as PortfolioResult; }
  return getJson("/api/v1/portfolio/optimize", { method: "POST" });
}

/** Tham số chung & phương pháp (Rf, ERP, CAPM, Altman, POSINT). */
export async function getMethodology(): Promise<Methodology> {
  if (USE_MOCK) return methodology as Methodology;
  return getJson("/api/v1/methodology");
}

/** Kịch bản tham số tính sẵn cho slider (chỉ có ở chế độ mock). */
export async function getScenarios(): Promise<Scenario[]> {
  if (USE_MOCK) { await delay(200); return scenarios as Scenario[]; }
  return [];
}

export const PRIVATE_STAGES: { id: PrivateStage; label: string }[] = [
  { id: "ocr", label: "OCR trích xuất" },
  { id: "normalize", label: "Chuẩn hoá chỉ tiêu" },
  { id: "zscore", label: "Tính Z'-Score" },
  { id: "osint", label: "Quét OSINT" },
];

/**
 * Cổng 2 – phân tích hồ sơ DN chưa niêm yết.
 * Mock: tệp KHÔNG rời khỏi trình duyệt; giả lập 4 bước (0,8–1,2s/bước) rồi trả kết quả mẫu.
 */
export async function analyzePrivate(
  file: File,
  { onStage, signal }: { onStage?: (stage: PrivateStage) => void; signal?: AbortSignal } = {}
): Promise<PrivateAnalysis> {
  if (USE_MOCK) {
    for (const { id } of PRIVATE_STAGES) {
      if (signal?.aborted) throw new DOMException("Đã huỷ", "AbortError");
      onStage?.(id);
      await delay(800 + Math.random() * 400);
    }
    if (signal?.aborted) throw new DOMException("Đã huỷ", "AbortError");
    return {
      ...(privateSample as Omit<PrivateAnalysis, "deletedAt">),
      deletedAt: new Date().toISOString(),
    };
  }
  const body = new FormData();
  body.append("file", file);
  onStage?.("ocr");
  return getJson("/api/v1/private/analyze", { method: "POST", body, signal });
}
