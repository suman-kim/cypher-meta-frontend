import { NextRequest, NextResponse } from "next/server";

/** 공개 코스튬 목록 프록시 — 동일 출처 호출. 참조 데이터라 CDN에 길게 캐시. */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search; // ?character=&year= 그대로 전달
  try {
    const r = await fetch(`${API}/costumes${qs}`, { next: { revalidate: 3600 } });
    const text = await r.text();
    return new NextResponse(text || "[]", {
      status: r.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ message: "백엔드 서버(:4000)에 연결할 수 없습니다." }, { status: 502 });
  }
}
