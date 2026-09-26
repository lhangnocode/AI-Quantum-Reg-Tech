"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Icon (i) kèm tooltip giải thích – mỗi con số rủi ro đều có tooltip (UI_DESIGN §1). */
export function InfoTip({ children, label = "Giải thích" }: { children: React.ReactNode; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button type="button" aria-label={label} className="inline-flex text-muted-foreground hover:text-foreground">
            <Info className="size-3.5" />
          </button>
        }
      />
      <TooltipContent className="flex-col items-start">{children}</TooltipContent>
    </Tooltip>
  );
}
