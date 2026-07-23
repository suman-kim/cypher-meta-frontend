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

/** API 날짜 문자열("2024-01-02 15:04:05") → 상대/절대 표기 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const normalized = dateStr.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const normalized = dateStr.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return dateStr;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
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
