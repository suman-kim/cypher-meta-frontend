"use client";

/**
 * Google 애드센스 광고 스크립트 로더.
 * 웹 브라우저에서만 넣고, 네이티브 앱 셸(Capacitor WebView)에서는 넣지 않는다 —
 * 앱 WebView 안에 애드센스 광고를 띄우면 정책 위반 소지가 있다.
 * 자동 광고 on/off·배치는 애드센스 콘솔에서 관리하므로 여기서는 스크립트 로드까지만 한다.
 */
import Script from "next/script";
import { useEffect, useState } from "react";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import { isNativeApp } from "@/lib/native";

/** 웹에서만 애드센스 스크립트를 로드한다(마운트 후 판정이라 SSR·하이드레이션에 영향 없음). */
export default function AdSenseScript() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(!isNativeApp());
  }, []);

  if (!enabled) return null;
  return (
    <Script
      id="adsbygoogle"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  );
}
