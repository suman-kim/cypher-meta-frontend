import { NextRequest, NextResponse } from "next/server";

/** 치지직 라이브 목록 프록시 — 동일 출처 중계. 라이브라 짧게(30초) 캐시. */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "8";
  try {
    const r = await fetch(`${API}/chzzk/lives?limit=${encodeURIComponent(limit)}`, {
      next: { revalidate: 30 },
    });
    const text = await r.text();
    return new NextResponse(text || '{"lives":[],"category":null}', {
      status: r.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json(
      { lives: [], category: null, message: "백엔드 서버(:4000)에 연결할 수 없습니다." },
      { status: 502 },
    );
  }
}
