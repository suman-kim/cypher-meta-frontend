"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useIsNative, haptic } from "@/lib/native";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 하단 탭 정의(주요 목적지 4개). */
const TABS: { href: string; label: string; icon: JSX.Element }[] = [
  {
    href: "/",
    label: "홈",
    icon: (
      <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />
    ),
  },
  {
    href: "/ranking",
    label: "랭킹",
    icon: (
      <path d="M7 21h10M12 17v4M6 4h12v4a6 6 0 0 1-12 0V4ZM6 6H4v1a3 3 0 0 0 2 2.8M18 6h2v1a3 3 0 0 1-2 2.8" />
    ),
  },
  {
    href: "/meta",
    label: "메타",
    icon: (
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    ),
  },
  {
    href: "/community",
    label: "커뮤니티",
    icon: (
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" />
    ),
  },
];

/**
 * 네이티브 앱에서만 나타나는 하단 탭바.
 * - 웹(브라우저)에서는 useIsNative()가 false 라 null 렌더 → 웹 UI 무변화.
 * - 본문이 탭바에 가리지 않도록 body 하단 여백을 동적으로 준다.
 * - 안드로이드 하드웨어 back: SPA 뒤로가기, 최상단이면 앱을 닫지 않고 최소화.
 */
export default function NativeTabBar() {
  const native = useIsNative();
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!native) return;
    // 탭바 높이 + 하단 세이프에어리어만큼 본문 여백 확보.
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "calc(58px + env(safe-area-inset-bottom))";

    // 안드로이드 back 버튼 처리(플러그인 있을 때만).
    let removeBack: (() => void) | undefined;
    try {
      const App = (window as any)?.Capacitor?.Plugins?.App;
      if (App?.addListener) {
        const handle = App.addListener("backButton", () => {
          if (window.history.length > 1) window.history.back();
          else App.minimizeApp?.();
        });
        removeBack = () => {
          try {
            handle?.remove?.();
          } catch {
            /* 무시 */
          }
        };
      }
    } catch {
      /* 무시 */
    }

    return () => {
      document.body.style.paddingBottom = prev;
      removeBack?.();
    };
  }, [native]);

  if (!native) return null;

  const isActive = (href: string): boolean =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex border-t border-line bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="주요 메뉴"
    >
      {TABS.map((t) => {
        const active = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            onClick={() => haptic("light")}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition-colors ${
              active ? "text-primary" : "text-gray-500"
            }`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {t.icon}
            </svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
