import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.QUANTUM_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/v1/data/latest`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": "application/json" } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Backend không phản hồi";
    return NextResponse.json({ detail: `Không tải được trạng thái đồng bộ dữ liệu. (${detail})` }, { status: 503 });
  }
}

export async function POST() {
  try {
    const response = await fetch(`${API_URL}/api/v1/data/refresh`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(180_000),
    });
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Backend không phản hồi";
    return NextResponse.json({ detail: `Không đồng bộ được dữ liệu tài chính. (${detail})` }, { status: 503 });
  }
}
