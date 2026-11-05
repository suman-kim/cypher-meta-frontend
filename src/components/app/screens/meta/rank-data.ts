/**
 * 앱 전체 랭킹 한 줄 데이터 모양과 변환 함수 (서버·클라이언트 공용, 조회 없음).
 *
 * 서버 페이지(app/ranking/page.tsx)와 이어 불러오기 라우트(app/api/app/ranking)가
 * 같은 모양으로 내려 주도록 변환을 한곳에 둔다.
 */
import type { RatingRankingRow } from "@/lib/types";
import type { PickInfo, PlayerMeta } from "@/lib/ranking-enrich";

/** 픽·승률·성향을 붙이는 최대 순위 (웹과 같은 100위) */
export const ENRICH_MAX_RANK = 100;

/** 한 번에 불러오는 순위 수 (웹 쪽 단위와 같은 50) */
export const RANK_PAGE_SIZE = 50;

/** 전체 랭킹 한 줄 */
export interface AppRankRow {
  /** 순위 */
  rank: number;
  /** 이전 순위 (0·null 이면 신규 진입) */
  beforeRank: number | null;
  /** 플레이어 ID */
  playerId: string;
  /** 닉네임 */
  nickname: string;
  /** 클랜 이름 (없으면 null) */
  clan: string | null;
  /** 등급 (없으면 null) */
  grade: number | null;
  /** 티어 이름 (없으면 null) */
  tierName: string | null;
  /** RP */
  rp: number;
  /** 픽·승률·성향을 붙인 줄인지 (100위까지) */
  enriched: boolean;
  /** 최근 공식전 승률(%) — 기록이 없으면 null */
  winRate: number | null;
  /** 최근 공식전 승 수 */
  wins: number;
  /** 최근 공식전 패 수 */
  losses: number;
  /** 성향 태그 (원문, 이모지 포함 가능) */
  tags: string[];
  /** 많이 고른 캐릭터 최대 3명 (판수 포함) */
  picks: PickInfo[];
}

/** 이어 불러오기 응답 */
export interface AppRankPage {
  /** 이번에 받은 줄 */
  rows: AppRankRow[];
  /** 다음에 부를 offset — 더 없으면 null */
  nextOffset: number | null;
}

/**
 * Neople 랭킹 행 + 보강 메타를 앱 한 줄로 바꾼다.
 * @param row 통합 랭킹 행
 * @param meta 최근 공식전 보강 메타 (100위 밖이거나 실패면 undefined)
 * @returns 앱 랭킹 한 줄
 */
export function toAppRankRow(row: RatingRankingRow, meta?: PlayerMeta): AppRankRow {
  const total = meta?.total ?? 0;
  return {
    rank: row.ranking,
    beforeRank: row.beforeRank ?? null,
    playerId: row.player.playerId,
    nickname: row.player.nickname,
    clan: row.player.clanName || null,
    grade: row.player.grade ?? null,
    tierName: row.tierName ?? null,
    rp: row.ratingPoint ?? 0,
    enriched: !!meta,
    winRate: total > 0 ? (meta?.winRate ?? null) : null,
    wins: meta?.wins ?? 0,
    losses: total - (meta?.wins ?? 0),
    tags: meta?.tags ?? [],
    picks: (meta?.picks ?? []).slice(0, 3),
  };
}
