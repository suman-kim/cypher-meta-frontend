"use client";

/**
 * NavDropdown — 헤더의 2단 메뉴(메타 / 검색 / 정보 …).
 * 상위 제목을 누르면 하위 메뉴(아이콘·이름·설명)가 펼쳐지고, 바깥 클릭·Esc·페이지 이동 시 닫힌다.
 * 하위 메뉴 중 현재 페이지가 있으면 상위 제목도 활성 표시한다.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isNavItemActive, type NavGroup } from "./nav-menu";

/**
 * @param group — 메뉴 묶음(제목 + 하위 메뉴)
 */
export default function NavDropdown({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groupActive = group.items.some((it) => isNavItemActive(pathname, it.href));

  // 페이지가 바뀌면 닫는다
  useEffect(() => setOpen(false), [pathname]);

  // 바깥 클릭·Esc 로 닫기
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
        className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-2.5 text-sm font-medium transition-colors xl:px-3 ${
          // 밑줄은 현재 페이지가 속한 메뉴에만 — 펼친 메뉴는 글자만 밝게(밑줄이 두 곳에 겹치지 않게)
          groupActive
            ? "border-primary text-primary"
            : open
              ? "border-transparent text-gray-100"
              : "border-transparent text-gray-400 hover:text-gray-100"
        }`}
      >
        {group.label}
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
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        role="menu"
        className={`absolute left-0 top-full z-40 mt-1.5 w-72 origin-top-left rounded-xl border border-line bg-surface p-1.5 shadow-float transition-all duration-150 ${
          open ? "visible translate-y-0 scale-100 opacity-100" : "pointer-events-none invisible -translate-y-1 scale-[0.98] opacity-0"
        }`}
      >
        {group.items.map((it) => {
          const active = isNavItemActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${active ? "bg-surface-2" : "hover:bg-surface-2"}`}
            >
              <span
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                  active ? "bg-primary/15 text-primary" : "bg-surface-3 text-gray-400"
                }`}
              >
                {it.icon}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${active ? "text-primary" : "text-gray-100"}`}>{it.label}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{it.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
