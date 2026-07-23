"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, FormEvent } from "react";

interface Props {
  defaultValue?: string;
  size?: "lg" | "md";
  autoFocus?: boolean;
}

const RECENT_KEY = "cy_recent_searches";
const MAX_RECENT = 8;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function persist(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* localStorage 사용 불가 시 무시 */
  }
}

export default function SearchBar({ defaultValue = "", size = "md", autoFocus }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  // 바깥 클릭 / Esc 로 닫기
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(q: string) {
    const t = q.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r !== t)].slice(0, MAX_RECENT);
    setRecent(next);
    persist(next);
    setOpen(false);
    router.push(`/search?nickname=${encodeURIComponent(t)}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    go(value);
  }

  function removeOne(q: string) {
    const next = recent.filter((r) => r !== q);
    setRecent(next);
    persist(next);
  }

  function clearAll() {
    setRecent([]);
    persist([]);
  }

  const big = size === "lg";

  return (
    <div ref={wrapRef} className="relative w-full">
      <form onSubmit={onSubmit} className="w-full">
        <div
          className={`flex items-center gap-2 rounded-lg border border-bg-border bg-bg-soft focus-within:border-brand ${
            big ? "px-4 py-3" : "px-3 py-2"
          }`}
        >
          <svg
            className={big ? "h-5 w-5 text-gray-500" : "h-4 w-4 text-gray-500"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={value}
            autoFocus={autoFocus}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="플레이어 닉네임 검색"
            className={`w-full bg-transparent text-gray-100 placeholder:text-gray-500 focus:outline-none ${
              big ? "text-base" : "text-sm"
            }`}
          />
          <button
            type="submit"
            className={`btn-primary shrink-0 ${big ? "px-4 py-2" : "px-3 py-1.5 text-xs"}`}
          >
            검색
          </button>
        </div>
      </form>

      {/* 최근 검색 드롭다운 */}
      {open && recent.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-float">
          <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500">
            <span>최근 검색</span>
            <button type="button" onClick={clearAll} className="hover:text-gray-300">
              전체 삭제
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto pb-1">
            {recent.map((r) => (
              <li key={r} className="flex items-center gap-1 px-1">
                <button
                  type="button"
                  onClick={() => go(r)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-200 hover:bg-surface-2"
                >
                  <svg
                    className="h-4 w-4 shrink-0 text-gray-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  <span className="min-w-0 flex-1 truncate">{r}</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeOne(r)}
                  aria-label="삭제"
                  className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-surface-3 hover:text-gray-200"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
