// Tạo BCTC mẫu của các DOANH NGHIỆP GIẢ ĐỊNH để kiểm thử Cổng 2 (đọc PDF + OCR).
//   node scripts/make-sample-pdf.mjs          → tests/fixtures/bctc-mau-qrt-2024{,-scan}.pdf (+ .expected.json) – dùng cho e2e
//   node scripts/make-sample-pdf.mjs --demo   → demo/pdf/: 3 DN (Safe / Grey / Distress) × 3 dạng tệp + README.md đáp án
// Cần: npx playwright install chromium; font Noto Serif (hoặc Liberation Serif) có dấu tiếng Việt.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DISCLAIMER = "TÀI LIỆU MẪU – DOANH NGHIỆP VÀ SỐ LIỆU GIẢ ĐỊNH, CHỈ DÙNG ĐỂ KIỂM THỬ QUANTUMREGTECH";

// ---------- Kịch bản số liệu (VND). Chỉ tiêu tổng được CỘNG từ chỉ tiêu con → báo cáo luôn cân đối. ----------
const bs = (cur, prev = Math.round(cur * 0.93)) => ({ cur, prev });

const SCENARIOS = {
  qrt: {
    slug: "02-mau-qrt-grey",
    company: "CÔNG TY CỔ PHẦN THỰC PHẨM MẪU QRT",
    note: "Khá – vùng Grey",
    leaves: {
      cash: bs(98_341_225_004, 76_120_448_391), stInvest: bs(45_000_000_000, 30_000_000_000),
      receivables: bs(201_558_903_117, 188_432_009_215), inventory: bs(244_117_620_435, 229_771_106_340),
      otherCurrent: bs(23_432_569_664, 24_582_550_556),
      fixed: bs(701_884_110_352, 689_115_402_118), cip: bs(58_227_340_119, 41_870_225_006),
      ltInvest: bs(50_000_000_000, 50_000_000_000), otherLong: bs(35_001_455_300, 31_018_710_496),
      payables: bs(176_402_118_305, 160_224_907_551), stLoans: bs(158_990_000_000, 171_450_000_000),
      otherStLiab: bs(62_829_421_813, 55_210_338_104), ltLoans: bs(214_876_002_345, 238_100_000_000),
      capital: bs(500_000_000_000, 500_000_000_000), RE: bs(187_340_225_614, 142_516_961_440),
      grossRev: bs(2_031_118_450_902, 1_874_332_018_450), deductions: bs(44_614_333_512, 39_117_450_220),
      cogs: bs(1_502_337_901_884, 1_398_550_117_302), finIncome: bs(12_408_117_300, 9_870_225_118),
      finCost: bs(38_902_114_550, 41_225_870_331), interest: bs(31_448_917_006, 34_902_118_440),
      selling: bs(228_405_337_912, 211_004_558_906), admin: bs(87_114_020_771, 80_336_115_025),
      otherInc: bs(1_204_556_018, 980_117_402), otherExp: bs(452_085_373, 611_225_018), tax: bs(28_581_066_044, 24_220_531_870),
    },
  },
  anphat: {
    slug: "01-an-phat-safe",
    company: "CÔNG TY CỔ PHẦN SỮA VÀ ĐỒ UỐNG AN PHÁT (GIẢ ĐỊNH)",
    note: "Khoẻ – vùng Safe",
    leaves: {
      cash: bs(142_118_500_220), stInvest: bs(60_000_000_000, 45_000_000_000), receivables: bs(151_402_330_118),
      inventory: bs(150_227_604_501), otherCurrent: bs(16_251_565_161),
      fixed: bs(231_550_118_004), cip: bs(18_330_402_550), ltInvest: bs(20_000_000_000, 20_000_000_000), otherLong: bs(10_119_479_446),
      payables: bs(88_440_215_330), stLoans: bs(40_000_000_000, 52_000_000_000), otherStLiab: bs(21_559_784_670),
      ltLoans: bs(50_000_000_000, 64_000_000_000),
      capital: bs(300_000_000_000, 300_000_000_000), RE: bs(260_118_450_772),
      grossRev: bs(1_452_118_300_450), deductions: bs(51_004_118_220), cogs: bs(1_030_225_418_990),
      finIncome: bs(9_112_500_300), finCost: bs(8_440_117_225), interest: bs(6_902_118_004),
      selling: bs(152_338_004_118), admin: bs(71_004_330_227),
      otherInc: bs(2_104_558_302), otherExp: bs(903_118_440), tax: bs(29_870_441_118),
    },
  },
  binhminh: {
    slug: "03-binh-minh-distress",
    company: "CÔNG TY CỔ PHẦN NÔNG SẢN THỰC PHẨM BÌNH MINH (GIẢ ĐỊNH)",
    note: "Kiệt quệ – vùng Distress (lỗ luỹ kế, lỗ trước thuế)",
    leaves: {
      cash: bs(12_405_118_330), stInvest: bs(0, 0), receivables: bs(118_330_204_551), inventory: bs(150_118_402_330),
      otherCurrent: bs(19_146_274_789),
      fixed: bs(780_225_118_400), cip: bs(70_330_118_225), ltInvest: bs(20_000_000_000, 20_000_000_000), otherLong: bs(29_444_763_375),
      payables: bs(260_118_330_402), stLoans: bs(380_000_000_000), otherStLiab: bs(59_881_669_598), ltLoans: bs(280_000_000_000),
      capital: bs(350_000_000_000, 350_000_000_000), RE: bs(-180_118_402_330, -160_402_118_225),
      grossRev: bs(931_402_118_330), deductions: bs(31_118_402_225), cogs: bs(812_330_118_402),
      finIncome: bs(2_118_330_402), finCost: bs(102_330_118_225), interest: bs(95_118_402_330),
      selling: bs(30_118_402_118), admin: bs(22_402_118_330),
      otherInc: bs(5_102_330_118), otherExp: bs(402_118_330), tax: bs(0, 0),
    },
  },
};

