import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PRIVATE_STAGES } from "@/lib/api";
import type { PrivateStage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProcessingPanel({
  stage,
  fileName,
  message,
  onCancel,
}: {
  stage: PrivateStage | null;
  fileName: string;
  message?: string | null;
  onCancel: () => void;
}) {
  const idx = stage ? PRIVATE_STAGES.findIndex((s) => s.id === stage) : -1;
  const pct = Math.round(((idx + 0.5) / PRIVATE_STAGES.length) * 100);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="truncate text-muted-foreground">Đang xử lý: <span className="font-medium text-foreground">{fileName}</span></span>
          <span className="font-mono tabular">{Math.max(pct, 0)}%</span>
        </div>
        <Progress value={Math.max(pct, 0)} aria-label="Tiến độ xử lý" />
      </div>

      <ol className="space-y-2" aria-live="polite">
        {PRIVATE_STAGES.map((s, i) => {
          const state = i < idx ? "done" : i === idx ? "running" : "pending";
          return (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                state === "running" && "border-primary/40 bg-primary/5",
                state === "pending" && "text-muted-foreground"
              )}
            >
              {state === "done" && <CheckCircle2 className="size-4 text-risk-safe" />}
              {state === "running" && <Loader2 className="size-4 animate-spin text-primary" />}
              {state === "pending" && <Circle className="size-4" />}
              <span className="flex-1">
                {s.label}
                {state === "running" && message && (
                  <span className="block text-[11px] text-muted-foreground" aria-live="polite">
                    {message}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {state === "done" ? "Hoàn tất" : state === "running" ? "Đang chạy…" : "Chờ"}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Huỷ & xoá tệp
        </Button>
      </div>
    </div>
  );
}
