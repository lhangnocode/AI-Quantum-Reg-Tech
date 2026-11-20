import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.QUANTUM_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  const body = await request.text();
  try {
    const response = await fetch(`${API_URL}/api/v1/portfolio/optimize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Backend không phản hồi";
    return NextResponse.json({ detail: `Không kết nối được dịch vụ tối ưu danh mục. (${detail})` }, { status: 503 });
  }
}
