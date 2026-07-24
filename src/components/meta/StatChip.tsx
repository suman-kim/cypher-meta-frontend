"use client";

import { useState } from "react";

/**
 * 헤더 표본 통계 칩. 각 지표가 "무슨 데이터"인지 설명 툴팁을 제공한다.
 * - 데스크톱: 마우스 오버로 설명 표시
 * - 모바일: 탭(클릭)으로 토글
 * - sub: 값 뒤에 붙는 작은 보조 텍스트(예: 순회 진행도)
 */
export function StatChip({
  label,
  value,
  tip,
  sub,
  muted = false,
}: {
  label: string;
  value: string;
  tip: string;
  sub?: string;
  muted?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`${label} 설명`}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className={`chip inline-flex items-center gap-1 bg-surface-2 transition-colors hover:text-gray-100 ${
          muted ? "text-gray-500" : "text-gray-300"
        }`}
      >
        <span>
          {label} <b className="font-bold">{value}</b>
          {sub && <span className="ml-1 font-normal text-gray-500">{sub}</span>}
        </span>
        <svg
          className="h-3 w-3 shrink-0 text-gray-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1.5 w-64 rounded-lg border border-line bg-surface p-2.5 text-left text-[11px] font-normal leading-relaxed text-gray-300 shadow-xl"
        >
          {tip}
        </span>
      )}
    </span>
  );
}
