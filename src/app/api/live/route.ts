import { NextRequest, NextResponse } from "next/server";
import { getLiveStreams } from "@/lib/live";

/**
 * 통합 라이브 목록(치지직+유튜브+SOOP, 시청자수 내림차순) — 클라이언트(LiveStreams 레일) 폴링용.
 * 서버에서 여러 플랫폼을 합쳐 표준 LiveStream[] 로 내려준다.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const n = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(n) && n > 0 ? Math.min(n, 40) : 20;
  try {
    const streams = await getLiveStreams(limit);
    return NextResponse.json({ streams });
  } catch {
    return NextResponse.json({ streams: [], message: "라이브 목록을 불러오지 못했습니다." }, { status: 502 });
  }
}
