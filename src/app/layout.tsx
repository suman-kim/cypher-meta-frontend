import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: "사이퍼즈 전적 검색, 랭킹, 캐릭터·아이템 정보. Neople 오픈API 기반.",
  keywords: [
    "사이퍼즈",
    "사이퍼즈 전적",
    "사이퍼즈 전적검색",
    "사이퍼즈 랭킹",
    "사이퍼즈 메타",
    "Cyphers",
    "사이퍼즈 통계",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: "사이퍼즈 전적 검색, 랭킹, 캐릭터·아이템 정보.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  // Google Search Console '메타 태그' 인증을 쓸 때: Vercel 환경변수 GOOGLE_SITE_VERIFICATION 설정
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
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
        <AnalyticsTracker />
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