const add = (...xs) => ({ cur: xs.reduce((s, x) => s + x.cur, 0), prev: xs.reduce((s, x) => s + x.prev, 0) });
const sub = (a, b) => ({ cur: a.cur - b.cur, prev: a.prev - b.prev });

function build(L) {
  const CA = add(L.cash, L.stInvest, L.receivables, L.inventory, L.otherCurrent);
  const NCA = add(L.fixed, L.cip, L.ltInvest, L.otherLong);
  const TA = add(CA, NCA);
  const CL = add(L.payables, L.stLoans, L.otherStLiab);
  const TL = add(CL, L.ltLoans);
  const EQ = sub(TA, TL);
  const devFund = sub(sub(EQ, L.capital), L.RE);
  const REV = sub(L.grossRev, L.deductions);
  const GP = sub(REV, L.cogs);
  const OP = sub(sub(sub(add(GP, L.finIncome), L.finCost), L.selling), L.admin);
  const OTHER = sub(L.otherInc, L.otherExp);
  const PBT = add(OP, OTHER);
  const NPAT = sub(PBT, L.tax);

  const balance = [
    ["TÀI SẢN", "", "", null, "h"],
    ["A. TÀI SẢN NGẮN HẠN", "100", "", CA, "b"],
    ["I. Tiền và các khoản tương đương tiền", "110", "V.01", L.cash],
    ["II. Đầu tư tài chính ngắn hạn", "120", "V.02", L.stInvest],
    ["III. Các khoản phải thu ngắn hạn", "130", "V.03", L.receivables],
    ["IV. Hàng tồn kho", "140", "V.04", L.inventory],
    ["V. Tài sản ngắn hạn khác", "150", "", L.otherCurrent],
    ["B. TÀI SẢN DÀI HẠN", "200", "", NCA, "b"],
    ["I. Tài sản cố định", "220", "V.05", L.fixed],
    ["II. Tài sản dở dang dài hạn", "240", "V.06", L.cip],
    ["III. Đầu tư tài chính dài hạn", "250", "V.02", L.ltInvest],
    ["IV. Tài sản dài hạn khác", "260", "", L.otherLong],
    ["TỔNG CỘNG TÀI SẢN", "270", "", TA, "b"],
    ["NGUỒN VỐN", "", "", null, "h"],
    ["C. NỢ PHẢI TRẢ", "300", "", TL, "b"],
    ["I. Nợ ngắn hạn", "310", "", CL, "b"],
    ["1. Phải trả người bán ngắn hạn", "311", "V.07", L.payables],
    ["2. Vay và nợ thuê tài chính ngắn hạn", "320", "V.08", L.stLoans],
    ["3. Các khoản nợ ngắn hạn khác", "319", "", L.otherStLiab],
    ["II. Nợ dài hạn", "330", "", L.ltLoans, "b"],
    ["1. Vay và nợ thuê tài chính dài hạn", "338", "V.08", L.ltLoans],
    ["D. VỐN CHỦ SỞ HỮU", "400", "V.09", EQ, "b"],
    ["I. Vốn chủ sở hữu", "410", "", EQ],
    ["1. Vốn góp của chủ sở hữu", "411", "", L.capital],
    ["2. Quỹ đầu tư phát triển", "418", "", devFund],
    ["3. Lợi nhuận sau thuế chưa phân phối", "421", "", L.RE],
    ["TỔNG CỘNG NGUỒN VỐN", "440", "", add(TL, EQ), "b"],
  ];
  const income = [
    ["1. Doanh thu bán hàng và cung cấp dịch vụ", "01", "VI.1", L.grossRev],
    ["2. Các khoản giảm trừ doanh thu", "02", "", L.deductions],
    ["3. Doanh thu thuần về bán hàng và cung cấp dịch vụ", "10", "", REV, "b"],
    ["4. Giá vốn hàng bán", "11", "VI.2", L.cogs],
    ["5. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ", "20", "", GP, "b"],
    ["6. Doanh thu hoạt động tài chính", "21", "VI.3", L.finIncome],
    ["7. Chi phí tài chính", "22", "VI.4", L.finCost],
    ["Trong đó: Chi phí lãi vay", "23", "", L.interest, "i"],
    ["8. Chi phí bán hàng", "25", "", L.selling],
    ["9. Chi phí quản lý doanh nghiệp", "26", "", L.admin],
    ["10. Lợi nhuận thuần từ hoạt động kinh doanh", "30", "", OP, "b"],
    ["11. Thu nhập khác", "31", "", L.otherInc],
    ["12. Chi phí khác", "32", "", L.otherExp],
    ["13. Lợi nhuận khác", "40", "", OTHER],
    ["14. Tổng lợi nhuận kế toán trước thuế", "50", "", PBT, "b"],
    ["15. Chi phí thuế TNDN hiện hành", "51", "VI.5", L.tax],
    ["16. Lợi nhuận sau thuế thu nhập doanh nghiệp", "60", "", NPAT, "b"],
  ];
  const fields = { CA: CA.cur, TA: TA.cur, CL: CL.cur, TL: TL.cur, EQ: EQ.cur, RE: L.RE.cur, Revenue: REV.cur, PBT: PBT.cur, Interest: L.interest.cur };
  return { balance, income, fields };
}

