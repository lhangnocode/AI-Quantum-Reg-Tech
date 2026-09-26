"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, FileText, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export const ACCEPTED = [".pdf", ".xlsx", ".xls"];
export const MAX_BYTES = 20 * 1024 * 1024;

export function validateFile(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ACCEPTED.includes(ext)) return `Định dạng ${ext || "không rõ"} không được hỗ trợ. Chỉ nhận PDF hoặc Excel (.xlsx, .xls).`;
  if (file.size > MAX_BYTES) return `Tệp ${formatBytes(file.size)} vượt giới hạn ${formatBytes(MAX_BYTES)}.`;
  if (file.size === 0) return "Tệp rỗng.";
  return null;
}

export function Dropzone({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    const err = validateFile(f);
    setError(err);
    onChange(err ? null : f);
  }

  if (file) {
    const Icon = file.name.toLowerCase().endsWith(".pdf") ? FileText : FileSpreadsheet;
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · sẵn sàng phân tích</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Bỏ chọn tệp" onClick={() => onChange(null)}>
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/40",
          error && "border-risk-distress/50"
        )}
      >
        <UploadCloud className={cn("size-8", dragging ? "text-primary" : "text-muted-foreground")} />
        <p className="text-sm font-medium">Kéo thả hồ sơ vào đây hoặc bấm để chọn tệp</p>
        <p className="text-xs text-muted-foreground">
          Báo cáo tài chính (PDF) hoặc bảng cân đối (Excel) · tối đa {formatBytes(MAX_BYTES)}
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        aria-label="Chọn tệp hồ sơ"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-risk-distress">
          {error}
        </p>
      )}
    </div>
  );
}
