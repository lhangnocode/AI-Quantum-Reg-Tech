// Định dạng số kiểu Việt: dấu phẩy thập phân. Giá trị "TODO"/thiếu → "—".
import type { Todo } from "./types";

export const EMPTY = "—";

const isMissing = (v: unknown): v is "TODO" | null | undefined =>
  v === "TODO" || v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));

export function formatNumber(v: Todo<number> | null | undefined, digits = 2): string {
  if (isMissing(v)) return EMPTY;
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

/** formatPct(0.0995) → "9,95%" */
export function formatPct(v: Todo<number> | null | undefined, digits = 2, signed = false): string {
  if (isMissing(v)) return EMPTY;
  const s = `${formatNumber(v * 100, digits)}%`;
  return signed && v > 0 ? `+${s}` : s;
}

/** formatBillion(50_900_000_000) → "50,9 tỷ" */
export function formatBillion(vnd: Todo<number> | null | undefined, digits = 1): string {
  if (isMissing(vnd)) return EMPTY;
  return `${formatNumber(vnd / 1e9, digits)} tỷ`;
}

export function formatText(v: Todo<string> | null | undefined): string {
  return isMissing(v) ? EMPTY : v;
}

/** formatBytes(1_250_000) → "1,2 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${formatNumber(bytes / 1024, 1)} KB`;
  return `${formatNumber(bytes / 1024 ** 2, 1)} MB`;
}

/** formatTime("2026-09-26T15:31:05Z") → "22:31:05" (giờ địa phương) */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(
    new Date(iso)
  );
}

/** Ngày sự kiện "YYYY-MM" → "MM/YYYY"; "2022-TODO" → "2022 (chưa rõ tháng)". */
export function formatEventDate(date: string): string {
  const [y, m] = date.split("-");
  return m && /^\d{1,2}$/.test(m) ? `${m.padStart(2, "0")}/${y}` : `${y} (chưa rõ tháng)`;
}
