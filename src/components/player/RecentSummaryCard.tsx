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
 * 모바일/태블릿(lg 미만)에서는 헤더를 눌러 열고 닫을 수 있으며 기본은 열림.
 * 데스크톱(lg 이상)에서는 토글 없이 항상 펼쳐진다.
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
    <section className="relative overflow-hidden rounded-xl border border-line bg-surface p-4 sm:p-5">
      {/* AI 느낌의 상단 그라데이션 악센트 */}
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative">
        {/* 헤더 — 모바일/태블릿: 열기·닫기 토글 / 데스크톱(lg): 클릭 비활성(항상 펼침) */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="ai-summary-body"
          className="flex w-full items-center gap-2 text-left lg:pointer-events-none"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            ✨
          </span>
          <h2 className="text-base font-bold text-gray-100">AI 전적 분석</h2>
          <span className="chip hidden bg-surface-2 text-[11px] text-gray-500 sm:inline">
            {basisLabel ? `${basisLabel} · ` : ""}최근 {summary.sample}판 분석
          </span>
          {/* 토글 셰브론 — 모바일/태블릿 전용 */}
          <span
            className={`ml-auto text-gray-500 transition-transform lg:hidden ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>

        {/* 본문 — 모바일: open 시에만 / 데스크톱(lg): 항상 표시 */}
        <div id="ai-summary-body" className={`${open ? "block" : "hidden"} lg:block`}>
          {/* 서술 분석 */}
          <div className="mt-3 space-y-2">
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
