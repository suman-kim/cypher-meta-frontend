/**
 * 플레이어 전적 다음 페이지 — 최근 전적 무한 스크롤용 라우트 핸들러.
 *
 * 클라이언트(PlayerMatchList)가 Neople `next` 커서를 넘기면 다음 페이지를 정규화해 돌려준다.
 * 정규화가 필요해 forward() 대신 서버 전용 lib/neople 을 쓴다(app/api/matches/[matchId] 와 같은 방식).
 */
import { NextRequest, NextResponse } from "next/server";
import { getPlayerMatches, NeopleApiError } from "@/lib/neople";

/** 이어 받기를 허용하는 게임 타입 */
const GAME_TYPES = ["rating", "normal"];
/** 한 번에 받는 전적 수(Neople 최대 100) */
const PAGE_LIMIT = 100;

/**
 * GET /api/players/{playerId}/matches?gameTypeId=rating&next=...
 * @param req — gameTypeId(rating|normal) · next(이전 응답의 커서, 필수)
 * @param params — playerId
 * @returns { rows, next } — next 가 null 이면 마지막 페이지
 */
export async function GET(req: NextRequest, { params }: { params: { playerId: string } }) {
  const gameTypeId = req.nextUrl.searchParams.get("gameTypeId") ?? "rating";
  const next = req.nextUrl.searchParams.get("next") ?? "";
  if (!GAME_TYPES.includes(gameTypeId) || !next || next.length > 1000) {
    return NextResponse.json({ message: "잘못된 전적 조회 요청입니다." }, { status: 400 });
  }

  try {
    const res = await getPlayerMatches(params.playerId, { gameTypeId, next, limit: PAGE_LIMIT });
    return NextResponse.json({ rows: res.matches.rows, next: res.matches.next ?? null });
  } catch (e) {
    const status = e instanceof NeopleApiError && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: (e as Error).message || "전적을 불러오지 못했습니다." }, { status });
  }
}
