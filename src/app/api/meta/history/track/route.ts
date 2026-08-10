import { NextRequest, NextResponse } from "next/server";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";
export const runtime = "edge";

export const dynamic = "force-dynamic";

/**
 * 개인 히스토리 적립 트리거 프록시(클라이언트 fire-and-forget).
 * 프로필 조회 시 watchlist 등록 + 최근분 적립을 백엔드에 위임한다.
 */
export async function POST(req: NextRequest) {
  let body = "{}";
  try {
    body = JSON.stringify(await req.json());
  } catch {
    /* 빈 바디 허용 */
  }
  try {
    const res = await fetch(`${API}/meta/history/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text || "{}", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ tracked: false, message: (e as Error).message }, { status: 502 });
  }
}
