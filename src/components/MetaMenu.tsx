"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ITEMS = [
  {
    href: "/meta",
    label: "캐릭터 티어",
    desc: "역할별 티어 · 커뮤니티 투표",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
      </svg>
    ),
  },
  {
    href: "/meta/comp",
    label: "조합 티어",
    desc: "5인 조합 통계 · 추천 투표",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export default function MetaMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const metaActive = pathname === "/meta" || pathname.startsWith("/meta/");
  const isActive = (href: string) =>
    href === "/meta" ? pathname === "/meta" : pathname.startsWith(href);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-stretch">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-1 border-b-2 px-3 text-sm font-medium transition-colors ${
          metaActive || open
            ? "border-primary text-primary"
            : "border-transparent text-gray-400 hover:text-gray-100"
        }`}
      >
        메타
        <svg
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        role="menu"
        className={`absolute left-0 top-full z-40 mt-1.5 w-64 origin-top-left rounded-xl border border-line bg-surface p-1.5 shadow-float transition-all duration-150 ${
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible -translate-y-1 scale-[0.98] opacity-0"
        }`}
      >
        {ITEMS.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                active ? "bg-surface-2" : "hover:bg-surface-2"
              }`}
            >
              <span
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                  active ? "bg-primary/15 text-primary" : "bg-surface-3 text-gray-400"
                }`}
              >
                {it.icon}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${active ? "text-primary" : "text-gray-100"}`}>
                  {it.label}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">{it.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
