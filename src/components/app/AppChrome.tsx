"use client";

/**
 * 앱 화면 틀(크롬) — 상단바, 하단 탭바, 테마 동기화, 토스트.
 *
 * - 하단 탭바: 홈 · 검색 · 메타 · 랭킹 · 더보기 (커뮤니티는 더보기 안. 탭 배치는 최종 디자인 뒤 결정)
 * - 상단바: 홈(로고+알림) / 큰 제목 / 뒤로 가기+제목 세 가지 모양. 스크롤해도 위에 붙어 있다.
 * - 안드로이드 뒤로 가기 버튼: 앱 안 이전 화면으로, 더 갈 곳이 없으면 앱을 닫지 않고 내린다.
 * - 테마: 기기 저장소의 선택값(system/light/dark)을 html.dark 에 반영하고, system 이면 기기 설정 변화를 따라간다.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { haptic } from "@/lib/native";
import { useAppTheme } from "@/lib/app-storage";
import { Icon, type IconName } from "./icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 하단 탭 키 */
export type AppTab = "home" | "search" | "meta" | "rank" | "more";

/** 하단 탭 정의 */
const TABS: { key: AppTab; href: string; label: string; icon: IconName }[] = [
  { key: "home", href: "/", label: "홈", icon: "home" },
  { key: "search", href: "/search", label: "검색", icon: "search" },
  { key: "meta", href: "/meta", label: "메타", icon: "meta" },
  { key: "rank", href: "/ranking", label: "랭킹", icon: "rank" },
  { key: "more", href: "/more", label: "더보기", icon: "more" },
];

/**
 * 경로가 어느 하단 탭에 속하는지 정한다.
 * @param path 현재 경로 (쿼리 제외)
 * @returns 강조할 탭
 */
export function tabOf(path: string): AppTab {
  if (path === "/" || path.startsWith("/notifications")) return "home";
  if (path.startsWith("/players/multi") || path.startsWith("/players/compare")) return "more";
  if (path.startsWith("/search") || path.startsWith("/players") || path.startsWith("/matches")) return "search";
  if (path.startsWith("/meta") || path.startsWith("/characters/")) return "meta";
  if (path.startsWith("/ranking")) return "rank";
  return "more";
}

/** 하단 탭바 높이(px, 안전 영역 제외) — 본문 아래 여백·떠 있는 버튼 위치 계산에 쓴다 */
export const TABBAR_H = 78;

/**
 * 하단 탭바. 지금 탭을 다시 누르면 맨 위로 올라간다.
 */
