/**
 * analysis.ts — 개인 히스토리 요약(GET /meta/history/:playerId) 타입과
 * 규칙 기반 페르소나/요약 문장 생성기. (LLM 없이 결정적)
 * 공식전(rating)은 승률·KDA 포함, 일반전(normal)은 API가 승패/KDA를 주지 않아 픽·플레이 중심.
 */
import { ROLE_LABELS } from "./meta";

export interface HistoryPosition {
  role: string;
  games: number;
  share: number;
  winRate: number;
}
export interface HistoryTopChar {
  name: string;
  role: string;
  games: number;
  wins: number;
  winRate: number;
  kda: number;
}
export interface HistoryYear {
  year: number;
  games: number;
  winRate: number;
  topCharacter: string | null;
  topRole: string | null;
}
export interface PlayerHistorySummary {
  playerId: string;
  gameType?: string;
  coverage: { total: number; oldest: string | null; newest: string | null };
  winRate: number;
  wins: number;
  losses: number;
  decided?: number;
  avgKda: number;
  avgPlayTime?: number;
  primaryRole: string | null;
  positions: HistoryPosition[];
  topCharacters: HistoryTopChar[];
  byYear: HistoryYear[];
  recentForm: string[];
}

/** 역할 코드 → 한글 라벨(미분류/누락은 "올라운더"). */
export const roleLabel = (r?: string | null): string =>
  (r && ROLE_LABELS[r as keyof typeof ROLE_LABELS]) || "올라운더";

/** 포지션 도넛/뱃지 역할별 색상. */
export const ROLE_COLORS: Record<string, string> = {
  tank: "#3b82f6",
  melee: "#f97316",
  ranged: "#a855f7",
  support: "#10b981",
  etc: "#94a3b8",
};

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
