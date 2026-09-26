import { ArrowLeftRight, ExternalLink, FileText, Newspaper, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import { ZONE_CLASS } from "@/lib/risk";
import type { EsgEvidence } from "@/lib/types";
import { cn } from "@/lib/utils";

function contradictionZone(score: number) {
  if (score >= 0.66) return { label: "Mâu thuẫn cao", cls: ZONE_CLASS.distress };
  if (score >= 0.33) return { label: "Mâu thuẫn vừa", cls: ZONE_CLASS.grey };
  return { label: "Mâu thuẫn thấp", cls: ZONE_CLASS.safe };
}

/** 2 cột "Doanh nghiệp tuyên bố" ↔ "Dữ liệu ngoại cảnh", kèm mức mâu thuẫn & nguồn. */
export function GreenwashingEvidence({ evidence }: { evidence: EsgEvidence[] }) {
  if (evidence.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-4 text-xs">
        <ShieldCheck className="size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Chưa có cặp bằng chứng đối chiếu</p>
          <p className="text-muted-foreground">
            Chưa ghi nhận mâu thuẫn giữa tuyên bố của doanh nghiệp và dữ liệu ngoại cảnh trong bộ dữ liệu mẫu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1fr_auto_1fr] gap-3 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase md:grid">
        <span>Doanh nghiệp tuyên bố</span>
        <span className="w-24 text-center">Mâu thuẫn (NLP)</span>
        <span>Dữ liệu ngoại cảnh</span>
      </div>
      {evidence.map((e, i) => {
        const z = contradictionZone(e.contradiction);
        return (
          <div key={i} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="flex items-start gap-2 text-xs">
                <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span>“{e.claim}”</span>
              </p>
              <p className="mt-1.5 pl-5.5 text-[11px] text-muted-foreground">{e.claimSource}</p>
            </div>

            <div className="flex w-full flex-row items-center justify-center gap-2 md:w-24 md:flex-col">
              <ArrowLeftRight className="size-4 text-muted-foreground" />
              <span className={cn("font-mono text-lg font-bold tabular", z.cls.text)}>{formatNumber(e.contradiction)}</span>
              <Badge variant="secondary" className={cn("h-auto px-2 py-0.5 text-[10px] font-semibold", z.cls.soft, z.cls.text)}>
                {z.label}
              </Badge>
            </div>

            <div className="rounded-lg border border-risk-distress/20 bg-risk-distress/5 p-3">
              <p className="flex items-start gap-2 text-xs">
                <Newspaper className="mt-0.5 size-3.5 shrink-0 text-risk-distress" />
                <span>{e.counter}</span>
              </p>
              <a
                href={e.counterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 pl-5.5 text-[11px] text-primary hover:underline"
              >
                {e.counterSource} <ExternalLink className="size-3" />
              </a>
            </div>

            <p className="text-[10px] text-muted-foreground md:col-span-3">Đối chiếu: {e.taxonomyRef}</p>
          </div>
        );
      })}
    </div>
  );
}
