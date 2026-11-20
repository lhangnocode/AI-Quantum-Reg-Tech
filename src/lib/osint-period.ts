export const OSINT_LOOKBACK_MONTHS = 36;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getOsintPeriod(asOf = new Date(), months = OSINT_LOOKBACK_MONTHS) {
  const end = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  const day = end.getUTCDate();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, lastDay));
  return { fromDate: toIsoDate(start), toDate: toIsoDate(end) };
}

export function isOsintEventInPeriod(eventDate: string, decisionYear: number, fromDate: string, toDate: string) {
  const match = /^(\d{4})(?:-(\d{2}))?/.exec(eventDate);
  const year = match ? Number(match[1]) : decisionYear;
  const month = match?.[2] ? Number(match[2]) : null;
  const eventFrom = month ? `${year}-${String(month).padStart(2, "0")}-01` : `${year}-01-01`;
  const eventTo = month ? `${year}-${String(month).padStart(2, "0")}-31` : `${year}-12-31`;
  return eventFrom <= toDate && eventTo >= fromDate;
}

export function formatOsintPeriod(fromDate: string, toDate: string) {
  const format = (value: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return `${format(fromDate)} – ${format(toDate)}`;
}
