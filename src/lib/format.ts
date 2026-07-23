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

export function formatNumber(n?: number): string {
  if (n === undefined || n === null) return "-";
  return n.toLocaleString("ko-KR");
}

/** YYYY-MM-DD (오늘 기준 n일 전) */
export function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
