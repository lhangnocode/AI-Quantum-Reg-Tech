"use client";

import { ArrowDown, ArrowUp, Check, Minus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { peerAverage, PILLARS, pillarDisclosure, rankInPeers } from "@/lib/esg";
import { formatNumber } from "@/lib/format";
import type { EsgIndicator, EsgIndicatorSet, Ticker } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Thanh tỉ lệ có vạch trung bình nhóm – nhãn số luôn hiển thị (không dựa vào màu). */
function Meter({ label, value, total, peer }: { label: string; value: number; total: number; peer: number }) {
  const pct = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <div className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <div
        className="relative h-2 rounded-full bg-muted"
        role="img"
        aria-label={`${label}: ${value}/${total}, trung bình nhóm ${formatNumber(peer, 1)}`}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: pct(value) }} />
        <span
          className="absolute -inset-y-0.5 w-0.5 rounded bg-foreground/60"
          style={{ left: `calc(${pct(peer)} - 1px)` }}
          title={`Trung bình 4 DN: ${formatNumber(peer, 1)}/${total}`}
        />
      </div>
      <span className="text-right font-mono font-semibold tabular">
        {value}/{total}
      </span>
    </div>
  );
}

function Value({ indicator, value }: { indicator: EsgIndicator; value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">Chưa công bố</span>;
  }
  if (indicator.type === "bool") {
    return value === 1 ? (
      <span className="inline-flex items-center gap-1 font-medium">
        <Check className="size-3.5 text-primary" /> Có
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <X className="size-3.5" /> Không
      </span>
    );
  }
  return (
    <span className="font-mono tabular">
      {formatNumber(value, Number.isInteger(value) || Math.abs(value) >= 1000 ? 0 : 2)}
      {indicator.unit && <span className="ml-1 font-sans text-muted-foreground">{indicator.unit}</span>}
    </span>
  );
}

/**
 * Mức độ công bố ESG của 1 DN theo trụ cột E / S / G – dữ liệu công bố thật (sheet ESG_ChiTieu),
 * so với nhóm 4 DN. Không phải điểm ESG: chỉ đếm thực hành đang áp dụng và số liệu đã công bố.
 */
export function EsgDisclosure({ set, ticker, peers }: { set: EsgIndicatorSet; ticker: Ticker; peers: Ticker[] }) {
  const vals = set.values[ticker];
  if (!vals) {
    return <p className="text-xs text-muted-foreground">Chưa có dữ liệu chỉ tiêu ESG công bố cho {ticker}.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground">
          Mức độ công bố {set.year} · vạch đen = trung bình {peers.length} DN
        </p>
        {PILLARS.map(({ key, label }) => {
          const d = pillarDisclosure(set, ticker, key);
          const avg = peerAverage(set, peers, key);
          return (
            <div key={key} className="space-y-1.5">
              <p className="text-xs font-semibold">{label}</p>
              <Meter label="Thực hành áp dụng" value={d.practicesYes} total={d.practicesTotal} peer={avg.practicesYes} />
              <Meter label="Số liệu định lượng" value={d.quantDisclosed} total={d.quantTotal} peer={avg.quantDisclosed} />
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="E" className="gap-2">
        <TabsList>
          {PILLARS.map(({ key }) => (
            <TabsTrigger key={key} value={key} className="px-3 text-xs">
              Chỉ tiêu {key}
            </TabsTrigger>
          ))}
        </TabsList>
        {PILLARS.map(({ key }) => (
          <TabsContent key={key} value={key}>
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Chỉ tiêu</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead className="text-right">Hạng / {peers.length} DN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {set.indicators
                  .filter((i) => i.pillar === key)
                  .map((i) => {
                    const r = rankInPeers(set, i, ticker, peers);
                    const Dir = i.polarity === 1 ? ArrowUp : ArrowDown;
                    return (
                      <TableRow key={i.code}>
                        <TableCell className="max-w-[16rem] whitespace-normal">
                          <span className="mr-1.5 font-mono text-[10px] text-muted-foreground">{i.code}</span>
                          {i.name}
                          {!i.use && (
                            <Badge
                              variant="outline"
                              className="ml-1.5 h-auto px-1.5 py-0 text-[9px]"
                              title="Không dùng khi tính điểm ESG vì thiên vị quy mô doanh nghiệp"
                            >
                              Tham khảo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Value indicator={i} value={vals[i.code]} />
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {r ? (
                            <span
                              className={cn("inline-flex items-center gap-1 font-mono tabular", r.rank === 1 && "font-semibold text-primary")}
                              title={i.polarity === 1 ? "Cao hơn là tốt" : "Thấp hơn là tốt"}
                            >
                              <Dir className="size-3" />
                              {r.rank}/{r.of}
                            </span>
                          ) : (
                            <span
                              className="inline-flex"
                              title={
                                i.type === "number" && i.sizeDependent
                                  ? "Số tuyệt đối phụ thuộc quy mô doanh nghiệp – không xếp hạng trực tiếp"
                                  : "Không xếp hạng"
                              }
                            >
                              <Minus className="size-3 text-muted-foreground" aria-label="Không xếp hạng" />
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-[10px] text-muted-foreground">
        Nguồn: {set.source}. Đây là mức độ công bố, không phải điểm ESG – điểm trụ cột chờ phương pháp chấm điểm của nhóm.
      </p>
    </div>
  );
}
