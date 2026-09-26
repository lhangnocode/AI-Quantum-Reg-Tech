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
