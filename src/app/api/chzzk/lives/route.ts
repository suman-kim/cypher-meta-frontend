import { NextRequest, NextResponse } from "next/server";

/**
 * 치지직 라이브 목록 프록시 — 클라이언트(LiveStreams 자동 갱신)가 백엔드 chzzk API 를
 * 동일 출처(same-origin)로 호출하도록 중계. 백엔드 주소는 서버 측에만 둔다.
 */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "8";
  try {
    const r = await fetch(`${API}/chzzk/lives?limit=${encodeURIComponent(limit)}`, { cache: "no-store" });
    const text = await r.text();
    return new NextResponse(text || '{"lives":[],"category":null}', {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { lives: [], category: null, message: "백엔드 서버(:4000)에 연결할 수 없습니다." },
      { status: 502 },
    );
  }
}
