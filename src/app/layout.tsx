import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  // 사이트 소유확인 '메타 태그' 인증 (Vercel/.env 환경변수로 값 주입)
  //  - Google Search Console : GOOGLE_SITE_VERIFICATION
  //  - 네이버 서치어드바이저   : NAVER_SITE_VERIFICATION (네이버 전용 필드가 없어 other 로 넣는다)
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    ...(process.env.NAVER_SITE_VERIFICATION
      ? { other: { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } }
      : {}),
  },
};

// FOUC 방지: 렌더 전에 저장된 테마를 적용 (라이트 기본, 'dark' 저장 시 다크)
const themeScript = `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-[100dvh] flex-col bg-bg">
        <AnalyticsTracker />
        <Header />
        <main className="container-app flex-1 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
