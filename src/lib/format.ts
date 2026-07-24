/** 포맷 유틸 (KDA, 승률, 날짜, 시간 등) */

import type { PlayerRecord } from "./types";

/** 전적 레코드에서 승/패/중단 수를 정규화해 읽음 (win 또는 winCount 대응) */
export function readRecord(r?: PlayerRecord): { win: number; lose: number; stop: number } {
  return {
    win: r?.win ?? r?.winCount ?? 0,
    lose: r?.lose ?? r?.loseCount ?? 0,
    stop: r?.stop ?? r?.stopCount ?? 0,
  };
}

export function calcKDA(kill = 0, death = 0, assist = 0): number {
  if (death === 0) return kill + assist; // Perfect
  return (kill + assist) / death;
}

export function formatKDA(kill = 0, death = 0, assist = 0): string {
  return calcKDA(kill, death, assist).toFixed(2);
}

export function kdaColor(kda: number): string {
  if (kda >= 5) return "#e3b23c"; // gold
  if (kda >= 3) return "#4f8ff0"; // blue
  if (kda >= 2) return "#4fbf6b"; // green
  return "#9aa7b4"; // gray
}

export function winRate(win = 0, lose = 0): number {
  const total = win + lose;
  if (total === 0) return 0;
  return Math.round((win / total) * 1000) / 10; // 소수 1자리
}

/** 초 → "m분 s초" */
export function formatPlayTime(seconds?: number): string {
  if (!seconds || seconds <= 0) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s.toString().padStart(2, "0")}초`;
}

/* ──────────────────────────────────────────────────────────────────────────
 * 매치 시각 파싱 — 중요.
 * Neople 오픈 API 의 date 는 "YYYY-MM-DD HH:MM(:SS)" 형식이며 타임존 표기가 없는
 * KST(Asia/Seoul) '벽시계' 시각이다. 예전에는 new Date(str) 로 파싱했는데,
 * 타임존이 없는 date-time 문자열은 JS 가 '서버 로컬 타임존'으로 해석한다.
 *   - 로컬 개발(KST) → 로컬=KST 라 우연히 맞음
 *   - Vercel(UTC)   → 문자열을 UTC 로 해석한 뒤 Asia/Seoul 로 다시 표기하며 +9h 밀림
 * → 그래서 '주 플레이 시간대'가 로컬과 운영에서 달랐다.
 * 아래처럼 문자열 성분을 '직접' 뽑으면 서버 타임존과 무관하게 항상 KST 로 동일하다.
 * ────────────────────────────────────────────────────────────────────────── */
interface KstParts {
  year: number;
  month: number; // 1~12
  day: number;
  hour: number; // 0~23
  minute: number;
  second: number;
}

/** "YYYY-MM-DD HH:MM(:SS)" (또는 T 구분) 를 성분 그대로 파싱. 타임존 변환 없음. */
export function parseKstParts(dateStr?: string): KstParts | null {
  if (!dateStr) return null;
  const mt = String(dateStr).match(
    /(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!mt) return null;
  return {
    year: +mt[1],
    month: +mt[2],
    day: +mt[3],
    hour: +mt[4],
    minute: +mt[5],
    second: mt[6] ? +mt[6] : 0,
  };
}

/** KST 벽시계 성분 → 절대 시각(Date). KST=UTC+9, DST 없음. 상대시간 계산용. */
function kstToInstant(p: KstParts): Date {
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour - 9, p.minute, p.second));
}

/** KST 기준 "2026년 7월 24일 오전 12시 18분" 형식으로 통일. (서버 타임존 무관) */
export function formatKoreanDateTime(dateStr?: string): string {
  if (!dateStr) return "";
  const p = parseKstParts(dateStr);
  if (!p) return String(dateStr);
  const period = p.hour < 12 ? "오전" : "오후";
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${p.year}년 ${p.month}월 ${p.day}일 ${period} ${hour12}시 ${String(p.minute).padStart(2, "0")}분`;
}

export function formatDate(dateStr?: string): string {
  return formatKoreanDateTime(dateStr);
}

/** 사용자 요청으로 모든 날짜를 절대 표기로 통일 (기존 'N분 전' 상대표기 → 절대표기). */
export function relativeTime(dateStr?: string): string {
  return formatKoreanDateTime(dateStr);
}

/**
 * 최근 전적 목록용 짧은 날짜: 상대 시간(방금 전/N분 전/N시간 전/N일 전),
 * 7일이 넘으면 'M월 D일'(다른 해면 연도 포함). KST 기준 · 서버 타임존 무관.
 */
export function formatMatchListDate(dateStr?: string): string {
  if (!dateStr) return "";
  const p = parseKstParts(dateStr);
  if (!p) return String(dateStr);
  const d = kstToInstant(p); // 정확한 절대 시각 (KST=UTC+9)
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec >= 0) {
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (sec < 60) return "방금 전";
    if (min < 60) return `${min}분 전`;
    if (hr < 24) return `${hr}시간 전`;
    if (day < 7) return `${day}일 전`;
  }
  // 7일 이전(또는 시계 오차로 미래) → 'M월 D일' (다른 해면 연도 포함)
  const nowParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const gn = (t: string) => nowParts.find((x) => x.type === t)?.value ?? "";
  return String(p.year) === gn("year")
    ? `${p.month}월 ${p.day}일`
    : `${p.year}년 ${p.month}월 ${p.day}일`;
}

export function formatNumber(n?: number): string {
  if (n === undefined || n === null) return "-";
  return n.toLocaleString("ko-KR");
}

/**
 * KST(Asia/Seoul) 기준 날짜 문자열(YYYY-MM-DD). offsetDays 만큼 이전 날짜 반환(0 = 오늘).
 * 서버 타임존과 무관하게 한국 날짜로 계산한다. (이전에는 UTC 날짜를 써서,
 * KST 자정~오전 9시 사이엔 endDate 가 '어제'로 잡혀 당일 경기가 조회에서 빠지는 버그가 있었다.)
 * KST 는 DST 가 없어 UTC 앵커로 일수를 가감해도 안전하다.
 */
function kstDateString(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const g = (t: string) => Number(parts.find((x) => x.type === t)?.value);
  const anchor = new Date(Date.UTC(g("year"), g("month") - 1, g("day")));
  anchor.setUTCDate(anchor.getUTCDate() - offsetDays);
  return anchor.toISOString().slice(0, 10);
}

/** YYYY-MM-DD (KST 오늘 기준 n일 전) */
export function dateNDaysAgo(n: number): string {
  return kstDateString(n);
}

/** YYYY-MM-DD (KST 오늘) */
export function todayStr(): string {
  return kstDateString(0);
}

/**
 * KST(Asia/Seoul) 기준 요일(0=일~6=토)·시(0~23)를 추출. 주 플레이 시간대 히트맵용.
 * Neople date 는 타임존 없는 KST 벽시계이므로 성분을 '직접' 파싱한다.
 * (new Date() 로 파싱하면 서버 로컬 타임존으로 해석돼 Vercel(UTC)에서 +9h 밀린다.)
 */
export function kstDateParts(dateStr?: string): { weekday: number; hour: number } | null {
  const p = parseKstParts(dateStr);
  if (!p) return null;
  // 요일은 타임존과 무관하게 UTC 앵커로 계산 (날짜 성분만 사용)
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return { weekday, hour: p.hour % 24 };
}
