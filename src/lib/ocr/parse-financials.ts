// Trích 9 chỉ tiêu tài chính từ các dòng chữ của BCTC (mẫu B01-DN, B02-DN theo Thông tư 200).
// Hàm thuần – không phụ thuộc trình duyệt – nên dùng được cho cả văn bản PDF lẫn kết quả OCR.

import type { ExtractedField, FinKey } from "@/lib/types";

export interface SourceLine {
  page: number;
  text: string;
  source: "text" | "ocr";
}

export interface ParsedFinancials {
  fields: ExtractedField[];
  companyName?: string;
  fiscalYear?: number;
  unit?: string;
  warnings: string[];
}

interface FieldSpec {
  key: FinKey;
  label: string;
  code: string;
  match: RegExp;
  exclude?: RegExp;
}

// Mẫu khớp trên văn bản đã bỏ dấu, chữ thường.
const SPECS: FieldSpec[] = [
  { key: "CA", label: "Tài sản ngắn hạn", code: "100", match: /tai san ngan han/, exclude: /khac|dai han/ },
  { key: "TA", label: "Tổng cộng tài sản", code: "270", match: /tong (cong )?tai san/ },
  { key: "CL", label: "Nợ ngắn hạn", code: "310", match: /\bno ngan han\b/, exclude: /phai tra|vay|khac/ },
  { key: "TL", label: "Nợ phải trả", code: "300", match: /\bno phai tra\b/, exclude: /ngan han|dai han|nguoi|khac|noi bo/ },
  { key: "EQ", label: "Vốn chủ sở hữu", code: "400", match: /\bvon chu so huu\b/, exclude: /von gop|khac/ },
  { key: "RE", label: "Lợi nhuận sau thuế chưa phân phối", code: "421", match: /loi nhuan (sau thue )?chua phan phoi/ },
  { key: "Revenue", label: "Doanh thu thuần", code: "10", match: /doanh thu thuan/, exclude: /tai chinh/ },
  { key: "PBT", label: "Tổng lợi nhuận kế toán trước thuế", code: "50", match: /loi nhuan (ke toan )?truoc thue/, exclude: /thuan tu/ },
  { key: "Interest", label: "Chi phí lãi vay", code: "23", match: /chi phi lai vay/ },
];

/** Bỏ dấu tiếng Việt, chữ thường, gộp khoảng trắng. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Số tiền: nhóm nghìn bằng "." hoặc "," (OCR hay nhầm), có thể trong ngoặc (số âm).
const GROUPED = /^\(?-?\d{1,3}(?:[.,]\d{3})+\)?$/;
// OCR hay làm mất / thừa dấu phân cách: "1986.504.117390" → vẫn là số tiền có phân cách.
const LOOSE = /^\(?-?\d+(?:[.,]\d+)+\)?$/;
const DECIMAL = /^\(?-?\d+(?:,\d{1,2})?\)?$/;

const clean = (token: string) => token.replace(/[^\d.,()-]/g, "");

/** Token là số tiền có dấu phân cách (≥ 4 chữ số) – phân biệt với STT, mã số, thuyết minh. */
function isSeparatedAmount(token: string): boolean {
  if (/[A-Za-zÀ-ỹ]/.test(token)) return false;
  const t = clean(token);
  if (!LOOSE.test(t)) return false;
  const digits = t.replace(/\D/g, "");
  const seps = (t.match(/[.,]/g) ?? []).length;
  const last = t.replace(/[()]/g, "").split(/[.,]/).pop() ?? "";
  // "612,45" (1 dấu, 2 chữ số sau) là số thập phân, không phải số tiền nhóm nghìn.
  return digits.length >= 4 && (seps >= 2 || last.length === 3 || digits.length >= 7);
}

