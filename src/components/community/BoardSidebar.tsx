"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOARDS, isBoard } from "@/lib/community";

export default function BoardSidebar() {
  const pathname = usePathname();
  // /community/{board}/...
  const seg = pathname.split("/")[2] ?? "free";
  const board = isBoard(seg) ? seg : "free";

  return (
    <aside className="space-y-4">
      <div className="card p-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-black text-gray-50">커뮤니티</h2>
          <span className="text-xs text-gray-500">사이퍼즈 소통 공간</span>
        </div>

        <nav className="mt-4 space-y-1">
          {BOARDS.map((b) => {
            const active = b.key === board;
            return (
              <Link
                key={b.key}
                href={`/community/${b.key}`}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-gray-300 hover:bg-surface-2 hover:text-gray-100"
                }`}
              >
                <span aria-hidden>{b.icon}</span>
                {b.label}
              </Link>
            );
          })}
        </nav>

        <Link href={`/community/${board}/write`} className="btn-primary mt-4 w-full">
          ✎ 글쓰기
        </Link>
      </div>

      <Link href="/ranking" className="card block overflow-hidden">
        <div className="bg-gradient-to-br from-navy to-primary p-5">
          <p className="text-xs font-semibold tracking-wide text-white/70">NEW SEASON</p>
          <p className="mt-1 text-base font-extrabold text-white">공식전 시즌 시작</p>
          <p className="mt-3 text-xs font-medium text-white/80">랭킹 보러가기 →</p>
        </div>
      </Link>
    </aside>
  );
}
