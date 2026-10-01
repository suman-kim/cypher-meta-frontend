/**
 * multi.ts — 멀티서치(내 팀·상대 팀 각자의 최근 전적을 한 화면에) 공용 상수·타입·요약 계산 (서버/클라이언트 공용, fetch 없음).
 *
 * 각 플레이어의 최근 공식전 목록(Neople /players/{id}/matches)으로
 * 승률·KDA·최근 흐름·많이 쓴 캐릭터를 카드 한 장에 들어갈 만큼만 요약한다.
 */
import { calcKDA } from "./format";
import type { MatchRow } from "./types";

/** 팀당 최대 인원(5:5 게임) */
export const TEAM_MAX = 5;

/** 멀티서치 요약에 쓰는 최근 경기 수(공식전) */
export const MULTI_RECENT = 20;

/** 최근 흐름(승패 점)에 보여 줄 경기 수 */
export const MULTI_FORM = 10;

/** 많이 쓴 캐릭터 1개 */
export interface MultiCharacter {
  characterId: string;
  characterName: string;
  games: number;
  wins: number;
  winRate: number;
}

/** 플레이어 1명의 최근 전적 요약 */
export interface MultiSummary {
  games: number;
  wins: number;
  losses: number;
  /** 승률(%) — 경기가 없으면 null */
  winRate: number | null;
  kda: number | null;
  avgKill: number;
  avgDeath: number;
  avgAssist: number;
  /** 최근 흐름(최신이 앞) */
  form: ("win" | "lose")[];
  /** 많이 쓴 캐릭터(최대 3) */
  characters: MultiCharacter[];
}

/**
 * 최근 공식전 목록 → 카드용 요약.
 * @param rows — 최근 경기(최신순)
 * @returns 승률·KDA·최근 흐름·많이 쓴 캐릭터
 */
export function buildMultiSummary(rows: MatchRow[]): MultiSummary {
  const decided = rows.filter((r) => r.playInfo?.result === "win" || r.playInfo?.result === "lose");
  const wins = decided.filter((r) => r.playInfo.result === "win").length;
  const sum = (k: "killCount" | "deathCount" | "assistCount") => decided.reduce((n, r) => n + (r.playInfo?.[k] ?? 0), 0);
  const [k, d, a] = [sum("killCount"), sum("deathCount"), sum("assistCount")];
  const n = decided.length;
  const avg = (v: number) => (n ? Math.round((v / n) * 10) / 10 : 0);

  const chars = new Map<string, MultiCharacter>();
  for (const r of decided) {
    const id = r.playInfo?.characterId;
    if (!id) continue;
    const c = chars.get(id) ?? { characterId: id, characterName: r.playInfo.characterName, games: 0, wins: 0, winRate: 0 };
    c.games++;
    if (r.playInfo.result === "win") c.wins++;
    chars.set(id, c);
  }

  return {
    games: n,
    wins,
    losses: n - wins,
    winRate: n ? Math.round((wins / n) * 1000) / 10 : null,
    kda: n ? Math.round(calcKDA(k, d, a) * 100) / 100 : null,
    avgKill: avg(k),
    avgDeath: avg(d),
    avgAssist: avg(a),
    form: decided.slice(0, MULTI_FORM).map((r) => r.playInfo.result as "win" | "lose"),
    characters: [...chars.values()]
      .map((c) => ({ ...c, winRate: Math.round((c.wins / c.games) * 100) }))
      .sort((x, y) => y.games - x.games)
      .slice(0, 3),
  };
}

/**
 * 멀티서치 페이지 주소 — 팀별 닉네임을 반복 파라미터(a=…&a=…&b=…)로 담는다.
 * @param a — 내 팀 닉네임
 * @param b — 상대 팀 닉네임
 * @returns /players/multi?… 경로
 */
export function multiHref(a: string[], b: string[]): string {
  const q = new URLSearchParams();
  a.forEach((v) => q.append("a", v));
  b.forEach((v) => q.append("b", v));
  return `/players/multi?${q.toString()}`;
}

/**
 * 쿼리 값(문자열 | 문자열 배열) → 닉네임 목록(공백 정리, 빈 값·중복 제거, 최대 TEAM_MAX).
 * @param v — searchParams 값
 * @returns 닉네임 목록
 */
export function parseNames(v: string | string[] | undefined): string[] {
  const list = (Array.isArray(v) ? v : v ? [v] : []).map((s) => s.trim()).filter(Boolean);
  return [...new Set(list)].slice(0, TEAM_MAX);
}