/** Chuyển 1 token thành số; null nếu không phải số tiền. */
export function parseAmount(token: string): number | null {
  // Chữ cái lẫn trong số ("3I.44B,9I7") = OCR đọc hỏng → không đoán.
  if (/[A-Za-zÀ-ỹ]/.test(token.replace(/[đĐ]$/, ""))) return null;
  const t = clean(token);
  if (!t || !/\d/.test(t)) return null;
  const negative = t.startsWith("(") && t.endsWith(")");
  const core = t.replace(/[()]/g, "");
  let n: number;
  if (GROUPED.test(t) || isSeparatedAmount(t)) n = Number(core.replace(/[.,]/g, ""));
  else if (DECIMAL.test(t) || DECIMAL.test(core)) n = Number(core.replace(",", "."));
  else return null;
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

/**
 * Số tiền của kỳ này trên 1 dòng: số đầu tiên sau mã số (cột "Số cuối năm" / "Năm nay"),
 * bỏ qua cột thuyết minh (vd. "V.01", "5.2").
 */
function amountOnLine(text: string, code: string): { value: number; viaCode: boolean; uncertain: boolean } | null {
  const tokens = text.split(/\s+/).filter(Boolean);
  const codeIdx = tokens.findIndex((t) => t.replace(/[^\dA-Za-z]/g, "") === code);
  const start = codeIdx >= 0 ? codeIdx + 1 : 0;
  // Đã bỏ qua một token nhiều chữ số nhưng đọc không ra → số được chọn có thể thuộc cột năm trước.
  let uncertain = false;
  for (let i = start; i < tokens.length; i++) {
    const tok = tokens[i];
    if (/^[A-Za-z]{1,4}[.\d]*$/.test(tok)) continue; // thuyết minh "V.01"
    const digits = tok.replace(/\D/g, "");
    const skip = () => {
      if (digits.length >= 6) uncertain = true;
    };
    // Khi không có mã số trên dòng, chỉ nhận số có dấu phân cách để tránh nhặt nhầm STT / thuyết minh.
    if (codeIdx < 0 && !isSeparatedAmount(tok)) {
      skip();
      continue;
    }
    if (codeIdx >= 0 && digits.length <= 2 && !/[.,]/.test(tok)) continue; // STT, thuyết minh "5"
    const v = parseAmount(tok);
    if (v !== null) return { value: v, viaCode: codeIdx >= 0, uncertain };
    skip();
  }
  return null;
}

function findCompanyName(lines: SourceLine[]): string | undefined {
  const hit = lines.find((l) => /^(tong )?cong ty\b|^ctcp\b/.test(normalize(l.text)));
  if (!hit) return undefined;
  // Cùng hàng với tên DN thường là "Mẫu số B01-DN", "Địa chỉ", "Mã số thuế" → cắt bỏ.
  const name = hit.text
    .replace(/\s+/g, " ")
    .split(/\s+(?=(?:M[ẫa]u s[ốo]|[ĐD][ịi]a ch[ỉi]|M[ãa] s[ốo])\s)/i)[0]
    .trim();
  return name.length > 120 ? name.slice(0, 120) : name;
}

function findFiscalYear(lines: SourceLine[]): number | undefined {
  const text = normalize(lines.slice(0, 80).map((l) => l.text).join(" "));
  const m =
    text.match(/31\s*(?:thang|\/|-)\s*12\s*(?:nam|\/|-)\s*(20\d{2})/) ??
    text.match(/nam tai chinh\s*(20\d{2})/) ??
    text.match(/\bnam\s*(20\d{2})\b/);
  return m ? Number(m[1]) : undefined;
}

function findUnit(lines: SourceLine[]): string | undefined {
  for (const l of lines) {
    const m = l.text.match(/[ĐđDd]ơn vị tính\s*:?\s*(.+)$/i) ?? l.text.match(/Don vi tinh\s*:?\s*(.+)$/i);
    if (m) return m[1].trim().slice(0, 40);
  }
  return undefined;
}

/** Dòng không chứa số tiền nào (chỉ chữ, STT, thuyết minh) – có thể là phần xuống dòng của tên chỉ tiêu. */
const hasAmount = (text: string) => text.split(/\s+/).some(isSeparatedAmount);

/**
 * Tên chỉ tiêu dài bị xuống dòng: trong PDF, số liệu thường căn giữa ô nên nằm ở dòng riêng,
 * phần chữ ở dòng trên / dưới. Ghép dòng có số với dòng liền kề (cùng trang) không có số tiền.
 */
function withContext(lines: SourceLine[]) {
  // Chỉ giữ phần chữ để tên chỉ tiêu ghép liền mạch ("chưa phân" + "phối"), bỏ mã số / số tiền.
  const words = (text: string) => text.split(/\s+/).filter((t) => !/\d/.test(t)).join(" ");
  return lines.map((l, i) => {
    const near = (j: number) => {
      const o = lines[j];
      return o && o.page === l.page && !hasAmount(o.text) ? words(o.text) : "";
    };
    const label = hasAmount(l.text) ? [near(i - 1), words(l.text), near(i + 1)].join(" ") : l.text;
    return { ...l, n: normalize(label) };
  });
}

export function parseFinancials(lines: SourceLine[]): ParsedFinancials {
  const norm = withContext(lines);
  const uncertainLabels: string[] = [];

  const fields: ExtractedField[] = SPECS.map((spec) => {
    let best: (ExtractedField & { score: number; uncertain: boolean }) | null = null;
    for (const l of norm) {
      if (!spec.match.test(l.n) || spec.exclude?.test(l.n)) continue;
      const hit = amountOnLine(l.text, spec.code);
      if (!hit) continue;
      // Ưu tiên dòng có đúng mã số; trong cùng mức ưu tiên lấy dòng xuất hiện trước.
      const score = hit.viaCode ? 2 : 1;
      if (!best || score > best.score) {
        best = { key: spec.key, label: spec.label, code: spec.code, value: hit.value, page: l.page, source: l.source, line: l.text.trim(), score, uncertain: hit.uncertain };
      }
    }
    if (!best) return { key: spec.key, label: spec.label, code: spec.code, value: null };
    if (best.uncertain) uncertainLabels.push(best.label);
    return { key: best.key, label: best.label, code: best.code, value: best.value, page: best.page, source: best.source, line: best.line };
  });

  const v = Object.fromEntries(fields.map((f) => [f.key, f.value])) as Record<FinKey, number | null>;
  const warnings: string[] = [];
  const missing = fields.filter((f) => f.value === null).map((f) => `${f.label} (mã ${f.code})`);
  if (missing.length) warnings.push(`Không tìm thấy: ${missing.join(", ")}.`);
  if (uncertainLabels.length) {
    warnings.push(`Số liệu có thể bị đọc sai cột (OCR): ${uncertainLabels.join(", ")} – đối chiếu với dòng gốc.`);
  }
  if (v.TA && v.TL !== null && v.EQ !== null) {
    const gap = Math.abs(v.TA - (v.TL + v.EQ)) / v.TA;
    if (gap > 0.01) warnings.push(`Tổng tài sản lệch Nợ phải trả + Vốn chủ sở hữu ${(gap * 100).toFixed(1)}% – kiểm tra lại số trích xuất.`);
  }
  if (v.TA && v.CA !== null && v.CA > v.TA) warnings.push("Tài sản ngắn hạn lớn hơn Tổng tài sản – kiểm tra lại số trích xuất.");
  if (v.TL && v.CL !== null && v.CL > v.TL) warnings.push("Nợ ngắn hạn lớn hơn Nợ phải trả – kiểm tra lại số trích xuất.");

  return {
    fields,
    companyName: findCompanyName(lines),
    fiscalYear: findFiscalYear(lines),
    unit: findUnit(lines),
    warnings,
  };
}
