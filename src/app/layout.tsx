import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import WhatsNewPopup from "@/components/updates/WhatsNewPopup";
import SiteNoticeHost from "@/components/notices/SiteNoticeHost";
import NativeTabBar from "@/components/native/NativeTabBar";
import { AppTabBar, AppThemeSync, AppToaster } from "@/components/app/AppChrome";
import AppPushSync from "@/components/app/AppPushSync";
import { isAppRequest } from "@/lib/app-mode";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: { icon: "/icon.svg" },
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
    images: ["/opengraph-image.png"],
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: "사이퍼즈 전적 검색, 랭킹, 공략, 메타, 캐릭터·아이템 정보.",
  },
  // 트위터/X 카드는 큰 이미지 형태로 노출. 이미지는 twitter-image.png 파일 규약에서 자동 주입된다.
  twitter: {
    card: "summary_large_image",
    images: ["/twitter-image.png"],
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
  // 애드센스 사이트 소유확인 '메타 태그' (서버 렌더 HTML에 바로 들어가므로 크롤러가 확실히 읽는다)
  other: { "google-adsense-account": ADSENSE_CLIENT },
};

/**
 * 뷰포트 — 앱 WebView 는 노치·홈 표시줄 안전 영역까지 그리도록 viewport-fit=cover 를 준다.
 * @returns 요청(웹/앱)에 맞는 뷰포트 설정
 */
export function generateViewport(): Viewport {
  if (isAppRequest()) {
    return { width: "device-width", initialScale: 1, viewportFit: "cover" };
  }
  return { width: "device-width", initialScale: 1 };
}

// 앱 FOUC 방지: 렌더 전에 앱 테마(기기 저장, 기본=기기 설정 따름)를 적용한다. 웹 테마 키('theme')와 따로 쓴다.
const appThemeScript = `(function(){try{var v=null;try{v=JSON.parse(localStorage.getItem('cm_app_theme'))}catch(e){}var d=v==='dark'||(v!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}}catch(e){}})();`;

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

/**
 * 페이지 공통 HTML과 메타데이터를 구성한다.
 * @param children 현재 경로에서 렌더링할 하위 페이지
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Capacitor 앱은 최초 요청에서 미들웨어가 심은 쿠키(또는 앱 식별 User-Agent)로 식별해 광고 스크립트를 제외한다.
  const isNativeApp = isAppRequest();

  // 앱 WebView: 웹 머리글·바닥글 대신 앱 틀(상단바는 각 화면, 하단 탭바는 여기)로 그린다.
  // 화면별 앱 UI 는 각 page.tsx 가 isAppRequest() 로 갈라 그린다. 광고는 앱 광고 방식(A/B) 결정 전까지 넣지 않는다.
  if (isNativeApp) {
    return (
      <html lang="ko" data-app="" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: appThemeScript }} />
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
          />
        </head>
        <body
          className="min-h-[100dvh] bg-bg text-gray-100"
          style={{ paddingBottom: "calc(86px + env(safe-area-inset-bottom))" }}
        >
          <AnalyticsTracker />
          <AppThemeSync />
          {/* 푸시 알림: 권한·토큰 등록, 구독 동기화, 알림 눌러 이동 */}
          <AppPushSync />
          <main className="mx-auto w-full max-w-xl">{children}</main>
          <AppTabBar />
          <AppToaster />
        </body>
      </html>
    );
  }

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/*
          애드센스 head 태그. id 를 붙이지 않는다.
          id="adsbygoogle" 이면 브라우저가 window.adsbygoogle 을 이 <script> 요소로 노출해,
          로더가 자동 광고 요청(enable_page_level_ads)을 큐에 넣는 단계에서 조용히 버려진다.
          (외부 src 스크립트라 next/script 도 id 를 요구하지 않는다.)
        */}
        {!isNativeApp && (
          <Script
            async
            strategy="beforeInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          />
        )}
      </head>
      <body className="flex min-h-[100dvh] flex-col bg-bg">
        <AnalyticsTracker />
        <Header />
        <main className="container-app flex-1 py-6">{children}</main>
        <Footer />
        <WhatsNewPopup />
        {/* 접속 안내 모달(안드로이드 앱 테스터 모집 등) — 업데이트 팝업과 겹치지 않게 하나만 */}
        <SiteNoticeHost />
        <NativeTabBar />
      </body>
    </html>
  );
}
