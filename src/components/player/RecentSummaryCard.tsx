"use client";

import { useState } from "react";
import type { RecentSummary } from "@/lib/profile";

const TONE: Record<string, string | undefined> = {
  good: "rgb(var(--win))",
  bad: "rgb(var(--lose))",
  neutral: undefined,
};

/**
 * 현재 탭 기준 최근 전적 AI 분석(서술 + 지표 타일).
 * 제목 줄은 개인 분석·최근 전적과 같이 카드 바깥에 둔다(제목 + 칩 + 접기 버튼).
 * 모바일/태블릿(lg 미만)에서는 접기/펼치기 버튼으로 열고 닫을 수 있으며 기본은 열림.
 * 데스크톱(lg 이상)에서는 버튼 없이 항상 펼쳐진다.
 * @param summary — 최근 전적 요약(서술·지표 타일·표본 수)
 * @param basisLabel — 현재 기준 탭 라벨(전체/공식전/일반전)
 */
export default function RecentSummaryCard({
  summary,
  basisLabel,
}: {
  summary: RecentSummary;
  basisLabel?: string;
}) {
  const [open, setOpen] = useState(true);
  if (summary.sample === 0) return null;

  return (
    <section className="space-y-3">
      {/* 제목 줄 — 개인 분석과 같은 형태(카드 바깥) */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <h2 className="text-lg font-bold text-gray-100">AI 전적 분석</h2>
        <span className="chip bg-surface-2 text-[11px] text-gray-500">최근 {summary.sample}판 분석</span>
        {basisLabel && (
          <span className="chip bg-primary/10 text-[11px] font-semibold text-primary">{basisLabel}</span>
        )}
        {/* 접기/펼치기 — 모바일/태블릿 전용(데스크톱은 항상 펼침) */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="ai-summary-body"
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-semibold text-gray-400 transition-colors hover:text-gray-100 lg:hidden"
        >
          {open ? "접기" : "펼치기"}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <div
        id="ai-summary-body"
        className={`relative overflow-hidden rounded-xl border border-line bg-surface p-4 sm:p-5 ${open ? "block" : "hidden"} lg:block`}
      >
        {/* AI 느낌의 상단 그라데이션 악센트 */}
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative">
          {/* 서술 분석 */}
          <div className="space-y-2">
            {summary.analysis.map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-gray-300">
                {para}
              </p>
            ))}
          </div>

          {/* 지표 타일 */}
          {summary.items.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {summary.items.map((it) => (
                <div key={it.title} className="rounded-lg border border-line bg-surface-2 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                    <span>{it.icon}</span>
                    {it.title}
                  </div>
                  <div
                    className="mt-1 truncate text-lg font-black"
                    style={{ color: it.tone && it.tone !== "neutral" ? TONE[it.tone] : "rgb(var(--g50))" }}
                    title={it.value}
                  >
                    {it.value}
                  </div>
                  {it.sub && <div className="mt-0.5 truncate text-[11px] text-gray-500">{it.sub}</div>}
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
            * 현재{basisLabel ? ` ‘${basisLabel}’` : ""} 탭의 최근 {summary.sample}판 전적을 자동 분석한 결과입니다. 탭(전체·공식전·일반전)을 바꾸면 분석 기준과 표본도 함께 바뀝니다.
          </p>
        </div>
      </div>
    </section>
  );
}