/** Z' (Altman 1983) – cùng công thức với src/lib/ocr/zprime.ts, để ghi đáp án. */
function zPrime(f) {
  const x = [(f.CA - f.CL) / f.TA, f.RE / f.TA, (f.PBT + f.Interest) / f.TA, f.EQ / f.TL, f.Revenue / f.TA];
  const z = 0.717 * x[0] + 0.847 * x[1] + 3.107 * x[2] + 0.42 * x[3] + 0.998 * x[4];
  return { x, z, zone: z > 2.9 ? "Safe" : z >= 1.23 ? "Grey" : "Distress" };
}

// ---------- HTML ----------
const vnd = (n) => (n < 0 ? `(${Math.abs(n).toLocaleString("de-DE")})` : n.toLocaleString("de-DE"));

const rows = (items) =>
  items
    .map(([name, code, note, v, kind]) =>
      kind === "h"
        ? `<tr class="h"><td colspan="5">${name}</td></tr>`
        : `<tr class="${kind ?? ""}"><td>${name}</td><td class="c">${code}</td><td class="c">${note}</td><td class="n">${v ? vnd(v.cur) : ""}</td><td class="n">${v ? vnd(v.prev) : ""}</td></tr>`
    )
    .join("");

const page = (company, form, title, subtitle, cols, items) => `
<section class="page">
  <div class="top">
    <div><b>${company}</b><br/>Địa chỉ: Số 1 Đường Mẫu, Quận Mẫu, TP. Mẫu</div>
    <div class="form">Mẫu số ${form}<br/><i>(Ban hành theo Thông tư số 200/2014/TT-BTC)</i></div>
  </div>
  <h1>${title}</h1>
  <p class="sub">${subtitle}</p>
  <p class="unit">Đơn vị tính: VND</p>
  <table>
    <thead><tr><th>Chỉ tiêu</th><th>Mã số</th><th>Thuyết minh</th><th>${cols[0]}</th><th>${cols[1]}</th></tr></thead>
    <tbody>${rows(items)}</tbody>
  </table>
  <p class="disc">${DISCLAIMER}</p>
</section>`;

