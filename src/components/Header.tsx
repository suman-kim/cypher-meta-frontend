"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/meta", label: "메타" },
  { href: "/ranking", label: "랭킹" },
  { href: "/characters", label: "캐릭터" },
  { href: "/items", label: "아이템" },
  { href: "/community", label: "커뮤니티" },
];

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="container-app flex h-16 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center text-xl font-extrabold tracking-tight">
          <span className="text-primary">CYPHERS</span>
          <span className="text-gray-100">.STATS</span>
        </Link>

        <nav className="ml-2 hidden h-full items-stretch gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-400 hover:text-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
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
        </div>
      </div>
    </header>
  );
}
