/**
 * 앱 전체 랭킹 이어 불러오기 — GET /api/app/ranking?offset=50
 *
 * 앱 랭킹 화면이 목록 끝에 닿으면 다음 50명을 이 라우트로 받아 붙인다(웹은 쪽 번호 이동).
 * 100위까지는 웹 랭킹과 같이 최근 공식전 기록으로 픽 TOP3·승률·성향 태그를 붙인다.
 * 보강 계산이 필요해 forward() 대신 서버 전용 lib/neople·lib/ranking-enrich 를 쓴다(api/app/player-card 와 같은 방식).
 */
import { NextRequest, NextResponse } from "next/server";
import { getRatingRanking, NeopleApiError } from "@/lib/neople";
import { enrichPlayer, mapLimit, type PlayerMeta } from "@/lib/ranking-enrich";
import {
  ENRICH_MAX_RANK,
  RANK_PAGE_SIZE,
  toAppRankRow,
  type AppRankPage,
} from "@/components/app/screens/meta/rank-data";

/** offset 상한 (비정상 요청 차단용) */
const MAX_OFFSET = 100000;

/**
 * @param req 쿼리 offset (0 이상의 정수, 기본 0)
 * @returns AppRankPage 또는 { message }
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("offset") ?? "0";
  const offset = Number(raw);
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    return NextResponse.json({ message: "잘못된 순위 위치입니다." }, { status: 400 });
  }

  try {
    const rows = (await getRatingRanking({ offset, limit: RANK_PAGE_SIZE })).rows ?? [];

    // 100위 안쪽만 보강(실패해도 목록은 내려 준다)
    let metaMap = new Map<string, PlayerMeta>();
    try {
      const targets = rows.filter((r) => r.ranking <= ENRICH_MAX_RANK);
      const metas = await mapLimit(targets, 8, (r) => enrichPlayer(r.player.playerId));
      metaMap = new Map(metas.map((m) => [m.playerId, m]));
    } catch {
      metaMap = new Map();
    }

    const data: AppRankPage = {
      rows: rows.map((r) => toAppRankRow(r, metaMap.get(r.player.playerId))),
      nextOffset: rows.length >= RANK_PAGE_SIZE ? offset + rows.length : null,
    };
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof NeopleApiError && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: (e as Error).message || "랭킹을 불러오지 못했습니다." }, { status });
  }
}
