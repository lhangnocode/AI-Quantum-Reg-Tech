import { Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Badge cổng dữ liệu: Cổng 1 (công khai) / Cổng 2 (bảo mật). */
export function GatewayBadge({ gateway, className }: { gateway: 1 | 2; className?: string }) {
  return gateway === 1 ? (
    <Badge variant="secondary" className={cn("h-auto bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary", className)}>
      <Globe /> Cổng 1 · Công khai
    </Badge>
  ) : (
    <Badge variant="secondary" className={cn("h-auto bg-foreground/5 px-2 py-0.5 text-[11px] font-semibold text-foreground", className)}>
      <Lock /> Cổng 2 · Bảo mật
    </Badge>
  );
}
