"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const COOLDOWN_MS = 5 * 60 * 1000; // 5분 이내 재갱신 금지

/** 갱신 경과를 짧은 상대표현으로. */
function relAgo(cachedMs: number, now: number): string {
  const s = Math.max(0, Math.floor((now - cachedMs) / 1000));
  if (s < 60) return "방금 전";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/**
 * 전적 갱신 버튼 — refresh 로 서버 재렌더(모든 캐시 무시 재조회).
 * - 마지막 갱신이 5분 이내면 쿨다운 비활성화 + 남은 시간 카운트다운.
 * - 마지막 갱신 시각("N분 전")은 호버 툴팁으로 표시.
 */
export function RefreshStatsButton({
  className,
  cachedAt,
}: {
  className?: string;
  cachedAt?: string | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // URL 에 남은 refresh 파라미터를 조용히 제거(히스토리만 교체 → 재조회/재렌더 없음).
  const cleanRefreshParam = () => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (!u.searchParams.has("refresh")) return;
    u.searchParams.delete("refresh");
    const qs = u.searchParams.toString();
    window.history.replaceState(window.history.state, "", u.pathname + (qs ? `?${qs}` : ""));
  };
  useEffect(() => {
    cleanRefreshParam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const prevPending = useRef(false);
  useEffect(() => {
    if (prevPending.current && !pending) cleanRefreshParam();
    prevPending.current = pending;
  }, [pending]);

  const cachedMs = cachedAt ? new Date(cachedAt).getTime() : NaN;
  const hasCached = now != null && !Number.isNaN(cachedMs);
  const remaining = hasCached ? Math.max(0, COOLDOWN_MS - (now! - cachedMs)) : 0;
  const cooling = remaining > 0;
  const disabled = pending || cooling;

  const onClick = () => {
    if (disabled || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("refresh", String(Date.now()));
    const url = `${window.location.pathname}?${params.toString()}`;
    start(() => router.push(url, { scroll: false }));
  };

  const sec = Math.ceil(remaining / 1000);
  const countdown = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const tooltip = hasCached ? `${relAgo(cachedMs, now!)}` : null;

  const base =
    "group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-full px-4 text-xs font-bold transition-all duration-200";
  const active =
    "bg-gradient-to-r from-primary to-primary-strong text-white shadow-lg shadow-primary/25 ring-1 ring-inset ring-white/15 hover:-translate-y-0.5 hover:shadow-primary/45 active:scale-95";
  const muted = "cursor-not-allowed bg-surface-3 text-gray-400 ring-1 ring-inset ring-line";

  return (
    <div className={`group/refresh relative inline-flex ${className ?? ""}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label="전적 갱신 (캐시 무시 재조회)"
        className={`${base} ${cooling ? muted : active}`}
      >
        {cooling ? (
          <svg
            className="relative z-10 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        ) : (
          <svg
            className={`relative z-10 h-4 w-4 transition-transform duration-500 ${
              pending ? "animate-spin" : "group-hover:rotate-180"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        )}
        <span className="relative z-10 tabular-nums">
          {pending ? "갱신 중…" : cooling ? `${countdown} 후` : "전적 갱신"}
        </span>
        {!cooling && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.5)_50%,transparent_65%)] transition-transform duration-700 ease-out group-hover:translate-x-full"
          />
        )}
      </button>

      {/* 호버 툴팁 — 마지막 갱신 시각 */}
      {tooltip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-gray-300 opacity-0 shadow-lg transition-opacity duration-150 group-hover/refresh:opacity-100"
        >
          {tooltip}
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-line bg-surface" />
        </span>
      )}
    </div>
  );
}

export default RefreshStatsButton;
