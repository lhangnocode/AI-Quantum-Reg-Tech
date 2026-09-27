// Trích các dòng chữ từ PDF ngay trong trình duyệt – tệp không rời khỏi máy người dùng.
// Trang có lớp chữ → đọc trực tiếp (pdf.js); trang ảnh scan → render rồi OCR (Tesseract, tiếng Việt).
// Chỉ dùng phía client: được import động từ api.ts.
import type { SourceLine } from "./parse-financials";

const VENDOR = "/vendor";
/** Số trang tối đa được xử lý (BCTC: bảng CĐKT + KQKD thường nằm ở vài trang đầu). */
export const MAX_PAGES = 12;
/** Trang có ít hơn số ký tự này được coi là ảnh scan → OCR. */
const MIN_TEXT_CHARS = 40;
/** Độ phóng khi render trang để OCR (~200 dpi). */
const OCR_SCALE = 2.8;

export interface PdfExtraction {
  lines: SourceLine[];
  pages: number;
  processedPages: number;
  ocrPages: number[];
}

interface Options {
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Đã huỷ", "AbortError");
}

interface TextItemLike {
  str: string;
  transform: number[];
  width?: number;
}

/** Gom các mảnh chữ của pdf.js thành dòng theo toạ độ y, sắp xếp theo x. */
export function itemsToLines(items: TextItemLike[]): string[] {
  const rows: { y: number; parts: { x: number; s: string }[] }[] = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) < 3);
    if (!row) rows.push((row = { y, parts: [] }));
    row.parts.push({ x, s: it.str });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) => r.parts.sort((a, b) => a.x - b.x).map((p) => p.s.trim()).join(" "))
    .filter(Boolean);
}

/**
 * Xoá đường kẻ bảng trước khi OCR: đường kẻ ô làm Tesseract phân tích bố cục sai (dòng chữ bị cắt vụn).
 * Hàng / cột có tỉ lệ điểm tối rất cao so với chiều dài trang được coi là đường kẻ và tô trắng.
 */
function removeTableLines(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    dark[i] = g < 150 ? 1 : 0;
  }
  const whiten = (i: number) => {
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 255;
  };
  // Đường ngang: một hàng pixel có đoạn tối liên tục dài ≥ 25% bề rộng trang.
  const minRun = Math.floor(w * 0.25);
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x <= w; x++) {
      if (x < w && dark[y * w + x]) run++;
      else {
        if (run >= minRun) for (let k = x - run; k < x; k++) whiten(y * w + k);
        run = 0;
      }
    }
  }
  // Đường dọc: một cột pixel có đoạn tối liên tục dài ≥ 12% chiều cao trang.
  const minCol = Math.floor(h * 0.12);
  for (let x = 0; x < w; x++) {
    let run = 0;
    for (let y = 0; y <= h; y++) {
      if (y < h && dark[y * w + x]) run++;
      else {
        if (run >= minCol) for (let k = y - run; k < y; k++) whiten(k * w + x);
        run = 0;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

export async function extractPdfLines(file: File, { onProgress, signal }: Options = {}): Promise<PdfExtraction> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${VENDOR}/pdfjs/pdf.worker.min.mjs`;

  onProgress?.("Đang mở tệp PDF…");
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${VENDOR}/pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${VENDOR}/pdfjs/standard_fonts/`,
    wasmUrl: `${VENDOR}/pdfjs/wasm/`,
    enableXfa: false,
  });
  const doc = await task.promise;
  const pageCount = doc.numPages;

  let worker: import("tesseract.js").Worker | null = null;
  const lines: SourceLine[] = [];
  const ocrPages: number[] = [];
  const total = Math.min(pageCount, MAX_PAGES);

  try {
    for (let p = 1; p <= total; p++) {
      checkAbort(signal);
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const textLines = itemsToLines(content.items as TextItemLike[]);

      if (textLines.join("").replace(/\s/g, "").length >= MIN_TEXT_CHARS) {
        onProgress?.(`Trang ${p}/${total}: đọc lớp chữ`);
        textLines.forEach((text) => lines.push({ page: p, text, source: "text" }));
        page.cleanup();
        continue;
      }

      // Trang ảnh scan → OCR.
      onProgress?.(`Trang ${p}/${total}: nhận dạng ký tự (OCR)…`);
      const viewport = page.getViewport({ scale: OCR_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport, background: "#ffffff" }).promise;
      checkAbort(signal);
      removeTableLines(canvas);

      if (!worker) {
        onProgress?.("Đang tải mô hình OCR tiếng Việt…");
        const { createWorker, OEM } = await import("tesseract.js");
        worker = await createWorker("vie", OEM.LSTM_ONLY, {
          workerPath: `${VENDOR}/tesseract/worker.min.js`,
          corePath: `${VENDOR}/tesseract/core`,
          langPath: `${VENDOR}/tesseract/lang`,
          gzip: true,
        });
        // Giữ khoảng trắng giữa các cột số của bảng.
        await worker.setParameters({ preserve_interword_spaces: "1" });
      }
      onProgress?.(`Trang ${p}/${total}: nhận dạng ký tự (OCR)…`);
      const { data } = await worker.recognize(canvas);
      data.text
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((text) => lines.push({ page: p, text, source: "ocr" }));
      ocrPages.push(p);

      // Giải phóng ảnh trang ngay sau khi OCR.
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
  } finally {
    await worker?.terminate();
    // Huỷ tài liệu + worker pdf.js → giải phóng dữ liệu tệp khỏi bộ nhớ.
    await task.destroy();
  }

  return { lines, pages: pageCount, processedPages: total, ocrPages };
}
