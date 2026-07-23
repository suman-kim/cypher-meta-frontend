/**
 * 정규화 계층 — Neople API 의 "원시 응답(raw)"을 앱의 "뷰 모델"로 변환합니다.
 *
 * 실제 사이퍼즈 API 스키마 기준(cyphers-api 스킬 references/schemas.md):
 *  - 매치 목록: { date, gameTypeId, next, matches: MatchRecord[] }  ← matches 는 flat 배열(루트)
 *  - 매치 상세: { date, matchId, gameTypeId, playInfo(경기개요), teams[], position[] }
 *      · teams[] = { teamId, result, players[] }
 *      · players[] = flat 스탯 + playerId/nickname/characterId/characterName/level + items[]
 *        (플레이어별 playInfo 중첩 없음! 승패는 팀 단위)
 *  - 평점 랭킹 rows[] = flat PlayerRanking(playerId/nickname/grade/rp/rankingPoint/tierName/win/lose/stop)
 *  - 플레이어 기본 정보: playerId/nickname/grade/clanName (+ 랭킹 컨텍스트에서 win/lose/tier 동반 가능)
 *
 * 방어적으로 작성해 flat/nested 어느 쪽이 와도 흡수합니다.
 */

import type {
  CharacterRankingResponse,
  CharacterRankingRow,
  CharactersResponse,
  ItemDetail,
  ItemSearchResponse,
  MatchDetail,
  MatchDetailPlayer,
  MatchDetailTeam,
  MatchPlayInfo,
  MatchRow,
  PlayerDetail,
  PlayerMatchesResponse,
  PlayerRecord,
  PlayerSearchResponse,
  RankingPlayer,
  RatingRankingResponse,
  RatingRankingRow,
  TsjRankingResponse,
  TsjRankingRow,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function asArray(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return Object.values(v);
  return [];
}

/** 플레이어별 playInfo 가 중첩돼 있으면 그것을, 아니면 행 자체(flat)를 스탯 원본으로 사용 */
function pickPlayInfo(raw: any): MatchPlayInfo {
  const s = raw?.playInfo && typeof raw.playInfo === "object" ? raw.playInfo : raw ?? {};
  return { ...s } as MatchPlayInfo;
}

/** 랭킹 행의 플레이어 정보: player 중첩이 있으면 사용, 없으면 flat 필드에서 구성 */
function pickRankingPlayer(row: any): RankingPlayer {
  if (row?.player && typeof row.player === "object") return row.player as RankingPlayer;
  return {
    playerId: row?.playerId ?? "",
    nickname: row?.nickname ?? "",
    grade: row?.grade,
    clanName: row?.clanName,
  };
}

function rankOf(row: any, index: number): number {
  return row?.ranking ?? row?.rank ?? index + 1;
}

/* ── 플레이어 ── */

export function normalizePlayerSearch(raw: any): PlayerSearchResponse {
  return { rows: asArray(raw?.rows), next: raw?.next };
}

export function normalizePlayerDetail(raw: any): PlayerDetail {
  // 기본 정보엔 records 배열이 없음. 랭킹 컨텍스트에서 flat win/lose/stop 이 오면 rating 전적으로 합성.
  let records: PlayerRecord[] = Array.isArray(raw?.records) ? raw.records : [];
  if (records.length === 0 && (raw?.win !== undefined || raw?.lose !== undefined)) {
    records = [{ gameTypeId: "rating", win: raw?.win ?? 0, lose: raw?.lose ?? 0, stop: raw?.stop ?? 0 }];
  }
  return {
    playerId: raw?.playerId ?? "",
    nickname: raw?.nickname ?? "",
    grade: raw?.grade ?? 0,
    clanName: raw?.clanName,
    represent: raw?.represent,
    tierName: raw?.tierName,
    ratingPoint: raw?.ratingPoint ?? raw?.rp,
    maxRatingPoint: raw?.maxRatingPoint ?? raw?.rankingPoint,
    records,
  };
}

export function normalizePlayerMatches(raw: any): PlayerMatchesResponse {
  const m = raw?.matches;
  // 스키마: matches 는 루트의 flat 배열. (방어적으로 { rows } 형태도 허용)
  const rawRows: any[] = Array.isArray(m) ? m : Array.isArray(m?.rows) ? m.rows : [];
  const rootDate = raw?.date ?? (Array.isArray(m) ? undefined : m?.date);
  const rows: MatchRow[] = rawRows.map((r) => ({
    matchId: r?.matchId ?? "",
    date: r?.date ?? rootDate ?? "",
    playInfo: pickPlayInfo(r),
  }));
  return {
    matches: {
      date: rootDate,
      gameTypeId: raw?.gameTypeId ?? (Array.isArray(m) ? undefined : m?.gameTypeId),
      next: raw?.next ?? (Array.isArray(m) ? undefined : m?.next),
      rows,
    },
  };
}

/* ── 매치 상세 ── */

export function normalizeMatchDetail(raw: any): MatchDetail {
  const root = raw?.match ?? raw ?? {};

  // ⭐ 실제 응답: teams[].players 는 playerId 문자열 배열, 상세는 최상위 players[] 에 있음.
  //    playerId → 전체 플레이어 데이터 맵을 만들어 팀 구성원과 연결한다.
  const playerMap = new Map<string, any>();
  for (const p of asArray(root.players)) {
    if (p && typeof p === "object" && p.playerId) playerMap.set(String(p.playerId), p);
  }

  /** 팀의 players 항목(문자열 ID 또는 객체)을 전체 플레이어 데이터로 해석 */
  function resolvePlayer(entry: any): any {
    if (typeof entry === "string") return playerMap.get(entry) ?? { playerId: entry };
    if (entry && typeof entry === "object") {
      if (!entry.playInfo && entry.playerId && playerMap.has(String(entry.playerId))) {
        return playerMap.get(String(entry.playerId));
      }
      return entry;
    }
    return { playerId: String(entry ?? "") };
  }

  let teamList = asArray(root.teams);

  // teams 가 없고 최상위 players 만 있으면 승패로 그룹핑
  if (teamList.length === 0 && playerMap.size > 0) {
    const byResult = new Map<string, string[]>();
    for (const p of asArray(root.players)) {
      if (!p?.playerId) continue;
      const key = String(p?.playInfo?.result ?? p?.result ?? "0");
      if (!byResult.has(key)) byResult.set(key, []);
      byResult.get(key)!.push(String(p.playerId));
    }
    teamList = Array.from(byResult.entries()).map(([result, players]) => ({ result, players }));
  }

  const teams: MatchDetailTeam[] = teamList.map((t: any): MatchDetailTeam => {
    const teamResult = t?.result;
    const entries = asArray(t?.players).length ? asArray(t?.players) : asArray(t?.player);
    return {
      teamId: t?.teamId,
      result: teamResult,
      players: entries.map((entry: any): MatchDetailPlayer => {
        const src = resolvePlayer(entry);
        const info = pickPlayInfo(src);
        if (!info.result) info.result = (src?.result ?? teamResult) as MatchDetailPlayer["playInfo"]["result"];
        return {
          playerId: src?.playerId ?? (typeof entry === "string" ? entry : ""),
          nickname: src?.nickname ?? "",
          playInfo: info,
          items: asArray(src?.items),
          itemPurchase: asArray(src?.itemPurchase),
        };
      }),
    };
  });

  return {
    matchId: root?.matchId ?? "",
    date: root?.date ?? "",
    gameTypeId: root?.gameTypeId ?? "",
    map: root?.map,
    teams,
  };
}

/* ── 랭킹 ── */

export function normalizeRatingRanking(raw: any): RatingRankingResponse {
  const rows: RatingRankingRow[] = asArray(raw?.rows).map(
    (r: any, i: number): RatingRankingRow => ({
      ranking: rankOf(r, i),
      player: pickRankingPlayer(r),
      ratingPoint: r?.ratingPoint ?? r?.rp,
      rankingPoint: r?.rankingPoint,
      tierName: r?.tierName,
      win: r?.win,
      lose: r?.lose,
      stop: r?.stop,
    }),
  );
  return { rows, next: raw?.next };
}

export function normalizeCharacterRanking(raw: any): CharacterRankingResponse {
  const rows: CharacterRankingRow[] = asArray(raw?.rows).map(
    (r: any, i: number): CharacterRankingRow => ({
      ranking: rankOf(r, i),
      player: pickRankingPlayer(r),
      characterId: r?.characterId,
      characterName: r?.characterName,
      value: r?.value,
      winCount: r?.winCount,
      loseCount: r?.loseCount,
      winRate: r?.winRate,
    }),
  );
  return { rows, next: raw?.next };
}

export function normalizeTsjRanking(raw: any): TsjRankingResponse {
  // 스키마: rank/beforeRank/playerId/nickname/ratingPoint/winCount/loseCount/winningStreak (flat)
  const rows: TsjRankingRow[] = asArray(raw?.rows).map(
    (r: any, i: number): TsjRankingRow => ({
      ranking: rankOf(r, i),
      player: pickRankingPlayer(r),
      score: r?.score ?? r?.ratingPoint ?? r?.point,
      winCount: r?.winCount,
      loseCount: r?.loseCount,
    }),
  );
  return { rows, next: raw?.next };
}

/* ── 캐릭터 / 아이템 ── */

export function normalizeCharacters(raw: any): CharactersResponse {
  return { rows: asArray(raw?.rows), next: raw?.next };
}

export function normalizeItemSearch(raw: any): ItemSearchResponse {
  return { rows: asArray(raw?.rows), next: raw?.next };
}

export function normalizeItemDetail(raw: any): ItemDetail {
  return { ...(raw ?? {}) } as ItemDetail;
}
