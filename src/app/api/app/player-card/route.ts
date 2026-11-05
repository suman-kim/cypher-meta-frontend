/**
 * 앱 홈 "내 전적" 카드용 플레이어 요약 — GET /api/app/player-card?playerId=...
 *
 * 앱은 내 닉네임 연동 정보를 기기에만 저장하므로(서버는 누가 연동했는지 모른다),
 * 홈 카드가 화면에 뜬 뒤 이 라우트로 요약을 받아 온다.
 * 정규화가 필요해 forward() 대신 서버 전용 lib/neople 을 쓴다(app/api/players/[playerId]/matches 와 같은 방식).
 */
import { NextRequest, NextResponse } from "next/server";
import { getPlayer, getPlayerMatches, getRatingRanking, NeopleApiError } from "@/lib/neople";
import { readRecord, winRate, calcKDA } from "@/lib/format";

/** 카드에 보여 주는 최근 공식전 수 */
const RECENT = 10;

/** 응답 모양 */
export interface PlayerCardData {
  /** 플레이어 ID */
  playerId: string;
  /** 닉네임 */
  nickname: string;
  /** 대표 캐릭터 ID */
  characterId: string | null;
  /** 공식전 RP */
  rp: number | null;
  /** 공식전 전체 순위 (순위권 밖이면 null) */
  rank: number | null;
  /** 티어 이름 */
  tierName: string | null;
  /** 공식전 통산 승 */
  wins: number;
  /** 공식전 통산 패 */
  losses: number;
  /** 공식전 통산 승률(%) — 기록 없으면 null */
  winRate: number | null;
  /** 최근 공식전 평균 KDA — 기록 없으면 null */
  kda: number | null;
  /** 최근 공식전 결과(최신순, 최대 10) */
  recent: ("win" | "lose" | null)[];
  /** 서버가 이 요약을 만든 시각(ISO) */
  fetchedAt: string;
}

/**
 * @param req 쿼리 playerId (필수)
 * @returns PlayerCardData 또는 { message }
 */
export async function GET(req: NextRequest) {
  const playerId = (req.nextUrl.searchParams.get("playerId") ?? "").trim();
  if (!/^[0-9a-f]{32}$/i.test(playerId)) {
    return NextResponse.json({ message: "잘못된 플레이어 ID 입니다." }, { status: 400 });
  }

  try {
    const [player, ranking, matches] = await Promise.all([
      getPlayer(playerId),
      getRatingRanking({ playerId, limit: 5 }).catch(() => null),
      getPlayerMatches(playerId, { gameTypeId: "rating", limit: RECENT }).catch(() => null),
    ]);
    const row = ranking?.rows.find((r) => r.player.playerId === playerId);
    const rec = readRecord((player.records ?? []).find((r) => r.gameTypeId === "rating"));
    const wins = rec.win || row?.win || 0;
    const losses = rec.lose || row?.lose || 0;
    const rows = (matches?.matches.rows ?? []).slice(0, RECENT);
    const withKda = rows.filter((m) => m.playInfo.killCount !== undefined || m.playInfo.deathCount !== undefined);

    const data: PlayerCardData = {
      playerId,
      nickname: player.nickname,
      characterId: player.represent?.characterId ?? null,
      rp: player.ratingPoint ?? row?.ratingPoint ?? null,
      rank: row?.ranking ?? null,
      tierName: player.tierName ?? row?.tierName ?? null,
      wins,
      losses,
      winRate: wins + losses > 0 ? winRate(wins, losses) : null,
      kda:
        withKda.length > 0
          ? withKda.reduce((s, m) => s + calcKDA(m.playInfo.killCount, m.playInfo.deathCount, m.playInfo.assistCount), 0) /
            withKda.length
          : null,
      recent: rows.map((m) => (m.playInfo.result === "win" ? "win" : m.playInfo.result === "lose" ? "lose" : null)),
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof NeopleApiError && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: (e as Error).message || "전적을 불러오지 못했습니다." }, { status });
  }
}
