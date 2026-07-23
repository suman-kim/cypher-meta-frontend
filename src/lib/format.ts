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

/** KST 기준 "2026년 7월 24일 오전 12시 18분" 형식으로 통일. */
export function formatKoreanDateTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(String(dateStr).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(dateStr);
  // Asia/Seoul 기준 24시간 성분을 뽑아, 오전/오후·12시간은 직접 계산(로컬 dayPeriod가 AM/PM으로 나오는 환경 대응).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour24 = parseInt(g("hour"), 10) || 0;
  const period = hour24 < 12 ? "오전" : "오후";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${g("year")}년 ${parseInt(g("month"), 10)}월 ${parseInt(g("day"), 10)}일 ${period} ${hour12}시 ${g("minute")}분`;
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
 * 7일이 넘으면 'M월 D일'(다른 해면 연도 포함). KST 기준.
 */
export function formatMatchListDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(String(dateStr).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(dateStr);
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
  // 7일 이전(또는 시계 오차로 미래) → 'M월 D일' (다른 해면 연도 포함), KST
  const ymd = (date: Date) => {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(date);
    const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
    return { y: g("year"), m: g("month"), day: g("day") };
  };
  const a = ymd(d);
  const b = ymd(now);
  return a.y === b.y ? `${a.m}월 ${a.day}일` : `${a.y}년 ${a.m}월 ${a.day}일`;
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
 * KST(Asia/Seoul) 기준 요일(0=일~6=토)·시(0~23)를 추출.
 * 주 플레이 시간대 히트맵용. 표시용 formatKoreanDateTime 과 동일한 파싱을 써서
 * 매치 시간 표기와 버킷이 어긋나지 않게 한다.
 */
export function kstDateParts(dateStr?: string): { weekday: number; hour: number } | null {
  if (!dateStr) return null;
  const d = new Date(String(dateStr).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "", 10);
  const y = g("year");
  const m = g("month");
  const day = g("day");
  const hour = g("hour");
  if (!y || !m || !day || Number.isNaN(hour)) return null;
  const weekday = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  return { weekday, hour: hour % 24 };
}
