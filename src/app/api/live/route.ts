import { NextRequest, NextResponse } from "next/server";
import { getLiveStreams } from "@/lib/live";

/** 통합 라이브 목록(치지직+유튜브+SOOP) — 폴링용. 라이브라 짧게(30초) 캐시. */
export async function GET(req: NextRequest) {
  const n = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(n) && n > 0 ? Math.min(n, 40) : 20;
  try {
    const streams = await getLiveStreams(limit);
    return NextResponse.json(
      { streams },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json({ streams: [], message: "라이브 목록을 불러오지 못했습니다." }, { status: 502 });
  }
}
