/**
 * analysis.ts — 개인 히스토리 요약(GET /meta/history/:playerId) 타입과
 * 규칙 기반 페르소나/요약 문장 생성기. (LLM 없이 결정적)
 * 공식전(rating)은 승률·KDA 포함, 일반전(normal)은 API가 승패/KDA를 주지 않아 픽·플레이 중심.
 *
 * 응답에는 기존 포지션(탱커/근딜/원딜/서포터) 필드와 공식 역할군 필드(official*)가 함께 온다.
 * 공식 역할군 체계에서는 toOfficialView()로 공식 필드를 기존 필드 자리에 옮겨, 같은 화면 구조를 그대로 쓴다(롤백 대비).
 */
import { ROLE_LABELS } from "./meta";
import { roleByName, UNKNOWN_ROLE_COLOR } from "./official";

export interface HistoryPosition {
  role: string;
  games: number;
  share: number;
  winRate: number;
}
export interface HistoryTopChar {
  name: string;
  characterId?: string;
  role: string;
  games: number;
  wins: number;
  /** 승패가 있는 판 수(공식전) — '전체' 기준에서 승률의 분모 */
  decided?: number;
  winRate: number;
  kda: number;
  /** 1차/2차/판별 미상 판 수 (공식 역할군 체계) */
  ultimates?: { first: number; second: number; unknown: number };
  /** 대표 공식 역할군 (공식 역할군 체계, 정할 수 없으면 null) */
  officialRole?: string | null;
}
export interface HistoryYear {
  year: number;
  games: number;
  winRate: number;
  topCharacter: string | null;
  topRole: string | null;
  /** 그 해 최다 공식 역할군(미확정 제외) */
  topOfficialRole?: string | null;
}
/** 공식 역할군 분포 1행 — officialRole=null 은 미확정 */
export interface HistoryOfficialPosition {
  officialRole: string | null;
  games: number;
  share: number;
  winRate: number;
}
export interface PlayerHistorySummary {
  playerId: string;
  gameType?: string;
  coverage: {
    total: number;
    oldest: string | null;
    newest: string | null;
    /** 궁극기 판별을 마친 판 수 / 백그라운드 대기 판 수 */
    ultimateChecked?: number;
    ultimatePending?: number;
  };
  winRate: number;
  wins: number;
  losses: number;
  decided?: number;
  avgKda: number;
  avgPlayTime?: number;
  primaryRole: string | null;
  positions: HistoryPosition[];
  /** 공식 역할군 체계 필드 (구버전 백엔드에는 없음) */
  primaryOfficialRole?: string | null;
  officialPositions?: HistoryOfficialPosition[];
  topCharacters: HistoryTopChar[];
  byYear: HistoryYear[];
  recentForm: string[];
}

/** 공식 역할군 체계에서 역할군을 확정할 수 없는 판·캐릭터의 표시 이름 */
export const UNKNOWN_OFFICIAL_ROLE = "미확정";

/**
 * 역할 → 한글 라벨. 기존 포지션 코드(tank 등)는 한글로 바꾸고, 공식 역할군명·"미확정"은 그대로 둔다.
 * 그 밖의 값·누락은 "올라운더".
 * @param r — 포지션 코드 또는 공식 역할군명
 * @returns 표시 라벨
 */
export const roleLabel = (r?: string | null): string =>
  (r && ROLE_LABELS[r as keyof typeof ROLE_LABELS]) ||
  (r && (roleByName(r) || r === UNKNOWN_OFFICIAL_ROLE) ? r : "") ||
  "올라운더";

/** 포지션 도넛/뱃지 역할별 색상. */
export const ROLE_COLORS: Record<string, string> = {
  tank: "#3b82f6",
  melee: "#f97316",
  ranged: "#a855f7",
  support: "#10b981",
  etc: "#94a3b8",
};

/**
 * 역할 → 표시 색. 기존 포지션 코드면 ROLE_COLORS, 공식 역할군명이면 그 역할군 색, 나머지는 회색.
 * @param r — 포지션 코드 또는 공식 역할군명
 * @returns CSS 색
 */
export const roleColorOf = (r?: string | null): string =>
  (r && ROLE_COLORS[r]) || roleByName(r)?.color || (r === UNKNOWN_OFFICIAL_ROLE ? UNKNOWN_ROLE_COLOR : ROLE_COLORS.etc);

/**
 * 공식 역할군 체계용 보기로 바꾼다 — 공식 필드를 기존 필드(positions/primaryRole/topRole/role) 자리에 옮긴다.
 * 공식 필드가 없는 응답(구버전 백엔드)은 그대로 돌려준다.
 * @param d — 개인 분석 요약 원본
 * @returns 화면용 요약(역할 값이 공식 역할군명 또는 "미확정")
 */
