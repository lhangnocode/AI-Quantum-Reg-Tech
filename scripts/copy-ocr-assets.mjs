// Chép tài nguyên OCR từ node_modules → public/vendor (tự host, không gọi CDN lúc chạy).
// Chạy: npm run assets (tự chạy sau install và trước dev / build). Thư mục public/vendor không commit.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NM = join(ROOT, "node_modules");
const OUT = join(ROOT, "public", "vendor");

function copy(from, to) {
  const src = join(NM, from);
  if (!existsSync(src)) throw new Error(`Thiếu ${from} – chạy npm install`);
  mkdirSync(dirname(join(OUT, to)), { recursive: true });
  cpSync(src, join(OUT, to), { recursive: true });
}

rmSync(OUT, { recursive: true, force: true });

// pdf.js – worker, bộ giải mã ảnh WASM (JBIG2/JPX trong PDF scan), cmaps & font chuẩn.
copy("pdfjs-dist/build/pdf.worker.min.mjs", "pdfjs/pdf.worker.min.mjs");
copy("pdfjs-dist/wasm", "pdfjs/wasm");
copy("pdfjs-dist/cmaps", "pdfjs/cmaps");
copy("pdfjs-dist/standard_fonts", "pdfjs/standard_fonts");

// Tesseract – worker, lõi WASM (chỉ bản LSTM), mô hình tiếng Việt (best_int: nhỏ, chính xác).
copy("tesseract.js/dist/worker.min.js", "tesseract/worker.min.js");
for (const f of readdirSync(join(NM, "tesseract.js-core")).filter((f) => /-lstm\.wasm\.js$/.test(f))) {
  copy(`tesseract.js-core/${f}`, `tesseract/core/${f}`);
}
copy("@tesseract.js-data/vie/4.0.0_best_int/vie.traineddata.gz", "tesseract/lang/vie.traineddata.gz");

console.log("✓ Tài nguyên OCR → public/vendor");
