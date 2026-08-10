import { NextRequest, NextResponse } from "next/server";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/** 개인 히스토리 분석 요약 프록시. 백엔드 GET /meta/history/:playerId 위임. 같은 유저 반복 조회는 2분 캐시. */
export async function GET(req: NextRequest, { params }: { params: { playerId: string } }) {
  try {
    const res = await fetch(
      `${API}/meta/history/${encodeURIComponent(params.playerId)}${req.nextUrl.search}`,
      { next: { revalidate: 120 } },
    );
    const text = await res.text();
    return new NextResponse(text || "{}", {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }
}
