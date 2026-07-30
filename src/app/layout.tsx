import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import WhatsNewPopup from "@/components/updates/WhatsNewPopup";
import NativeTabBar from "@/components/native/NativeTabBar";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: "사이퍼즈 전적 검색, 랭킹, 공략, 메타, 캐릭터·아이템 정보. Neople 오픈API 기반.",
  keywords: [
    "사이퍼즈",
    "사이퍼즈 전적",
    "사이퍼즈 전적검색",
    "사이퍼즈 랭킹",
    "사이퍼즈 공략",
    "사이퍼즈 메타",
    "Cyphers",
    "사이퍼즈 통계",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: "사이퍼즈 전적 검색, 랭킹, 공략, 메타, 캐릭터·아이템 정보.",
  },
  // 트위터/X 카드는 큰 이미지 형태로 노출. 이미지는 twitter-image.png 파일 규약에서 자동 주입된다.
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: "사이퍼즈 전적 검색, 랭킹, 공략, 메타, 캐릭터·아이템 정보.",
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
    other: {
      ...(process.env.NAVER_SITE_VERIFICATION
        ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
        : {}),
      ...(process.env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
        : {}),
    },
  },
};

// FOUC 방지: 렌더 전에 저장된 테마를 적용 (라이트 기본, 'dark' 저장 시 다크)
const themeScript = `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

// 검색엔진 구조화 데이터(JSON-LD).
//  - WebSite + SearchAction: 구글 '사이트링크 검색창' 노출 후보가 된다(검색어 → /search?nickname=).
//  - Organization: 로고/사이트명 등 지식 패널용 기본 정보.
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "사이퍼즈 메타",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?nickname={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex min-h-[100dvh] flex-col bg-bg">
        <AnalyticsTracker />
        <Header />
        <main className="container-app flex-1 py-6">{children}</main>
        <Footer />
        <WhatsNewPopup />
        <NativeTabBar />
      </body>
    </html>
  );
}
