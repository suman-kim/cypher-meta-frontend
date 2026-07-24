"use client";

import { useState, type ReactNode } from "react";

/**
 * 헤더를 탭으로, 본문을 접기/펼치기 하는 카드.
 * 데스크톱(lg+)은 항상 펼쳐지고, 모바일/태블릿에서만 토글(셰브론)로 열고 닫는다.
 */
export default function CollapsibleCard({
  header,
  children,
  defaultOpen = true,
  headerClassName = "",
}: {
  header: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  headerClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2 text-left lg:cursor-default ${headerClassName}`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">{header}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform lg:hidden ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className={open ? "block" : "hidden lg:block"}>{children}</div>
    </div>
  );
}
