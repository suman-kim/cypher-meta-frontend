/**
 * duo.ts — 플레이어 2명 비교(GET /meta/history/duo) 응답 타입과 화면용 상수 (서버/클라이언트 공용, fetch 없음).
 *
 * 두 플레이어의 누적 전적을 경기 ID 로 교차해
 *  - 함께한 경기(같은 팀) / 상대 전적(상대 팀)으로 나눈다.
 *  - 공식전은 승패가 있어 승률·상대 전적 승패를 낸다.
 *  - 일반전은 Neople 가 승패를 주지 않아 같은 팀/상대만 가린다(지난 시즌 일반전은 판별 불가).
 */

/** 비교 기준(플레이어 화면 탭과 같음) */
export type DuoGameType = "all" | "rating" | "normal";

/** 비교 기준 탭 정의 */
export const DUO_GAME_TYPES: { key: DuoGameType; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "rating", label: "공식전" },
  { key: "normal", label: "일반전" },
];

/** 두 플레이어의 관계 — 같은 팀 / 상대 팀 / 판별 불가 / 팀 확인 대기(일반전, 다시 불러오면 판별됨) */
export type DuoRelation = "together" | "opponent" | "unknown" | "checking";

/** 경기 속 한 플레이어의 기록 */
export interface DuoSide {
  characterId: string;
  characterName: string | null;
  /** "win" | "lose" (일반전은 null) */
  result: string | null;
  kill: number;
  death: number;
  assist: number;
  /** "1st" | "2nd" | null */
  ultimateType: string | null;
}

/** 두 플레이어가 함께 기록된 경기 1건 */
export interface DuoMatch {
  matchId: string;
  gameTypeId: string | null;
  /** ISO(UTC) 시각 */
  playedAt: string | null;
  relation: DuoRelation;
  a: DuoSide;
  b: DuoSide;
}

/** 플레이어별 적립 현황 */
export interface DuoPlayerCoverage {
  playerId: string;
  /** 처음 조회라 전적을 모으는 중이면 true(결과가 늘어날 수 있음) */
  pending: boolean;
  matchCount: number;
  oldest: string | null;
  newest: string | null;
}

/** 비교 결과 */
export interface DuoResult {
  gameType: DuoGameType;
  a: DuoPlayerCoverage;
  b: DuoPlayerCoverage;
  /** 함께한 경기 — decided 는 승패가 있는 판(공식전) */
  together: { games: number; decided: number; wins: number; losses: number; winRate: number | null };
  /** 상대 전적 — aWins/bWins 는 각자 이긴 판(공식전) */
  opponents: { games: number; decided: number; aWins: number; bWins: number; aWinRate: number | null };
  /** 팀을 알 수 없는 경기(지난 시즌 일반전 등) */
  unknown: number;
  /** 아직 팀 확인 전인 일반전 — 다시 요청하면 이어서 판별된다 */
  teamPending: number;
  total: number;
  matches: DuoMatch[];
}

/** 비교 화면에 넘기는 플레이어 정보(서버 페이지에서 닉네임으로 찾은 결과) */
export interface DuoPlayer {
  playerId: string;
  nickname: string;
  /** 대표 캐릭터(프로필 이미지용) */
  representId?: string;
  representName?: string;
}
