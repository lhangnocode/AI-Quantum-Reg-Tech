import { Badge } from "@/components/ui/badge";
import { ZONE_CLASS, ZONE_LABEL } from "@/lib/risk";
import type { AltmanZone } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Badge vùng Altman – màu luôn đi kèm nhãn chữ. */
export function ZoneBadge({ zone, className }: { zone: AltmanZone; className?: string }) {
  const c = ZONE_CLASS[zone];
  return (
    <Badge variant="secondary" className={cn("h-auto px-2 py-0.5 text-[10px] font-bold", c.soft, c.text, className)}>
      {ZONE_LABEL[zone]}
    </Badge>
  );
}