const docHtml = (company, { balance, income }) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  body { margin: 0; font-family: "Noto Serif", "Liberation Serif", serif; color: #111; }
  .page { width: 210mm; height: 297mm; box-sizing: border-box; padding: 13mm 14mm 18mm; page-break-after: always; position: relative; overflow: hidden; }
  .top { display: flex; justify-content: space-between; font-size: 10.5pt; line-height: 1.45; }
  .top > div:first-child { max-width: 66%; }
  .form { text-align: center; }
  h1 { text-align: center; font-size: 14pt; margin: 6mm 0 1mm; }
  .sub { text-align: center; font-style: italic; margin: 0; font-size: 11pt; }
  .unit { text-align: right; font-style: italic; font-size: 10pt; margin: 3mm 0 2mm; }
  table { width: 100%; border-collapse: collapse; font-size: 9.8pt; }
  th:first-child { width: 43%; } th:nth-child(2) { width: 7%; } th:nth-child(3) { width: 9%; }
  th, td { border: 0.6pt solid #333; padding: 1.15mm 1.8mm; }
  th { background: #eee; }
  td.c { text-align: center; white-space: nowrap; } td.n { text-align: right; white-space: nowrap; }
  tr.b td { font-weight: 700; } tr.h td { font-weight: 700; text-align: center; background: #f6f6f6; }
  tr.i td:first-child { font-style: italic; padding-left: 8mm; }
  .disc { position: absolute; bottom: 10mm; left: 15mm; right: 15mm; text-align: center; font-size: 8.5pt; color: #666; border-top: 0.5pt solid #999; padding-top: 2mm; }
</style></head><body>
${page(company, "B01 - DN", "BẢNG CÂN ĐỐI KẾ TOÁN HỢP NHẤT", "Tại ngày 31 tháng 12 năm 2024", ["Số cuối năm", "Số đầu năm"], balance)}
${page(company, "B02 - DN", "BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH HỢP NHẤT", "Cho năm tài chính kết thúc ngày 31 tháng 12 năm 2024", ["Năm 2024", "Năm 2023"], income)}
</body></html>`;

// ---------- Xuất PDF ----------
/** PDF có lớp chữ (như xuất từ phần mềm kế toán). */
async function textPdf(browser, html, path) {
  const p = await browser.newPage();
  await p.setContent(html, { waitUntil: "load" });
  await p.pdf({ path, format: "A4", printBackground: true, preferCSSPageSize: true });
  await p.close();
}

/**
 * PDF chỉ có ảnh (bản scan). quality "clean" ≈ 200 dpi, "rough" ≈ 150 dpi + nghiêng + nhiễu + nén JPEG mạnh
 * (giống scan bằng máy văn phòng / chụp điện thoại).
 */
async function scanPdf(browser, html, path, quality) {
  const rough = quality === "rough";
  const shot = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: rough ? 1.6 : 2.2 });
  await shot.setContent(html, { waitUntil: "load" });
  const images = [];
  for (const el of await shot.locator("section.page").all()) {
    images.push((await el.screenshot({ type: "jpeg", quality: rough ? 55 : 82 })).toString("base64"));
  }
  await shot.close();
  const style = rough
    ? "transform:rotate(0.5deg) translate(1.5mm,1mm);filter:grayscale(1) contrast(1.15) brightness(0.96) blur(0.25px)"
    : "filter:grayscale(1) contrast(1.05)";
  // Nhiễu hạt tiêu cho bản "rough" (vẽ bằng canvas trong trang, seed cố định để tệp tái lập được).
  const noise = rough
    ? `<script>
      let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      document.querySelectorAll("canvas").forEach((c) => { const g = c.getContext("2d");
        for (let i = 0; i < 2600; i++) { g.fillStyle = "rgba(0,0,0," + (0.15 + rnd() * 0.35) + ")"; g.fillRect(rnd() * c.width, rnd() * c.height, 1 + rnd() * 1.5, 1 + rnd() * 1.5); } });
      </script>`
    : "";
  const scanHtml = `<!doctype html><html><head><style>@page{size:A4;margin:0}body{margin:0;background:#fff}
    .sheet{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;background:#f7f6f2}
    .sheet img{display:block;width:210mm;height:297mm;${style}}
    .sheet canvas{position:absolute;inset:0;width:210mm;height:297mm}</style></head><body>
    ${images.map((b) => `<div class="sheet"><img src="data:image/jpeg;base64,${b}"/>${rough ? '<canvas width="794" height="1123"></canvas>' : ""}</div>`).join("")}
    ${noise}</body></html>`;
  const s = await browser.newPage();
  await s.setContent(scanHtml, { waitUntil: "load" });
  await s.pdf({ path, format: "A4", printBackground: true, preferCSSPageSize: true });
  await s.close();
}

const fmt = (n) => n.toLocaleString("de-DE");
const fmtZ = (n) => n.toFixed(2).replace(".", ",");

const browser = await chromium.launch();
try {
  if (process.argv.includes("--demo")) {
    const OUT = join(ROOT, "demo", "pdf");
    mkdirSync(OUT, { recursive: true });
    const answers = {};
    const readme = [
      "# PDF demo – Cổng 2 (Nạp dữ liệu bảo mật)",
      "",
      "BCTC của **doanh nghiệp giả định** (không phải DN thật), sinh bằng `node scripts/make-sample-pdf.mjs --demo`.",
      "Mở http://localhost:3000/private → tải một tệp → tích cam kết → **Bắt đầu phân tích**, rồi so với đáp án dưới đây.",
      "",
      "| Dạng tệp | Kiểm tra gì |",
      "|---|---|",
      "| `*.pdf` | PDF có lớp chữ – đọc trực tiếp, không cần OCR (≈ 1–2 giây) |",
      "| `*-scan.pdf` | Bản scan sạch ~200 dpi – buộc OCR (≈ 5–7 giây) |",
      "| `*-scan-xau.pdf` | Bản scan xấu: ~150 dpi, nghiêng 0,5°, nhiễu hạt, nén JPEG mạnh – thử độ bền OCR; có thể thiếu / sai vài chỉ tiêu → app phải báo cảnh báo thay vì đoán |",
      "",
    ];
    for (const sc of Object.values(SCENARIOS)) {
      const data = build(sc.leaves);
      const html = docHtml(sc.company, data);
      await textPdf(browser, html, join(OUT, `${sc.slug}.pdf`));
      await scanPdf(browser, html, join(OUT, `${sc.slug}-scan.pdf`), "clean");
      await scanPdf(browser, html, join(OUT, `${sc.slug}-scan-xau.pdf`), "rough");
      const zp = zPrime(data.fields);
      answers[sc.slug] = { company: sc.company, fields: data.fields, zPrime: Number(zp.z.toFixed(4)), zone: zp.zone };
      console.log(`✓ ${sc.slug}: Z' = ${fmtZ(zp.z)} (${zp.zone})`);
      readme.push(
        `## ${sc.slug} – ${sc.note}`,
        "",
        `**${sc.company}** · Z' ≈ **${fmtZ(zp.z)} → ${zp.zone}** · X1–X5 = ${zp.x.map((v) => v.toFixed(3).replace(".", ",")).join(" · ")}`,
        "",
        "| Chỉ tiêu | Mã số | Giá trị đúng (VND) |",
        "|---|---|---|",
        ...[
          ["Tài sản ngắn hạn", "100", "CA"], ["Tổng cộng tài sản", "270", "TA"], ["Nợ ngắn hạn", "310", "CL"],
          ["Nợ phải trả", "300", "TL"], ["Vốn chủ sở hữu", "400", "EQ"], ["LNST chưa phân phối", "421", "RE"],
          ["Doanh thu thuần", "10", "Revenue"], ["Tổng LN kế toán trước thuế", "50", "PBT"], ["Chi phí lãi vay", "23", "Interest"],
        ].map(([label, code, k]) => `| ${label} | ${code} | ${fmt(data.fields[k])} |`),
        ""
      );
    }
    writeFileSync(join(OUT, "README.md"), readme.join("\n"));
    writeFileSync(join(OUT, "expected.json"), JSON.stringify(answers, null, 2) + "\n");
    console.log("✓ demo/pdf/README.md (đáp án)");
  } else {
    const OUT = join(ROOT, "tests", "fixtures");
    mkdirSync(OUT, { recursive: true });
    const sc = SCENARIOS.qrt;
    const data = build(sc.leaves);
    const html = docHtml(sc.company, data);
    await textPdf(browser, html, join(OUT, "bctc-mau-qrt-2024.pdf"));
    await scanPdf(browser, html, join(OUT, "bctc-mau-qrt-2024-scan.pdf"), "clean");
    writeFileSync(
      join(OUT, "bctc-mau-qrt-2024.expected.json"),
      JSON.stringify({ company: sc.company, fiscalYear: 2024, unit: "VND", fields: data.fields }, null, 2) + "\n"
    );
    console.log("✓ tests/fixtures/bctc-mau-qrt-2024{,-scan}.pdf", data.fields);
  }
} finally {
  await browser.close();
}
