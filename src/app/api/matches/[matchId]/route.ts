import { NextResponse } from "next/server";
import { getMatch } from "@/lib/neople";

/** 매치 상세(정규화) — 최근 전적 행 펼침 요약용. 매치 결과는 불변이라 CDN에 길게 캐시. */
export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: { matchId: string } }) {
  try {
    const detail = await getMatch(params.matchId);
    return NextResponse.json(detail, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }
}
