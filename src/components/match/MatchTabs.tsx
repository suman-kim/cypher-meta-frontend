"use client";

import { useState, type ReactNode } from "react";

export interface MatchTabItem {
  key: string;
  label: string;
  content: ReactNode;
}

/** 매치 상세 탭 (종합/분석). 서버에서 렌더된 content 를 받아 토글만 담당. */
export default function MatchTabs({ tabs }: { tabs: MatchTabItem[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-line bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-bold transition-colors ${
              active === t.key ? "bg-surface-2 text-primary" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} className={active === t.key ? "" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
