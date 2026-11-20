"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Play } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber } from "@/lib/format";
import { formatOsintPeriod, getOsintPeriod } from "@/lib/osint-period";

type Status = "Needs review" | "Verified" | "Rejected" | "Already in assessment";
type Finding = {
  ticker: string; title: string; source: string; url: string; sourceProvider?: string; searchCategory?: string; readerProvider?: string;
  status: Status; reviewed?: boolean; penaltyLevel?: number; acceptedLevel?: number; excerpt?: string; publishedAt?: string; eventDate?: string;
  alreadyInAssessment?: boolean;
  agentClaim?: { quote: string; authority: string; amountText: string; quoteVerified: boolean };
  aiProposal?: { related: boolean; eventType: string; severity: number | null; confidence: number; evidenceQuote: string; rationale: string };
};
type ScanPayload = {
  mode?: string;
  from_date?: string;
  to_date?: string;
  warnings?: string[];
  findings?: Finding[];
  workflow?: string[];
  providers?: string[];
  duration_ms?: number;
  graph?: { available?: boolean; matched_tickers?: string[] };
  search?: { runs?: Array<{ status?: string }>; credits_used?: number; pages_read?: number; agent_quotes_verified?: number; prompts?: Record<string, string> };
  ai?: { mode?: string; provider?: string; model?: string; proposal_count?: number; validated_quote_count?: number; warning?: string };
};

const CATEGORY: Record<string, string> = { tax: "Thuế", environment: "Môi trường", securities: "Chứng khoán", administrative: "Hành chính", other: "Khác" };
const LEVELS = [1, 2, 3] as const;
const POLL_MS = 3000;
const MAX_WAIT_MS = 10 * 60 * 1000; // Firecrawl Agent thường mất vài phút; dừng chờ ở phía trình duyệt sau 10 phút.
const LOOKBACK_OPTIONS = [6, 12, 24, 36, 60] as const;

/** Mức người duyệt đã chấp nhận cao nhất (0 nếu không có). */
export function acceptedLevel(findings: { status: string; acceptedLevel?: number }[]) {
  return findings.reduce((max, f) => (f.status === "Verified" ? Math.max(max, f.acceptedLevel ?? 0) : max), 0);
}

/**
 * Quét OSINT trong khoảng ngày đã chọn bằng Firecrawl Agent. Sự kiện mới chỉ là ứng viên: người dùng mở
 * nguồn, chọn mức 1–3 rồi chấp nhận. P_OSINT = bảng Params theo mức cao nhất (sự kiện đã duyệt trong bộ dữ liệu
 * và sự kiện vừa chấp nhận), không cộng dồn. Kết quả chỉ dùng trong phiên, chưa ghi vào hồ sơ.
 */
