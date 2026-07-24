import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import Logo from "@/components/Logo";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 bg-surface-2">
      {/* 상단 그라데이션 악센트 라인 */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="container-app py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* 브랜드 */}
          <div className="text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              <Logo size="sm" />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              사이퍼즈 전적 · 랭킹 · 메타 통계 · 비공식 팬 사이트
            </p>
          </div>

          {/* 정보 링크 (인라인) */}
          <div className="flex items-center gap-4 text-sm">
            <Link href="/terms" className="text-gray-400 transition-colors hover:text-primary">
              이용약관
            </Link>
            <span className="text-line">·</span>
            <a
              href="https://developers.neople.co.kr/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gray-400 transition-colors hover:text-primary"
            >
              네오플 오픈 API
              <span className="text-[10px] opacity-70">↗</span>
            </a>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-5 text-center text-xs text-gray-500">
          © {year} {SITE_NAME}. 데이터 제공: Neople 오픈 API · 본 사이트는 Neople·넥슨과 무관한 비공식 팬 사이트입니다.
        </div>
      </div>
    </footer>
  );
}
