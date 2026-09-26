import type { Company, Esg, OsintEvent, ZScore } from "@/lib/types";

/** Dữ liệu tổng hợp 1 DN cho Dashboard (ghép từ companies + zscore + esg + osint). */
export interface CompanyOverview {
  company: Company;
  zscore: ZScore;
  esg: Esg;
  events: OsintEvent[];
  /** Σ penalty các sự kiện OSINT đang hiệu lực. */
  posint: number;
  /** RFin,Total = RFin,Base + POSINT. */
  rfinTotal: number;
}
