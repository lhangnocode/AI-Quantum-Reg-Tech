// ⭐ Lớp truy cập dữ liệu duy nhất. Khi có backend thật, chỉ sửa file này.
import companies from "@data/companies.json";
import zscore from "@data/zscore.json";
import esg from "@data/esg.json";
import osintEvents from "@data/osint_events.json";
import methodology from "@data/methodology.json";
import esgIndicators from "@data/esg_indicators.json";
import type {
  Company,
  Esg,
  EsgIndicatorSet,
  ExtractedField,
  Methodology,
  OsintEvent,
  PrivateAnalysis,
  PrivateStage,
  Ticker,
  ZScore,
} from "./types";
import { getOsintPeriod, isOsintEventInPeriod } from "./osint-period";

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
  const local = companies as Company[];
  try {
    const page = await getJson<{ companies?: Company[] }>("/api/v1/companies?limit=200");
    const merged = new Map(local.map((company) => [company.ticker, company]));
    for (const company of page.companies ?? []) merged.set(company.ticker, { ...merged.get(company.ticker), ...company });
    return [...merged.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
  } catch {
    return local;
  }
}

export async function getCompany(ticker: Ticker): Promise<Company | undefined> {
  const all = await getCompanies();
  return all.find((c) => c.ticker === ticker.toUpperCase());
}

export async function getZScore(ticker: Ticker): Promise<ZScore> {
  if (USE_MOCK) { await delay(200); return (zscore as Record<Ticker, ZScore>)[ticker]; }
  try { return await getJson(`/api/v1/companies/${ticker}/zscore`); }
  catch { return (zscore as Record<Ticker, ZScore>)[ticker]; }
}

export async function getEsg(ticker: Ticker): Promise<Esg> {
  if (USE_MOCK) { await delay(200); return (esg as Record<Ticker, Esg>)[ticker]; }
  try { return await getJson(`/api/v1/companies/${ticker}/esg`); }
  catch { return (esg as Record<Ticker, Esg>)[ticker]; }
}

export async function getOsintEvents(ticker: Ticker, months = 36): Promise<OsintEvent[]> {
  const { fromDate, toDate } = getOsintPeriod(new Date(), months);
  const localEvents = (osintEvents as OsintEvent[]).filter((e) => e.ticker === ticker && isOsintEventInPeriod(e.date, e.decisionYear ?? Number(e.date.slice(0, 4)), fromDate, toDate));
  if (USE_MOCK) {
    await delay(200);
    return localEvents;
  }
  try {
    const remote = await getJson<OsintEvent[]>(`/api/v1/companies/${ticker}/osint?months=${months}`);
    const merged = new Map(localEvents.map((event) => [event.id, event]));
    for (const event of remote) merged.set(event.id, { ...merged.get(event.id), ...event });
    return [...merged.values()];
  } catch { return localEvents; }
}

/** 32 chỉ tiêu ESG công bố (năm 2024) của các DN – nền cho mức độ công bố theo trụ cột E / S / G. */
export async function getEsgIndicators(): Promise<EsgIndicatorSet> {
  if (USE_MOCK) { await delay(150); return esgIndicators as EsgIndicatorSet; }
  const local = esgIndicators as EsgIndicatorSet;
  try {
    const remote = await getJson<EsgIndicatorSet>("/api/v1/esg/indicators");
    const localByCode = new Map(local.indicators.map((indicator) => [indicator.code, indicator]));
    const remoteByCode = new Map(remote.indicators.map((indicator) => [indicator.code, indicator]));
    const indicators = [...new Set([...localByCode.keys(), ...remoteByCode.keys()])].map((code) => {
      const localIndicator = localByCode.get(code);
      const remoteIndicator = remoteByCode.get(code);
      return {
        ...localIndicator,
        ...remoteIndicator,
        values: { ...(localIndicator?.values ?? {}), ...(remoteIndicator?.values ?? {}) },
      } as EsgIndicatorSet["indicators"][number];
    });
    return { ...local, ...remote, indicators, values: { ...local.values, ...remote.values } };
  } catch {
    return local;
  }
}

/** Tham số chung & phương pháp (Rf, ERP, CAPM, Altman, POSINT). */
export async function getMethodology(): Promise<Methodology> {
  if (USE_MOCK) return methodology as Methodology;
  const local = methodology as Methodology;
  const remote = await getJson<Partial<Methodology>>("/api/v1/methodology");
  return {
    ...local,
    ...remote,
    dataYear: remote.dataYear ?? local.dataYear,
    forecastYear: remote.forecastYear ?? local.forecastYear,
    penaltyTable: remote.penaltyTable ?? local.penaltyTable,
  };
}

export const PRIVATE_STAGES: { id: PrivateStage; label: string }[] = [
  { id: "ocr", label: "Đọc tài liệu / OCR" },
  { id: "normalize", label: "Chuẩn hoá chỉ tiêu" },
  { id: "ai", label: "LLM Agent (nếu được cấp phép)" },
  { id: "zscore", label: "Tính Z'-Score" },
  { id: "osint", label: "Quét OSINT" },
];

