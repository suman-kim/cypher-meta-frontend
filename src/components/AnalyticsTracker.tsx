"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** 라우트 변경마다 방문을 /api/track 로 전송 (익명). 관리자 페이지는 제외. */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const referrerSent = useRef(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    let event = "pageview";
    let query: string | undefined;
    try {
      if (pathname === "/search") {
        const nn = new URLSearchParams(window.location.search).get("nickname")?.trim();
        if (nn) {
          event = "search";
          query = nn;
        }
      }
    } catch {
      /* noop */
    }

    // 외부 유입 referrer 는 최초 1회만
    let referrer: string | undefined;
    if (!referrerSent.current) {
      referrerSent.current = true;
      const r = document.referrer;
      if (r && !r.startsWith(window.location.origin)) referrer = r;
    }

    const body = JSON.stringify({ path: pathname, event, query, referrer });
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