export function toOfficialView(d: PlayerHistorySummary): PlayerHistorySummary {
  if (!d.officialPositions) return d;
  return {
    ...d,
    primaryRole: d.primaryOfficialRole ?? null,
    positions: d.officialPositions.map((p) => ({
      role: p.officialRole ?? UNKNOWN_OFFICIAL_ROLE,
      games: p.games,
      share: p.share,
      winRate: p.winRate,
    })),
    topCharacters: d.topCharacters.map((c) => ({ ...c, role: c.officialRole ?? UNKNOWN_OFFICIAL_ROLE })),
    byYear: d.byYear.map((y) => ({ ...y, topRole: y.topOfficialRole ?? null })),
  };
}

/** 연도별 topRole 변화 텍스트(공통). */
function roleTrend(d: PlayerHistorySummary): string {
  const years = d.byYear ?? [];
  if (years.length < 2) return "";
  const first = years[0];
  const last = years[years.length - 1];
  if (first.topRole && last.topRole && first.topRole !== last.topRole) {
    return `${first.year}→${last.year}년 사이 ${roleLabel(first.topRole)}에서 ${roleLabel(
      last.topRole,
    )} 중심으로 플레이스타일이 옮겨갔어요.`;
  }
  return "";
}

/**
 * 요약 데이터로 페르소나 라벨·요약 문장·키워드를 생성(규칙 기반).
 * @param gameType rating|normal — normal 은 승률/KDA 없이 픽 중심.
 */
export function buildPersona(
  d: PlayerHistorySummary,
  gameType = "rating",
): { persona: string; summary: string; keywords: string[] } {
  const total = d.coverage?.total ?? 0;
  const roleWord = roleLabel(d.primaryRole);
  const top = d.topCharacters?.[0];
  const trendText = roleTrend(d);

  // ── 일반전: 승패/KDA 미제공 → 픽·성향 중심 ─────────────────────────
  if (gameType === "normal") {
    const persona = total ? `${roleWord} 애호가` : "데이터 수집 중";
    let s = `일반전 통산 ${total.toLocaleString()}경기 기준, ${roleWord}를 가장 즐기는 플레이어예요.`;
    if (top) s += ` 가장 많이 플레이한 캐릭터는 ${top.name}(${top.games}판).`;
    if (trendText) s += ` ${trendText}`;
    if (d.avgPlayTime) s += ` 평균 플레이 시간은 약 ${Math.round(d.avgPlayTime / 60)}분입니다.`;
    const keywords: string[] = [];
    if (d.primaryRole) keywords.push(`${roleWord} 선호`);
    if (top && top.games >= 20) keywords.push(`${top.name} 애용`);
    if (trendText) keywords.push("플레이스타일 변화");
    keywords.push("일반전 표본");
    return { persona, summary: s, keywords };
  }

  // ── 공식전: 승률·KDA·폼 포함 ──────────────────────────────────────
  const form = d.recentForm ?? [];
  const recentN = form.length;
  const recentWins = form.filter((r) => r === "win").length;

  let prefix: string;
  if (d.primaryRole === "support") prefix = "안정적인";
  else if (d.avgKda >= 3.5 || d.winRate >= 57) prefix = "공격적인";
  else if (d.winRate >= 50) prefix = "밸런스형";
  else prefix = "성장하는";
  const persona = total ? `${prefix} ${roleWord}` : "데이터 수집 중";

  let formWord: string | null = null;
  if (recentN >= 5) {
    const r = recentWins / recentN;
    formWord = r >= 0.6 ? "상승세" : r <= 0.4 ? "주춤한 흐름" : "기복 있는 흐름";
  }

  let s = `통산 ${total.toLocaleString()}경기 기준, ${roleWord} 중심의 플레이어예요.`;
  if (top) s += ` 주력 캐릭터는 ${top.name}(${top.games}판·승률 ${top.winRate}%).`;
  if (trendText) s += ` ${trendText}`;
  s += ` 통산 승률은 ${d.winRate}%`;
  if (formWord) s += `, 최근 ${recentN}판 ${recentWins}승 ${recentN - recentWins}패로 ${formWord}`;
  s += ".";

  const keywords: string[] = [];
  if (d.primaryRole) keywords.push(`${roleWord} 선호`);
  if (d.avgKda >= 3.5) keywords.push("높은 KDA");
  if (formWord === "상승세") keywords.push("최근 폼 상승");
  if (top && top.games >= 20 && top.winRate >= 55) keywords.push(`${top.name} 장인`);
  if (trendText) keywords.push("플레이스타일 변화");
  return { persona, summary: s, keywords };
}
