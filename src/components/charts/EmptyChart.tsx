import { Database } from "lucide-react";
import { cn } from "@/lib/utils";

/** Trạng thái rỗng cho biểu đồ khi số liệu còn TODO. */
export function EmptyChart({ title, hint, className }: { title: string; hint?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed bg-muted/30 p-6 text-center",
        className
      )}
    >
      <Database className="size-5 text-muted-foreground" />
      <p className="text-xs font-medium">{title}</p>
      {hint && <p className="max-w-xs text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
