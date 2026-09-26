import { ShieldCheck } from "lucide-react";
import { formatBytes, formatTime } from "@/lib/format";

/** Banner Zero-Retention: tệp gốc đã được xoá lúc HH:mm:ss. */
export function RetentionBanner({ deletedAt, fileName, fileSize }: { deletedAt: string; fileName: string; fileSize: number }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-risk-safe/30 bg-risk-safe/10 p-4">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-risk-safe" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">
          Zero-Retention: tệp gốc đã được xoá lúc <span className="font-mono">{formatTime(deletedAt)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {fileName} ({formatBytes(fileSize)}) · Không lưu bản sao · Chỉ giữ kết quả phân tích trong phiên làm việc này.
        </p>
      </div>
    </div>
  );
}
