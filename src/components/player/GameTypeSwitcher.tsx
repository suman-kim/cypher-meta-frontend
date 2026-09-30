"use client";

/**
 * GameTypeSwitcher — 플레이어 화면의 게임 타입(전체/공식전/일반전) 전환.
 *
 * 화면 전체를 가로지르는 고정 바 대신 두 가지로 보여 준다.
 *  1) 프로필 카드 안의 세그먼트 버튼 — "이 플레이어를 어떤 기준으로 볼지"를 프로필 곁에서 고른다.
 *  2) 플로팅 전환 버튼 — 스크롤해서 1)이 화면 밖으로 나가면 화면 아래 가운데에 작은 알약으로 떠오른다.
 *     긴 페이지 중간에서도 기준을 바로 바꿀 수 있고, 1)이 다시 보이면 사라진다.
 * 전환은 같은 페이지의 쿼리만 바꾸므로 스크롤 위치를 유지한다(Link scroll={false}).
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** 전환 항목 1개 */
export interface GameTypeTab {
  href: string;
  label: string;
  active: boolean;
}

/**
 * 세그먼트 버튼 묶음(인라인·플로팅 공용).
 * @param tabs — 전환 항목
 * @param compact — 플로팅용 작은 크기
 */
function Segments({ tabs, compact = false }: { tabs: GameTypeTab[]; compact?: boolean }) {
  return (
    <>
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          scroll={false}
          aria-current={t.active ? "page" : undefined}
          className={`whitespace-nowrap rounded-full font-semibold transition-all ${
            compact ? "px-3 py-1.5 text-xs" : "px-3.5 py-1.5 text-sm"
          } ${t.active ? "bg-primary text-white shadow-sm" : "text-gray-400 hover:text-gray-100"}`}
        >
          {t.label}
        </Link>
      ))}
    </>
  );
}

/**
 * @param tabs — 전환 항목(전체/공식전/일반전)
 * @param hint — 인라인 버튼 옆 안내 문구(선택)
 */
export default function GameTypeSwitcher({ tabs, hint }: { tabs: GameTypeTab[]; hint?: string }) {
  const inlineRef = useRef<HTMLDivElement>(null);
  // 인라인 버튼이 화면에 보이는지 — 안 보이면 플로팅 버튼을 띄운다
  const [inlineVisible, setInlineVisible] = useState(true);
  // 네이티브 앱 셸(Capacitor)은 하단 탭바가 있어 플로팅 위치를 그만큼 올린다
  const [nativeOffset, setNativeOffset] = useState(0);

  useEffect(() => {
    if ((window as unknown as { Capacitor?: unknown }).Capacitor) setNativeOffset(64);
    const el = inlineRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // 헤더(64px) 아래로 가려지면 안 보이는 것으로 본다
    const io = new IntersectionObserver(([e]) => setInlineVisible(e.isIntersecting), {
      rootMargin: "-64px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const active = tabs.find((t) => t.active);

  return (
    <>
      {/* 1) 프로필 카드 안 세그먼트 */}
      <div ref={inlineRef} className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">보기 기준</span>
        <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface-2 p-0.5" role="tablist">
          <Segments tabs={tabs} />
        </div>
        {hint && <span className="hidden text-xs text-gray-500 sm:inline">{hint}</span>}
      </div>

      {/* 2) 플로팅 전환 — 인라인이 화면 밖일 때만 */}
      <div
        className={`fixed left-1/2 z-30 -translate-x-1/2 transition-all duration-200 ${
          inlineVisible ? "pointer-events-none translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        }`}
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${20 + nativeOffset}px)` }}
        aria-hidden={inlineVisible}
      >
        <div
          className="flex items-center gap-0.5 rounded-full border border-line bg-surface/95 p-1 shadow-float backdrop-blur"
          title={`현재 보기 기준: ${active?.label ?? ""}`}
        >
          <Segments tabs={tabs} compact />
        </div>
      </div>
    </>
  );
}