const isPdf = (file: File) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
const aborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException("Đã huỷ", "AbortError");
};

/**
 * Cổng 2 – phân tích hồ sơ DN chưa niêm yết.
 * PDF gốc luôn đọc/OCR trong trình duyệt. Phần text chỉ gửi tới LLM nếu người dùng bật useLlm riêng.
 * - PDF: đọc lớp chữ / OCR trang scan → trích 9 chỉ tiêu BCTC → tính Z'. OSINT, ESG chưa tự động (Vòng 2).
 * - Excel: chưa hỗ trợ trích xuất → báo lỗi rõ ràng (không trả kết quả mẫu).
 */
export async function analyzePrivate(
  file: File,
  {
    onStage,
    onProgress,
    signal,
    useLlm = false,
  }: { onStage?: (stage: PrivateStage) => void; onProgress?: (message: string) => void; signal?: AbortSignal; useLlm?: boolean } = {}
): Promise<PrivateAnalysis> {
  // PDF bytes stay in the browser; only consented OCR/text lines may be sent for LLM extraction.
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
    onProgress?.("Đọc nhãn báo cáo và đối chiếu quy tắc tài chính…");
    const parsed = parseFinancials(pdf.lines);
    await delay(300);
    aborted(signal);

    let fields: ExtractedField[] = parsed.fields.map((field) => ({ ...field, method: "rules" }));
    let ai: NonNullable<NonNullable<PrivateAnalysis["extraction"]>["ai"]> = {
      mode: "skipped", warning: "Chưa bật gửi văn bản trích xuất tới LLM; chỉ dùng OCR và parser cục bộ.",
    };
    if (useLlm) {
      onStage?.("ai");
      onProgress?.("LangGraph: trích xuất 9 chỉ tiêu → kiểm tra quote và trang nguồn…");
      try {
        const requestLines: Array<{ page: number; text: string; source: "text" | "ocr" }> = [];
        let requestChars = 0;
        for (const line of pdf.lines.slice(0, 500)) {
          const text = line.text.slice(0, 1000);
          if (requestChars + text.length > 150_000) break;
          requestLines.push({ ...line, text });
          requestChars += text.length;
        }
        const response = await fetch("/api/private/extract", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ lines: requestLines }), cache: "no-store", signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail ?? "LLM extraction không khả dụng.");
        ai = {
          mode: payload.mode === "live" ? "live" : "unavailable",
          provider: payload.provider, model: payload.model,
          validatedCount: payload.validated_count ?? 0, proposalCount: payload.proposal_count ?? 0,
          workflow: payload.workflow, warning: payload.warning,
        };
        if (payload.mode === "live") {
          const proposals = new Map((payload.fields ?? []).map((field: { key: string; value: number | null; page?: number; source?: "text" | "ocr"; line?: string; confidence?: number; verified?: boolean }) => [field.key, field]));
          fields = fields.map((field) => {
            const proposal = proposals.get(field.key) as { value: number | null; page?: number; source?: "text" | "ocr"; line?: string; confidence?: number; verified?: boolean } | undefined;
            if (!proposal?.verified || proposal.value === null || !Number.isFinite(proposal.value)) return field;
            return { ...field, value: proposal.value, page: proposal.page, source: proposal.source, line: proposal.line, method: "llm" as const, confidence: proposal.confidence, rulesValue: field.value };
          });
          const conflicts = fields.filter((field) => field.method === "llm" && field.rulesValue !== null && field.rulesValue !== field.value).length;
          if (conflicts) ai.warning = `${conflicts} chỉ tiêu khác parser quy tắc; cần đối chiếu ảnh/PDF gốc.`;
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") throw error;
        ai = { mode: "unavailable", warning: error instanceof Error ? error.message : "Không gọi được LLM; giữ kết quả parser cục bộ." };
      }
      aborted(signal);
    }

    onStage?.("zscore");
    onProgress?.("Tính X1–X5 và Altman Z'…");
    const zscore = computeZPrime(fields);
    await delay(300);
    aborted(signal);

    onStage?.("osint");
    onProgress?.("Quét OSINT chưa kết nối nguồn dữ liệu (Vòng 2) – bỏ qua.");
    await delay(500);
    aborted(signal);

    return {
      company: {
        name: parsed.companyName ?? file.name.replace(/\.pdf$/i, ""),
        subsector: "TODO",
        listed: false,
        fiscalYear: parsed.fiscalYear ?? "TODO",
      },
      zscore,
      esg: { esgScore: "TODO", pillars: { E: "TODO", S: "TODO", G: "TODO", transparency: "TODO", compliance: "TODO" }, greenwashingRisk: "TODO", evidence: [] },
      events: [],
      posint: "TODO",
      source: "document",
      extraction: {
        fileType: "pdf",
        pages: pdf.pages,
        processedPages: pdf.processedPages,
        ocrPages: pdf.ocrPages,
        unit: parsed.unit,
        fields,
        warnings: parsed.warnings,
        ai,
      },
      deletedAt: new Date().toISOString(),
    };
  }

  throw new Error("Chưa hỗ trợ trích xuất từ Excel. Hãy tải báo cáo tài chính dạng PDF.");
}
