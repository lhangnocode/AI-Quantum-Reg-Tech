"use client";

import { useRef, useState } from "react";
import { ArrowRight, FileDown, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { analyzePrivate } from "@/lib/api";
import type { PrivateAnalysis, PrivateStage } from "@/lib/types";
import { Dropzone } from "./Dropzone";
import { PrivateResult } from "./PrivateResult";
import { ProcessingPanel } from "./ProcessingPanel";
import { RetentionBanner } from "./RetentionBanner";
import { StepperHeader } from "./StepperHeader";

type Status = "idle" | "processing" | "done" | "deleted";
const STEP_INDEX: Record<Status, number> = { idle: 0, processing: 1, done: 2, deleted: 4 };

/** Luồng Cổng 2: idle → processing → done → deleted. */
export function UploadStepper() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<PrivateStage | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<PrivateAnalysis | null>(null);
  // Chỉ giữ metadata để hiển thị nhật ký xoá – nội dung tệp bị bỏ ngay sau khi xử lý.
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function start() {
    if (!file || !consent) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setFileMeta({ name: file.name, size: file.size });
    setStatus("processing");
    try {
      const res = await analyzePrivate(file, {
        onStage: (s) => {
          setStage(s);
          setProgress(null);
        },
        onProgress: setProgress,
        signal: controller.signal,
      });
      setResult(res);
      setFile(null); // Zero-Retention: bỏ tham chiếu tệp gốc
      setStatus("done");
    } catch (err) {
      setFile(null);
      setStatus("idle");
      const name = (err as Error).name;
      if (name === "AbortError") toast.info("Đã huỷ phân tích và xoá tệp khỏi phiên.");
      else if (name === "PasswordException") toast.error("PDF có mật khẩu – hãy gỡ mật khẩu rồi tải lên lại.");
      else if (name === "InvalidPDFException") toast.error("Tệp PDF bị hỏng hoặc không hợp lệ.");
      else toast.error("Phân tích thất bại. Vui lòng thử lại.");
    } finally {
      setStage(null);
      setProgress(null);
      abortRef.current = null;
    }
  }

  function reset() {
    setStatus("idle");
    setFile(null);
    setConsent(false);
    setResult(null);
    setFileMeta(null);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 shadow-sm print:hidden">
        <StepperHeader current={STEP_INDEX[status]} />
      </div>

      {status === "idle" && (
        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold">1. Tải lên hồ sơ</h3>
            <p className="text-xs text-muted-foreground">
              Báo cáo tài chính (mẫu B01-DN, B02-DN) của doanh nghiệp chưa niêm yết. PDF có lớp chữ hoặc PDF scan đều được – trang
              scan sẽ được nhận dạng ký tự (OCR) ngay trên trình duyệt.
            </p>
          </div>
          <Dropzone file={file} onChange={setFile} />
          <div className="flex items-start gap-2.5 rounded-lg bg-muted/40 p-3">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <Label htmlFor="consent" className="text-xs leading-relaxed font-normal">
              Tôi cam kết có quyền cung cấp hồ sơ này và đồng ý để hệ thống xử lý theo chính sách Zero-Retention: tệp gốc
              bị xoá ngay sau khi phân tích, không lưu bản sao.
            </Label>
          </div>
          <div className="flex justify-end">
            <Button disabled={!file || !consent} onClick={start}>
              Bắt đầu phân tích <ArrowRight />
            </Button>
          </div>
        </section>
      )}

      {status === "processing" && fileMeta && (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">2. Xử lý</h3>
          <ProcessingPanel stage={stage} fileName={fileMeta.name} message={progress} onCancel={() => abortRef.current?.abort()} />
        </section>
      )}

      {(status === "done" || status === "deleted") && result && fileMeta && (
        <>
          {status === "deleted" && <RetentionBanner deletedAt={result.deletedAt} fileName={fileMeta.name} fileSize={fileMeta.size} />}

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm print:hidden">
            <p className="text-sm">
              <span className="font-semibold">{status === "done" ? "3. Kết quả" : "4. Hoàn tất"}</span>
              <span className="text-muted-foreground">
                {status === "done"
                  ? " · Xem kết quả, sau đó xác nhận kết thúc phiên."
                  : " · Có thể tải báo cáo hoặc phân tích hồ sơ khác."}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {status === "done" ? (
                <Button onClick={() => setStatus("deleted")}>
                  <Trash2 /> Xác nhận xoá dữ liệu gốc
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw /> Phân tích hồ sơ khác
                  </Button>
                  <Button onClick={() => window.print()}>
                    <FileDown /> Tải báo cáo (PDF)
                  </Button>
                </>
              )}
            </div>
          </section>

          <PrivateResult result={result} />
        </>
      )}
    </div>
  );
}