export function OsintScanner({ ticker, fromDate, toDate, rfinBase, workbookLevel, penaltyTable, existingUrls = [], onAcceptedLevel }: {
  ticker: string;
  fromDate: string;
  toDate: string;
  rfinBase: number;
  /** Mức cao nhất của sự kiện đã duyệt trong workbook cho năm này. */
  workbookLevel: number;
  /** Params: mức → P_OSINT. */
  penaltyTable: Record<string, number>;
  existingUrls?: string[];
  onAcceptedLevel?: (ticker: string, level: number) => void;
}) {
  const [lookbackMonths, setLookbackMonths] = useState(36);
  const [period, setPeriod] = useState({ fromDate, toDate });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [meta, setMeta] = useState<ScanPayload>({});
  const [elapsed, setElapsed] = useState(0);
  const cancelled = useRef(false);
  // Đặt lại cờ khi mount: React StrictMode (dev) mount → unmount → mount, nếu không reset thì cờ kẹt ở true
  // và vòng poll thoát ngay với "Đã rời trang".
  useEffect(() => {
    cancelled.current = false;
    return () => { cancelled.current = true; };
  }, []);

  /** POST bắt đầu job; nếu backend trả scan_id thì hỏi trạng thái tới khi xong. Fallback workbook trả kết quả ngay. */
  async function runScan(): Promise<ScanPayload> {
    const response = await fetch("/api/osint/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tickers: [ticker], from_date: period.fromDate, to_date: period.toDate }) });
    const started = await response.json();
    if (!response.ok) throw new Error(started.error ?? "OSINT scan thất bại");
    if (!started.scan_id) return started;
    const t0 = Date.now();
    while (!cancelled.current) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      setElapsed(Math.round((Date.now() - t0) / 1000));
      const poll = await fetch(`/api/osint/scan/${started.scan_id}`, { cache: "no-store" });
      const job = await poll.json();
      if (!poll.ok) throw new Error(job.error ?? "Không đọc được trạng thái lượt quét.");
      if (job.status === "completed") return job.result;
      if (job.status === "failed") throw new Error(job.error ?? "OSINT scan thất bại.");
      if (Date.now() - t0 > MAX_WAIT_MS) throw new Error("Lượt quét chạy quá 10 phút; dừng chờ. Kiểm tra log backend.");
    }
    throw new Error("Đã rời trang.");
  }

  async function scan() {
    setBusy(true);
    setMessage("");
    setElapsed(0);
    try {
      const payload = await runScan();
      const existing = new Set(existingUrls.map(canonicalUrl));
      const next = (payload.findings ?? []).map((f) => existing.has(canonicalUrl(f.url)) && f.status === "Needs review"
        ? { ...f, status: "Already in assessment" as const, alreadyInAssessment: true }
        : f);
      setFindings(next);
      setMeta(payload);
      onAcceptedLevel?.(ticker, 0);
      const warnings = payload.warnings?.length ? ` ${payload.warnings.join(" ")}` : "";
      setMessage(payload.mode === "live"
        ? `Đã quét xong. Mở nguồn để xem chi tiết và xác nhận sự kiện.${warnings}`
        : `Hiện chưa kết nối được dịch vụ quét OSINT.${warnings}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể chạy OSINT scan.");
    } finally {
      setBusy(false);
    }
  }

  function review(index: number, status: Status, level?: number) {
    const next = findings.map((f, i) => (i === index ? { ...f, status, acceptedLevel: status === "Verified" ? level : undefined } : f));
    setFindings(next);
    onAcceptedLevel?.(ticker, acceptedLevel(next));
  }

  const accepted = acceptedLevel(findings);
  const level = Math.max(workbookLevel, accepted);
  const posintBefore = penaltyTable[String(workbookLevel)] ?? 0;
  const posintAfter = penaltyTable[String(level)] ?? 0;
  const live = findings.filter((f) => f.sourceProvider !== "workbook");
  const reviewed = findings.filter((f) => f.sourceProvider === "workbook");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{ticker} <span className="font-normal text-muted-foreground">· {formatOsintPeriod(period.fromDate, period.toDate)}</span></p>
          <p className="text-xs text-muted-foreground">{busy ? `Đang tìm sự kiện${elapsed ? ` · ${elapsed} giây` : ""}` : "Tìm quyết định xử phạt, truy thu và kết luận vi phạm."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(lookbackMonths)} onValueChange={(value) => {
            const months = Number(value);
            if (!LOOKBACK_OPTIONS.includes(months as typeof LOOKBACK_OPTIONS[number])) return;
            setLookbackMonths(months);
            setPeriod(getOsintPeriod(new Date(), months));
          }}>
            <SelectTrigger aria-label="Khoảng thời gian quét OSINT" className="w-36" disabled={busy}><SelectValue /></SelectTrigger>
            <SelectContent>
              {LOOKBACK_OPTIONS.map((months) => <SelectItem key={months} value={String(months)}>{months} tháng gần nhất</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={scan} disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : <Play />} {busy ? "Đang quét" : "Quét sự kiện"}
          </Button>
        </div>
      </div>
      {message && <p role="status" className="rounded-lg bg-muted px-3 py-2 text-xs">{message}</p>}
      {meta.workflow?.length ? <p className="text-xs text-muted-foreground">{live.length} sự kiện tìm thấy{meta.duration_ms != null ? ` · ${formatNumber(meta.duration_ms / 1000, 1)} giây` : ""}</p> : null}

      {live.map((finding) => {
        const index = findings.indexOf(finding);
        return <div key={`${finding.url}-${index}`} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{finding.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{finding.source}{finding.searchCategory ? ` · ${CATEGORY[finding.searchCategory] ?? finding.searchCategory}` : ""}{finding.publishedAt ? ` · ${finding.publishedAt}` : ""} · {finding.status === "Verified" ? `Đã chấp nhận mức ${finding.acceptedLevel}` : finding.status === "Rejected" ? "Đã bỏ" : finding.alreadyInAssessment ? "Đã có trong bộ dữ liệu" : "Chờ người dùng xác nhận"}</p>
            {finding.agentClaim && <div className="mt-2 rounded-md border border-dashed p-2 text-xs">
              <p className="font-medium">Firecrawl Agent ghi nhận{finding.agentClaim.authority ? ` · ${finding.agentClaim.authority}` : ""}{finding.agentClaim.amountText ? ` · ${finding.agentClaim.amountText} (theo nguồn)` : ""} · {finding.readerProvider ? (finding.agentClaim.quoteVerified ? "quote có trong trang nguồn" : "quote KHÔNG tìm thấy trong trang nguồn") : "chưa đối chiếu trang nguồn – mở nguồn để kiểm tra"}</p>
              {finding.agentClaim.quote && <blockquote className="mt-1 border-l-2 pl-2 italic">“{finding.agentClaim.quote}”</blockquote>}
            </div>}
            {finding.aiProposal && <div className="mt-2 rounded-md bg-muted/60 p-2 text-xs">
              <p className="font-medium">Gợi ý AI · {finding.aiProposal.related ? `liên quan · mức ${finding.aiProposal.severity ?? "chưa đủ bằng chứng"}` : "có thể không liên quan"} · độ tin cậy AI tự đánh giá {formatNumber(finding.aiProposal.confidence * 100, 0)}%</p>
              {finding.aiProposal.evidenceQuote && <blockquote className="mt-1 border-l-2 pl-2 italic">“{finding.aiProposal.evidenceQuote}”</blockquote>}
            </div>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={finding.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Mở nguồn</a>
            {finding.status === "Needs review" && <>
              {LEVELS.map((value) => <Button key={value} size="sm" variant="outline" onClick={() => review(index, "Verified", value)} title={`P_OSINT +${formatNumber(penaltyTable[String(value)] ?? 0)}`}>Chấp nhận mức {value}</Button>)}
              <Button size="sm" variant="ghost" onClick={() => review(index, "Rejected")}>Bỏ</Button>
            </>}
            {(finding.status === "Verified" || finding.status === "Rejected") && <Button size="sm" variant="ghost" onClick={() => review(index, "Needs review")}>Hoàn tác</Button>}
          </div>
        </div>;
      })}

      {reviewed.length > 0 && <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-semibold">Sự kiện đã ghi nhận</p>
        {reviewed.map((finding, index) => <div key={`wb-${index}`} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-dashed p-3 text-xs">
          <span className="min-w-0 flex-1">{finding.title} · {finding.source}{finding.eventDate ? ` · ${finding.eventDate}` : ""} · mức {finding.penaltyLevel}</span>
          {finding.url && <a href={finding.url} target="_blank" rel="noreferrer" className="text-primary underline">Mở nguồn</a>}
        </div>)}
      </div>}

      {(findings.length > 0 || workbookLevel > 0) && <Alert className="rounded-xl"><AlertDescription>
        Mức rủi ro OSINT: {level || 0} · POSINT {formatNumber(posintBefore)}{accepted ? ` → ${formatNumber(posintAfter)}` : ""} · RFin tổng {formatNumber(rfinBase + (accepted ? posintAfter : posintBefore))}.
      </AlertDescription></Alert>}
    </div>
  );
}

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString();
  } catch {
    return value.trim().toLowerCase();
  }
}
