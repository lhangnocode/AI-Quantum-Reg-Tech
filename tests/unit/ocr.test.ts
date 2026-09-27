import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { itemsToLines } from "@/lib/ocr/extract-pdf";
import { normalize, parseAmount, parseFinancials, type SourceLine } from "@/lib/ocr/parse-financials";
import { computeZPrime } from "@/lib/ocr/zprime";

const FIX = "tests/fixtures/bctc-mau-qrt-2024";
const expected = JSON.parse(readFileSync(`${FIX}.expected.json`, "utf8")) as {
  company: string;
  fiscalYear: number;
  fields: Record<string, number>;
};

/** Đọc lớp chữ PDF trong Node bằng bản legacy của pdf.js – cùng thuật toán gom dòng với trình duyệt. */
async function pdfLines(path: string): Promise<SourceLine[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)), useSystemFonts: false }).promise;
  const out: SourceLine[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    itemsToLines(content.items as Parameters<typeof itemsToLines>[0]).forEach((text) => out.push({ page: p, text, source: "text" }));
  }
  return out;
}

describe("parseAmount", () => {
  it("số kiểu Việt, số âm trong ngoặc, OCR nhầm dấu phẩy", () => {
    expect(parseAmount("1.457.563.223.991")).toBe(1457563223991);
    expect(parseAmount("1,457,563,223,991")).toBe(1457563223991);
    expect(parseAmount("(452.085.373)")).toBe(-452085373);
    expect(parseAmount("612,45")).toBe(612.45);
    expect(parseAmount("1986.504.117390")).toBe(1986504117390); // OCR mất dấu phân cách
    expect(parseAmount("V.01")).toBeNull();
  });
  it("normalize bỏ dấu", () => {
    expect(normalize("Lợi nhuận sau thuế CHƯA PHÂN PHỐI")).toBe("loi nhuan sau thue chua phan phoi");
  });
});

describe("parseFinancials – PDF có lớp chữ", () => {
  it("trích đủ 9 chỉ tiêu, tên DN, năm, đơn vị", async () => {
    const parsed = parseFinancials(await pdfLines(`${FIX}.pdf`));
    const got = Object.fromEntries(parsed.fields.map((f) => [f.key, f.value]));
    expect(got).toEqual(expected.fields);
    expect(parsed.companyName).toBe(expected.company);
    expect(parsed.fiscalYear).toBe(2024);
    expect(parsed.unit).toBe("VND");
    expect(parsed.warnings).toEqual([]);
  });
});

describe("parseFinancials – dòng kiểu OCR", () => {
  // Mô phỏng lỗi OCR thường gặp: mất dấu, dấu phẩy thay dấu chấm, tên chỉ tiêu xuống dòng, cột bị dồn.
  const ocr = (text: string, page = 1): SourceLine => ({ page, text, source: "ocr" });
  const lines = [
    ocr("CONG TY CO PHAN THUC PHAM MAU QRT"),
    ocr("Tai ngay 31 thang 12 nam 2024"),
    ocr("A. TAI SAN NGAN HAN 400. 612,450,318,220 548,906,114,502"), // OCR đọc nhầm mã số 100 → 400
    ocr("V. Tai san ngan han khac 150 23.432.569.664 24.582.550.556"),
    ocr("TONG CONG TAI SAN 270 1.457.563.223.991 1.360.910.452.122"),
    ocr("C. NO PHAI TRA 300 613.097.542.463 624.985.245.655"),
    ocr("I. No ngan han 310 398.221.540.118 386.885.245.655"),
    ocr("3. Cac khoan no ngan han khac 319 62.829.421.813 55.210.338.104"),
    ocr("D. VON CHU SO HUU 400 V.09 844.465.681.528 735.925.206.467"),
    ocr("3. Loi nhuan sau thue chua phan 421 187.340.225.614 142.516.961.440"),
    ocr("phoi"),
    ocr("3. Doanh thu thuan ve ban hang va cung", 2),
    ocr("10 1986.504.117390 1.835.214.568.230", 2), // OCR đọc lệch dấu phân cách – không được lấy nhầm cột năm trước
    ocr("cap dich vu", 2),
    ocr("6. Doanh thu hoat dong tai chinh 21 VI.3 12.408.117.300 9.870.225.118", 2),
    ocr("Trong do: Chi phi lai vay 23 31.448.917.006 34.902.118.440", 2),
    ocr("14. Tong loi nhuan ke toan truoc thue 50 142.905.330.218 114.337.024.168", 2),
  ];

  it("vẫn trích đúng", () => {
    const parsed = parseFinancials(lines);
    const got = Object.fromEntries(parsed.fields.map((f) => [f.key, f.value]));
    expect(got).toEqual(expected.fields);
    expect(parsed.fields.find((f) => f.key === "Revenue")?.page).toBe(2);
  });

  it("thiếu chỉ tiêu → cảnh báo, không đoán số", () => {
    const parsed = parseFinancials(lines.filter((l) => !/TONG CONG TAI SAN/.test(l.text)));
    expect(parsed.fields.find((f) => f.key === "TA")?.value).toBeNull();
    expect(parsed.warnings[0]).toMatch(/Không tìm thấy: Tổng cộng tài sản \(mã 270\)/);
    expect(computeZPrime(parsed.fields).z).toBe("TODO");
  });

  it("số năm nay bị OCR đọc hỏng → cảnh báo có thể lấy nhầm cột", () => {
    const bad = lines.map((l) => (/^Trong do/.test(l.text) ? ocr("Trong do: Chi phi lai vay 23 3I.44B,9I7.OO6 34.902.118.440", 2) : l));
    expect(parseFinancials(bad).warnings.join(" ")).toMatch(/đọc sai cột.*Chi phí lãi vay/);
  });

  it("số lệch cân đối → cảnh báo", () => {
    const bad = lines.map((l) => (/^C\. NO PHAI TRA/.test(l.text) ? ocr("C. NO PHAI TRA 300 713.097.542.463 1") : l));
    expect(parseFinancials(bad).warnings.join(" ")).toMatch(/lệch/);
  });
});

describe("computeZPrime", () => {
  it("Z' = 0,717X1 + 0,847X2 + 3,107X3 + 0,420X4 + 0,998X5, vùng theo ngưỡng Z'", () => {
    const f = expected.fields;
    const z = computeZPrime(
      Object.entries(f).map(([key, value]) => ({ key: key as never, label: key, code: "", value }))
    );
    const x1 = (f.CA - f.CL) / f.TA, x2 = f.RE / f.TA, x3 = (f.PBT + f.Interest) / f.TA, x4 = f.EQ / f.TL, x5 = f.Revenue / f.TA;
    expect(z.x1).toBeCloseTo(x1, 10);
    expect(z.x4).toBeCloseTo(x4, 10);
    expect(z.z).toBeCloseTo(0.717 * x1 + 0.847 * x2 + 3.107 * x3 + 0.42 * x4 + 0.998 * x5, 10);
    expect(z.z).toBeCloseTo(2.52, 2);
    expect(z.zone).toBe("grey");
    expect(z.rfinBase).toBe("TODO"); // Phụ lục B chưa quy định RFin,Base cho vùng Grey
  });
});
