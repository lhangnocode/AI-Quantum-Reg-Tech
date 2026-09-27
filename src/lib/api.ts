// ⭐ Lớp truy cập dữ liệu duy nhất. Khi có backend thật, chỉ sửa file này.
import companies from "@/data/companies.json";
import zscore from "@/data/zscore.json";
import esg from "@/data/esg.json";
import osintEvents from "@/data/osint_events.json";
import portfolio from "@/data/portfolio.json";
import scenarios from "@/data/scenarios.json";
import privateSample from "@/data/private_sample.json";
import methodology from "@/data/methodology.json";
import esgIndicators from "@/data/esg_indicators.json";
import type {
  Company,
  Esg,
  EsgIndicatorSet,
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

/** 32 chỉ tiêu ESG công bố (năm 2024) của các DN – nền cho mức độ công bố theo trụ cột E / S / G. */
export async function getEsgIndicators(): Promise<EsgIndicatorSet> {
  if (USE_MOCK) { await delay(150); return esgIndicators as EsgIndicatorSet; }
  return getJson("/api/v1/esg/indicators");
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
  { id: "ocr", label: "Đọc tài liệu / OCR" },
  { id: "normalize", label: "Chuẩn hoá chỉ tiêu" },
  { id: "zscore", label: "Tính Z'-Score" },
  { id: "osint", label: "Quét OSINT" },
];

const isPdf = (file: File) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
const aborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException("Đã huỷ", "AbortError");
};

/**
 * Cổng 2 – phân tích hồ sơ DN chưa niêm yết.
 * Không có backend (mặc định): xử lý NGAY TRONG TRÌNH DUYỆT, tệp không rời khỏi máy người dùng.
 * - PDF: đọc lớp chữ / OCR trang scan → trích 9 chỉ tiêu BCTC → tính Z'. OSINT, ESG chưa tự động (Vòng 2).
 * - Excel: chưa hỗ trợ trích xuất → trả kết quả mẫu (sheet Private_Sample).
 */
export async function analyzePrivate(
  file: File,
  {
    onStage,
    onProgress,
    signal,
  }: { onStage?: (stage: PrivateStage) => void; onProgress?: (message: string) => void; signal?: AbortSignal } = {}
): Promise<PrivateAnalysis> {
  if (!USE_MOCK) {
    const body = new FormData();
    body.append("file", file);
    onStage?.("ocr");
    return getJson("/api/v1/private/analyze", { method: "POST", body, signal });
  }

  if (isPdf(file)) {
    // Import động: pdf.js / Tesseract chỉ tải về trình duyệt khi thật sự phân tích PDF.
    const [{ extractPdfLines }, { parseFinancials }, { computeZPrime }] = await Promise.all([
      import("./ocr/extract-pdf"),
      import("./ocr/parse-financials"),
      import("./ocr/zprime"),
    ]);
    onStage?.("ocr");
    const pdf = await extractPdfLines(file, { onProgress, signal });
    aborted(signal);

    onStage?.("normalize");
    onProgress?.("Tìm 9 chỉ tiêu theo mã số mẫu B01-DN, B02-DN…");
    const parsed = parseFinancials(pdf.lines);
    await delay(300);
    aborted(signal);

    onStage?.("zscore");
    onProgress?.("Tính X1–X5 và Altman Z'…");
    const zscore = computeZPrime(parsed.fields);
    await delay(300);
    aborted(signal);

    onStage?.("osint");
    onProgress?.("Quét OSINT chưa kết nối nguồn dữ liệu (Vòng 2) – bỏ qua.");
    await delay(500);
    aborted(signal);

    const sample = privateSample as Omit<PrivateAnalysis, "deletedAt" | "source">;
    return {
      company: {
        name: parsed.companyName ?? file.name.replace(/\.pdf$/i, ""),
        subsector: "TODO",
        listed: false,
        fiscalYear: parsed.fiscalYear ?? "TODO",
      },
      zscore,
      esg: { ...sample.esg, esgScore: "TODO", greenwashingRisk: "TODO", evidence: [] },
      events: [],
      posint: "TODO",
      source: "document",
      extraction: {
        fileType: "pdf",
        pages: pdf.pages,
        processedPages: pdf.processedPages,
        ocrPages: pdf.ocrPages,
        unit: parsed.unit,
        fields: parsed.fields,
        warnings: parsed.warnings,
      },
      deletedAt: new Date().toISOString(),
    };
  }

  for (const { id } of PRIVATE_STAGES) {
    aborted(signal);
    onStage?.(id);
    await delay(800 + Math.random() * 400);
  }
  aborted(signal);
  return {
    ...(privateSample as Omit<PrivateAnalysis, "deletedAt" | "source">),
    source: "sample",
    deletedAt: new Date().toISOString(),
  };
}
