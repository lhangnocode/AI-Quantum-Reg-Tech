import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "safe" | "grey" | "distress";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    safe: "bg-risk-safe/10 text-risk-safe",
    grey: "bg-risk-grey/10 text-risk-grey",
    distress: "bg-risk-distress/10 text-risk-distress",
  }[tone];

  return (
    <Card className="flex-row items-center gap-4 rounded-2xl p-4 shadow-sm ring-border">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", toneClass)}>
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-lg leading-tight font-bold tabular">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );
}
