// ⭐ Lớp truy cập dữ liệu duy nhất. Khi có backend thật, chỉ sửa file này.
import companies from "@/data/companies.json";
import zscore from "@/data/zscore.json";
import esg from "@/data/esg.json";
import osintEvents from "@/data/osint_events.json";
import portfolio from "@/data/portfolio.json";
import type { Company, Esg, OsintEvent, PortfolioResult, Ticker, ZScore } from "./types";

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
