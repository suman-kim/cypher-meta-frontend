"use client";

/**
 * Header — 상단 헤더(로고 · 메뉴 · 검색창 · 테마 전환).
 * 메뉴 구성은 nav-menu.tsx(NAV_ENTRIES) 하나를 데스크톱·모바일이 함께 쓴다.
 *  - 데스크톱(md 이상): 단일 링크 + 2단 드롭다운(메타 / 검색 / 정보)
 *  - 모바일: 햄버거 패널 — 2단 묶음은 눌러서 펼치는 아코디언(현재 페이지가 속한 묶음은 처음부터 펼침)
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import NavDropdown from "./NavDropdown";
import Logo from "./Logo";
import { isNavItemActive, NAV_ENTRIES, type NavGroup } from "./nav-menu";
import { useUnseenUpdate } from "@/lib/updates-client";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasUnseenUpdate = !!useUnseenUpdate(); // 헤더 '업데이트' NEW 표시용

  // 경로가 바뀌면 모바일 메뉴 자동 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface lg:bg-surface/80 lg:backdrop-blur">
      {/* z-40: 홈 히어로 검색창(relative z-30)이 스크롤 시 헤더·모바일 메뉴 위로 올라오지 않게. 모달(z-50↑)보다는 아래 */}
      <div className="container-app flex h-16 items-center gap-4">
        <Link href="/" aria-label="Cyphers Meta 홈" className="flex shrink-0 items-center">
          <Logo />
        </Link>

        {/* 데스크톱 네비게이션 — 단일 링크 + 2단 드롭다운 */}
        <nav className="ml-2 hidden h-full items-stretch gap-0.5 md:flex xl:gap-1">
          {NAV_ENTRIES.map((e) =>
            e.kind === "group" ? (
              <NavDropdown key={e.label} group={e} />
            ) : (
              <Link
                key={e.href}
                href={e.href}
                className={`flex items-center whitespace-nowrap border-b-2 px-2.5 text-sm font-medium transition-colors xl:px-3 ${
                  isNavItemActive(pathname, e.href)
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-400 hover:text-gray-100"
                }`}
              >
                {e.label}
                {e.href === "/updates" && hasUnseenUpdate && (
                  <span aria-label="새 업데이트" className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                )}
              </Link>
            ),
          )}
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

      {/* 모바일 메뉴 패널 — 2단 묶음은 아코디언 */}
      {mobileOpen && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-surface md:hidden">
          <nav className="container-app space-y-1 py-3">
            {NAV_ENTRIES.map((e) =>
              e.kind === "group" ? (
                <MobileGroup key={e.label} group={e} pathname={pathname} />
              ) : (
                <Link
                  key={e.href}
                  href={e.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center rounded-xl px-3 py-3 text-[15px] font-semibold transition-colors ${
                    isNavItemActive(pathname, e.href) ? "bg-surface-2 text-primary" : "text-gray-200 hover:bg-surface-2"
                  }`}
                >
                  {e.label}
                  {e.href === "/updates" && hasUnseenUpdate && (
                    <span className="ml-1.5 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">NEW</span>
                  )}
                </Link>
              ),
            )}

            <div className="px-1 pt-3">
              <SearchBar />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/**
 * 모바일 메뉴의 2단 묶음 — 제목을 누르면 하위 메뉴(아이콘·이름·설명)가 펼쳐진다.
 * 현재 페이지가 이 묶음에 속하면 처음부터 펼쳐 둔다.
 * @param group — 메뉴 묶음
 * @param pathname — 현재 경로
 */
function MobileGroup({ group, pathname }: { group: NavGroup; pathname: string }) {
  const active = group.items.some((it) => isNavItemActive(pathname, it.href));
  const [open, setOpen] = useState(active);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center rounded-xl px-3 py-3 text-[15px] font-semibold transition-colors hover:bg-surface-2 ${
          active ? "text-primary" : "text-gray-200"
        }`}
      >
        {group.label}
        <span className="ml-2 text-[11px] font-medium text-gray-500">{group.items.map((it) => it.label).join(" · ")}</span>
        <svg
          className={`ml-auto shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          width="14"
          height="14"
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
      {open && (
        <div className="mb-1 ml-3 space-y-0.5 border-l border-line pl-2">
          {group.items.map((it) => {
            const on = isNavItemActive(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${on ? "bg-surface-2" : "hover:bg-surface-2"}`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    on ? "bg-primary/15 text-primary" : "bg-surface-3 text-gray-400"
                  }`}
                >
                  {it.icon}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${on ? "text-primary" : "text-gray-100"}`}>{it.label}</span>
                  <span className="block truncate text-[11px] text-gray-500">{it.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