export function AppTabBar() {
  const pathname = usePathname() || "/";
  const active = tabOf(pathname);

  // 안드로이드 하드웨어 뒤로 가기 (App 플러그인이 있을 때만)
  useEffect(() => {
    let remove: (() => void) | undefined;
    try {
      const App = (window as any)?.Capacitor?.Plugins?.App;
      if (App?.addListener) {
        const handle = App.addListener("backButton", () => {
          if (window.history.length > 1) window.history.back();
          else App.minimizeApp?.();
        });
        remove = () => {
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
    return () => remove?.();
  }, []);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 bg-bg px-3 pt-2"
      style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}
      aria-label="주요 메뉴"
    >
      <div className="a-glass mx-auto flex h-16 max-w-xl items-center justify-around rounded-[26px] border border-app-hair shadow-[var(--a-shadow)]">
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={on ? "page" : undefined}
              onClick={(e) => {
                haptic("light");
                if (on && pathname === t.href) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={`flex w-16 flex-col items-center gap-1 text-[10.5px] font-semibold ${on ? "text-primary" : "text-gray-500"}`}
            >
              <span
                className={`grid h-8 w-[54px] place-items-center rounded-2xl transition-[background,box-shadow] duration-200 ${
                  on ? "a-grad a-glow" : ""
                }`}
              >
                <Icon name={t.icon} size={20} stroke={t.key === "more" ? 3.6 : 2} />
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * 뒤로 가기 — 앱 안 이전 화면이 있으면 그리로, 없으면 대체 주소로.
 * @param router Next 라우터
 * @param fallback 이전 화면이 없을 때 갈 주소
 */
export function goBack(router: ReturnType<typeof useRouter>, fallback: string): void {
  if (typeof window !== "undefined" && window.history.length > 1) router.back();
  else router.push(fallback);
}

/**
 * 상단바.
 * @param variant home(로고+알림) | large(큰 제목) | back(뒤로+제목)
 * @param title 제목
 * @param right 오른쪽 동작 요소들
 * @param backHref 이전 화면이 없을 때 뒤로 가기가 갈 주소 (기본: 지금 탭의 첫 화면)
 * @param transparent true 면 처음엔 배경 없이(큰 그림 위에 겹칠 때) 그리고, 조금 스크롤하면 유리 배경과 제목이 나타난다
 * @param children 상단바 아래에 함께 붙어 있을 요소(세그먼트 등)
 */
export function AppTopBar({
  variant = "back",
  title,
  right,
  backHref,
  transparent = false,
  children,
}: {
  variant?: "home" | "large" | "back";
  title?: ReactNode;
  right?: ReactNode;
  backHref?: string;
  transparent?: boolean;
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const fallback = backHref ?? TABS.find((t) => t.key === tabOf(pathname))?.href ?? "/";
  // 투명 상단바: 머리 그림을 지나 스크롤하면 유리 배경 + 제목을 보인다(뒤로 버튼이 본문 위에 떠 보이지 않게)
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!transparent) return;
    const on = () => setScrolled(window.scrollY > 140);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [transparent]);
  const solid = !transparent || scrolled;

  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-200 ${solid ? "a-glass" : ""}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className={`flex h-[52px] items-center gap-1 ${variant === "back" ? "px-2" : "px-4"}`}>
        {variant === "home" && (
          <>
            <Link href="/" className="flex flex-1 items-center gap-2">
              <span className="a-grad grid h-7 w-7 place-items-center rounded-lg text-[13px] font-extrabold">CM</span>
              <span className="text-[17px] font-bold tracking-[-0.01em] text-gray-100">Cyphers Meta</span>
            </Link>
          </>
        )}
        {variant === "large" && (
          <h1 className="min-w-0 flex-1 truncate text-[26px] font-extrabold tracking-[-0.03em] text-gray-50">{title}</h1>
        )}
        {variant === "back" && (
          <>
            <button
              type="button"
              onClick={() => goBack(router, fallback)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-gray-100 active:bg-surface-2"
              aria-label="뒤로 가기"
            >
              <Icon name="back" size={22} stroke={2.2} />
            </button>
            <span
              className={`min-w-0 flex-1 truncate text-[17px] font-bold text-gray-100 transition-opacity duration-200 ${
                solid ? "opacity-100" : "opacity-0"
              }`}
            >
              {title}
            </span>
          </>
        )}
        {right && <div className="flex shrink-0 items-center gap-0.5">{right}</div>}
      </div>
      {children && <div className="px-4 pb-2.5">{children}</div>}
    </header>
  );
}

/**
 * 상단바 오른쪽 둥근 아이콘 버튼.
 * @param icon 아이콘 이름
 * @param label 화면 읽기 프로그램용 이름
 * @param href 링크 주소 (onClick 대신)
 * @param onClick 누름 처리
 * @param active 켜짐 표시(별 채움 등)
 * @param dot 오른쪽 위 빨간 점 표시
 */
export function TopIconButton({
  icon,
  label,
  href,
  onClick,
  active = false,
  dot = false,
}: {
  icon: IconName;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  dot?: boolean;
}) {
  const inner = (
    <>
      <Icon name={icon} size={22} stroke={1.8} fill={active && icon === "star" ? "currentColor" : "none"} />
      {dot && <span className="absolute right-2.5 top-[9px] h-[7px] w-[7px] rounded-full bg-app-live" />}
    </>
  );
  const cls = `relative grid h-10 w-10 place-items-center rounded-full active:bg-surface-2 ${
    active ? "text-[#f5b301]" : "text-gray-300"
  }`;
  return href ? (
    <Link href={href} className={cls} aria-label={label}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-label={label} aria-pressed={active}>
      {inner}
    </button>
  );
}

/**
 * 기기 저장소의 테마 선택을 html.dark 에 반영한다. (화면에는 아무것도 그리지 않는다)
 * 첫 그림의 깜빡임은 레이아웃 head 의 초기 스크립트가 막고, 이후 변경은 여기서 맞춘다.
 */
export function AppThemeSync() {
  const theme = useAppTheme();
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
      try {
        // 상태바 글자·아이콘 색. DARK = 어두운 배경용 밝은 글자.
        // Capacitor 8(Android 15+ 화면 끝까지 그리기)은 코어 SystemBars 로, 이전 앱 셸은 StatusBar 플러그인으로 맞춘다.
        // 화면 끝까지 그리는 기기에서는 상태바 뒤로 웹 화면이 보이므로 배경색 지정은 효과가 없다(상단바가 여백을 채운다).
        const plugins = (window as any)?.Capacitor?.Plugins;
        const style = dark ? "DARK" : "LIGHT";
        if (plugins?.SystemBars?.setStyle) {
          plugins.SystemBars.setStyle({ style })?.catch?.(() => {});
        } else {
          plugins?.StatusBar?.setStyle?.({ style });
          plugins?.StatusBar?.setBackgroundColor?.({ color: dark ? "#0a0d13" : "#f3f5f9" });
        }
      } catch {
        /* 무시 */
      }
    };
    apply();
    if (theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  return null;
}

const TOAST_EVT = "cm-app-toast";

/**
 * 화면 아래쪽에 짧은 알림 글을 띄운다(약 2초).
 * @param message 보여 줄 글
 */
export function toast(message: string): void {
  window.dispatchEvent(new CustomEvent(TOAST_EVT, { detail: message }));
}

/** 토스트 표시 자리. 앱 틀에 한 번만 둔다. */
export function AppToaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 1900);
    };
    window.addEventListener(TOAST_EVT, on);
    return () => {
      window.removeEventListener(TOAST_EVT, on);
      clearTimeout(t);
    };
  }, []);
  if (!msg) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 z-50 max-w-[86vw] rounded-full bg-gray-100 px-4 py-2.5 text-[13px] font-semibold text-bg shadow-lg"
      style={{ bottom: `calc(${TABBAR_H + 16}px + env(safe-area-inset-bottom))`, animation: "cmToast .2s ease", transform: "translateX(-50%)" }}
    >
      {msg}
    </div>
  );
}
