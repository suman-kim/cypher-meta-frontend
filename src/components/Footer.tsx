import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

const NAV = [
  { href: "/meta", label: "캐릭터 티어" },
  { href: "/meta/comp", label: "조합 티어" },
  { href: "/ranking", label: "랭킹" },
  { href: "/characters", label: "캐릭터" },
  { href: "/items", label: "아이템" },
  { href: "/community", label: "커뮤니티" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 bg-surface-2">
      {/* 상단 그라데이션 악센트 라인 */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="container-app py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.7fr_1fr_1fr]">
          {/* 브랜드 */}
          <div>
            <div className="flex items-center text-xl font-extrabold tracking-tight">
              <span className="text-primary">Cypher</span>
              <span className="text-gray-100">&nbsp;Meta</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              사이퍼즈 전적 검색 · 랭킹 · 메타 통계.
              <br />
              네오플 오픈 API 기반의 비공식 팬 사이트입니다.
            </p>
          </div>

          {/* 바로가기 */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">바로가기</h4>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-1">
              {NAV.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-gray-400 transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 정보 */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">정보</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/terms" className="text-gray-400 transition-colors hover:text-primary">
                  이용약관
                </Link>
              </li>
              <li>
                <a
                  href="https://developers.neople.co.kr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gray-400 transition-colors hover:text-primary"
                >
                  네오플 오픈 API
                  <span className="text-[10px] opacity-70">↗</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {SITE_NAME}. 데이터 제공: Neople 오픈 API.</p>
          <p>본 사이트는 Neople·넥슨과 무관한 비공식 팬 사이트입니다.</p>
        </div>
      </div>
    </footer>
  );
}
