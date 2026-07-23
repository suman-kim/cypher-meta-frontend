import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} · ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: "사이퍼즈 전적 검색, 랭킹, 캐릭터·아이템 정보. Neople 오픈API 기반.",
};

// FOUC 방지: 렌더 전에 저장된 테마를 적용 (라이트 기본, 'dark' 저장 시 다크)
const themeScript = `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-bg">
        <Header />
        <main className="container-app py-6">{children}</main>
        <footer className="mt-10 border-t border-line bg-surface-2">
          <div className="container-app py-8 text-center text-xs text-gray-500">
            <p className="text-sm font-extrabold tracking-tight text-gray-200">{SITE_NAME}</p>
            <p className="mt-2">
              데이터 제공: Neople 오픈API. 본 사이트는 Neople·넥슨과 무관한 비공식 팬 사이트입니다.
            </p>
            <p className="mt-1">© {new Date().getFullYear()} {SITE_NAME}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
