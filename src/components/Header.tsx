"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import MetaMenu from "./MetaMenu";
import Logo from "./Logo";

/** 메타는 하위 페이지(캐릭터 티어 / 조합 티어)를 드롭다운으로 선택 */
const META_SUB = [
  { href: "/meta", label: "캐릭터 티어" },
  { href: "/meta/comp", label: "조합 티어" },
];

const NAV = [
  { href: "/ranking", label: "랭킹" },
  { href: "/characters", label: "캐릭터" },
  { href: "/items", label: "아이템" },
  { href: "/community", label: "커뮤니티" },
];

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  // 경로가 바뀌면 모바일 메뉴 자동 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/meta" ? pathname === "/meta" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface lg:bg-surface/80 lg:backdrop-blur">
      <div className="container-app flex h-16 items-center gap-4">
        <Link href="/" aria-label="Cyphers Meta 홈" className="flex shrink-0 items-center">
          <Logo />
        </Link>

        {/* 데스크톱 네비게이션 */}
        <nav className="ml-2 hidden h-full items-stretch gap-1 md:flex">
          <MetaMenu />

          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-400 hover:text-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!isHome && (
            <div className="hidden w-48 lg:block xl:w-64">
              <SearchBar />
            </div>
          )}
          <ThemeToggle />
          {/* 로그인 기능은 추후 추가 예정 — 현재 숨김 */}
          <button className="btn-primary hidden px-3 py-2">로그인</button>

          {/* 모바일 햄버거 */}
          <button
            type="button"
            aria-label="메뉴 열기"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-lg text-gray-200 hover:bg-surface-2 md:hidden"
          >
            {mobileOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 패널 */}
      {mobileOpen && (
        <div className="border-t border-line bg-surface md:hidden">
          <nav className="container-app space-y-1 py-3">
            <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              메타
            </div>
            {META_SUB.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(s.href) ? "bg-surface-2 text-primary" : "text-gray-200 hover:bg-surface-2"
                }`}
              >
                {s.label}
              </Link>
            ))}

            <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              메뉴
            </div>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname.startsWith(item.href) ? "bg-surface-2 text-primary" : "text-gray-200 hover:bg-surface-2"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="px-1 pt-3">
              <SearchBar />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
