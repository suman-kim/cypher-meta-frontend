/**
 * 앱 플레이어·매치 화면용 순수 계산 함수 모음 (fetch 없음, 서버·클라이언트 어디서나 사용).
 *
 * - 요일×시간 히트맵(7×24)과 "가장 많이 플레이하는 시간대" 문장
 * - 일반전 플레이 요약(판수·자주 쓴 캐릭터)
 * - 웹 분석 문구에 섞인 이모지 제거
 * - 최근 매치 흐름(연승·연패) 계산
 * 웹 lib(profile.ts 등)는 고치지 않고, 앱에서 더 필요한 모양만 여기서 만든다.
 */
import { kstDateParts } from "@/lib/format";
import type { MatchRow } from "@/lib/types";

/* ── 요일×시간 히트맵 ─────────────────────────── */

/** 히트맵 행 순서(월~일)의 표시 글자 */
export const WEEK_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

/** 요일×시간 히트맵 */
export interface WeekHeat {
  /** grid[요일 0=월 … 6=일][시 0~23] = 그 칸의 경기 수 */
  grid: number[][];
  /** 한 칸의 최대 경기 수 (색 농도 기준) */
  max: number;
  /** 집계한 전체 경기 수 */
  total: number;
  /** "평일 21~24시, 주말 12~15시에 가장 많이 플레이해요" 같은 요약 (경기가 없으면 null) */
  peakText: string | null;
}

/**
 * 매치 목록을 KST 기준 요일×시간 칸으로 센다.
 * @param matches 매치 목록 (date 는 Neople KST 벽시계 문자열)
 * @returns 7×24 히트맵과 요약 문장
 */
export function buildWeekHeat(matches: MatchRow[]): WeekHeat {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  let total = 0;
  let max = 0;
  for (const m of matches) {
    const p = kstDateParts(m.date);
    if (!p) continue;
    // kstDateParts 의 weekday 는 0=일요일 → 월요일을 0 으로 옮긴다
    const row = (p.weekday + 6) % 7;
    grid[row][p.hour] += 1;
    total += 1;
    if (grid[row][p.hour] > max) max = grid[row][p.hour];
  }
  return { grid, max, total, peakText: total > 0 ? peakSentence(grid) : null };
}

/**
 * 평일·주말 각각 3시간 묶음 중 가장 많이 플레이한 구간을 문장으로 만든다.
 * @param grid 7×24 히트맵 (0=월)
 * @returns 요약 문장
 */
function peakSentence(grid: number[][]): string | null {
  /** 행 범위(시작~끝 요일)의 3시간 묶음별 합계 중 최대 구간 */
  const peakOf = (from: number, to: number): { start: number; n: number } | null => {
    let best: { start: number; n: number } | null = null;
    for (let start = 0; start < 24; start += 3) {
      let n = 0;
      for (let r = from; r <= to; r++) for (let h = start; h < start + 3; h++) n += grid[r][h];
      if (n > 0 && (!best || n > best.n)) best = { start, n };
    }
    return best;
  };
  const wd = peakOf(0, 4);
  const we = peakOf(5, 6);
  const part = (label: string, p: { start: number } | null) => (p ? `${label} ${p.start}~${p.start + 3}시` : null);
  const parts = [part("평일", wd), part("주말", we)].filter(Boolean);
  if (parts.length === 0) return null;
  return `${parts.join(", ")}에 가장 많이 플레이해요`;
}

/* ── 일반전 플레이 요약 ───────────────────────── */

/** 일반전 플레이 요약 (공식전·전체 보기에서 개인 분석 카드 아래에 보여 준다) */
export interface NormalPlaySummary {
  /** 최근 수집된 일반전 판수 */
  count: number;
  /** 수집 한도에 닿았는지 (true 면 "100+판"으로 표시) */
  capped: boolean;
  /** 가장 많이 고른 캐릭터 (없으면 null) */
  topCharacter: { characterId?: string; characterName: string; count: number } | null;
}

/**
 * 최근 일반전 목록에서 판수와 가장 많이 쓴 캐릭터를 뽑는다.
 * @param rows 최근 일반전 매치 목록
 * @param limit 수집 한도 (이 수에 닿으면 capped=true)
 */
export function buildNormalPlay(rows: MatchRow[], limit: number): NormalPlaySummary {
  const map = new Map<string, { characterId?: string; count: number }>();
  for (const m of rows) {
    const name = m.playInfo?.characterName;
    if (!name) continue;
    const cur = map.get(name) ?? { characterId: m.playInfo?.characterId, count: 0 };
    cur.count += 1;
    map.set(name, cur);
  }
  let top: NormalPlaySummary["topCharacter"] = null;
  for (const [characterName, v] of map) {
    if (!top || v.count > top.count) top = { characterName, characterId: v.characterId, count: v.count };
  }
  return { count: rows.length, capped: rows.length >= limit, topCharacter: top };
}

/* ── 문자열 정리 ───────────────────────────────── */

/**
 * 웹 분석 문구에 섞인 이모지를 지운다. (앱 화면은 이모지를 쓰지 않는다)
 * @param s 원문
 * @returns 이모지와 겹친 공백을 지운 글
 */
export function stripEmoji(s: string): string {
  return s
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/·\s*·/g, "·")
    .trim();
}

/* ── 최근 흐름 ─────────────────────────────────── */

/**
 * 최신순 결과 목록의 맨 앞 연승·연패를 센다.
 * @param form 최신순 결과("win" | "lose" | 그 밖)
 * @returns "2연승 중" / "3연패 중" (2판 미만이면 null)
 */
export function streakText(form: string[]): string | null {
  const first = form[0];
  if (first !== "win" && first !== "lose") return null;
  let n = 0;
  for (const r of form) {
    if (r === first) n += 1;
    else break;
  }
  if (n < 2) return null;
  return first === "win" ? `${n}연승 중` : `${n}연패 중`;
}

/**
 * 숫자를 짧게(만 단위) 적는다. 39641 → "3.9만", 8200 → "8,200"
 * @param n 숫자 (없으면 "-")
 */
export function shortNum(n?: number | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "-";
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  return n.toLocaleString("ko-KR");
}
