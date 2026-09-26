import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const STEPS = ["Tải lên", "Xử lý", "Kết quả", "Xoá dữ liệu"] as const;

/** Thanh 4 bước; `current` tính từ 0. */
export function StepperHeader({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Tiến trình Cổng 2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary text-primary ring-4 ring-primary/15",
                !done && !active && "text-muted-foreground"
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("hidden text-xs font-medium sm:inline", !active && !done && "text-muted-foreground")}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={cn("h-px flex-1 bg-border", done && "bg-primary")} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
