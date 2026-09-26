import { getCompanies, getCompany, getEsg, getOsintEvents, getZScore } from "./api";
import type { Company, Esg, OsintEvent, ZScore } from "./types";

/** Dữ liệu tổng hợp 1 DN (companies + zscore + esg + osint), dùng chung cho các trang. */
export interface CompanyOverview {
  company: Company;
  zscore: ZScore;
  esg: Esg;
  /** Toàn bộ sự kiện trong 36 tháng. */
  allEvents: OsintEvent[];
  /** Sự kiện đang hiệu lực (tính vào POSINT). */
  events: OsintEvent[];
  /** Σ penalty các sự kiện đang hiệu lực. */
  posint: number;
  /** RFin,Total = RFin,Base + POSINT. */
  rfinTotal: number;
}

async function build(company: Company): Promise<CompanyOverview> {
  const [zscore, esg, allEvents] = await Promise.all([
    getZScore(company.ticker),
    getEsg(company.ticker),
    getOsintEvents(company.ticker),
  ]);
  const events = allEvents.filter((e) => e.active);
  const posint = events.reduce((sum, e) => sum + e.penalty, 0);
  return { company, zscore, esg, allEvents, events, posint, rfinTotal: zscore.rfinBase + posint };
}

export async function getOverviews(): Promise<CompanyOverview[]> {
  return Promise.all((await getCompanies()).map(build));
}

export async function getOverview(ticker: string): Promise<CompanyOverview | undefined> {
  const company = await getCompany(ticker);
  return company && build(company);
}
