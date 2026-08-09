import { NextRequest, NextResponse } from "next/server";
import { getVideosPage, type VideoSort } from "@/lib/videos";

/** 사이퍼즈 동영상 목록(유튜브+치지직) — 정렬 탭 + 무한 스크롤(커서). 2분 캐시. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sort: VideoSort = sp.get("sort") === "recent" ? "recent" : "view";
  const n = Number(sp.get("limit"));
  const limit = Number.isFinite(n) && n > 0 ? Math.min(n, 40) : 24;

  const ytRaw = sp.get("yt");
  const ytToken = ytRaw === "none" ? null : (ytRaw ?? "");
  const czRaw = Number(sp.get("cz"));
  const czOffset = Number.isFinite(czRaw) ? czRaw : 0;

  try {
    const page = await getVideosPage(sort, limit, ytToken, czOffset);
    return NextResponse.json(
      {
        videos: page.videos,
        next: { yt: page.nextYt === null ? "none" : page.nextYt, cz: page.nextCz },
        hasMore: page.hasMore,
      },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json(
      { videos: [], next: { yt: "none", cz: -1 }, hasMore: false, message: "동영상을 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
