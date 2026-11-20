import { NextResponse } from "next/server";
import events from "@data/osint_events.json";
import companies from "@data/companies.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.QUANTUM_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const MAX_TICKERS = 4;

/**
 * Starts a FastAPI OSINT scan job (Firecrawl Agent for a rolling date range → reviewer acceptance) and returns
 * `{ scan_id, status: "running" }`; the client polls GET /api/osint/scan/{id}.
 * There is deliberately no second search implementation here: when FastAPI is unreachable the route returns the
 * workbook events already reviewed for that year (no polling). Neither the agent nor an LLM writes official P_OSINT.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { tickers?: unknown; from_date?: unknown; to_date?: unknown };
  const tickers = Array.isArray(body.tickers) ? body.tickers.filter((t): t is string => typeof t === "string") : [];
  const fromDate = typeof body.from_date === "string" ? body.from_date : "";
  const toDate = typeof body.to_date === "string" ? body.to_date : "";
  if (!tickers.length) return NextResponse.json({ error: "Chọn ít nhất một mã." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate) || fromDate > toDate || toDate > new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "Khoảng ngày quét không hợp lệ." }, { status: 400 });
  }
  if (tickers.length > MAX_TICKERS) return NextResponse.json({ error: `Tối đa ${MAX_TICKERS} mã cho một lượt quét.` }, { status: 413 });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/osint/scans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tickers, from_date: fromDate, to_date: toDate }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return workbookFallback(tickers, fromDate, toDate);
  }

  const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
  if (response.ok && payload) return NextResponse.json(payload);
  const detail = typeof payload?.detail === "string" ? payload.detail : `Backend OSINT lỗi HTTP ${response.status}.`;
  return NextResponse.json({ error: detail }, { status: response.status });
}

function workbookFallback(tickers: string[], fromDate: string, toDate: string) {
  const valid = new Set(tickers.map((t) => t.toUpperCase()).filter((t) => companies.some((c) => c.ticker === t)));
  if (!valid.size) return NextResponse.json({ error: "Chọn ít nhất một mã hợp lệ." }, { status: 400 });
  const findings = (events as Array<{ ticker: string; title: string; source: string; url: string; severity: number; penalty: number; decisionYear: number; date: string; dateNote: string | null }>)
    .filter((e) => {
      if (!valid.has(e.ticker)) return false;
      const month = /^\d{4}-\d{2}/.test(e.date) ? e.date.slice(0, 7) : String(e.decisionYear);
      const eventStart = month.length === 7 ? `${month}-01` : `${month}-01-01`;
      const eventEnd = month.length === 7 ? `${month}-31` : `${month}-12-31`;
      return eventStart <= toDate && eventEnd >= fromDate;
    })
    .map((e) => ({ ticker: e.ticker, title: e.title, source: e.source, url: e.url, sourceProvider: "workbook", status: "Already in assessment", reviewed: true, penaltyLevel: e.severity, penalty: e.penalty, eventDate: e.dateNote ?? e.date, decisionYear: e.decisionYear, alreadyInAssessment: true }));
  return NextResponse.json({
    mode: "workbook",
    backend: "unavailable",
    from_date: fromDate,
    to_date: toDate,
    providers: [],
    warnings: [`Chưa kết nối được dịch vụ OSINT tại ${API_URL}.`],
    findings,
  });
}
