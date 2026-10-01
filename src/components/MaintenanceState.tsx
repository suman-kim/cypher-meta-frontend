"use client";

/**
 * MaintenanceState — 사이퍼즈 서버 점검(Neople CY980) 안내 화면.
 * 일반 오류(ErrorState)와 달리 '잠시 기다리면 풀리는 상태'라 붉은 경고 대신 차분한 브랜드 톤으로 보여 주고,
 * 다시 시도(서버 컴포넌트 재요청)와 점검 중에도 볼 수 있는 메타 통계 페이지 바로가기를 함께 둔다.
 * ErrorState 에 variant="maintenance" 를 주면 이 컴포넌트가 그려진다(lib/neople.ts 의 neopleErrorView 참고).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** 점검 중에도 DB 데이터로 볼 수 있는 페이지 */
const AVAILABLE_LINKS = [
  { href: "/meta", label: "캐릭터 티어" },
  { href: "/meta/comp", label: "조합 티어" },
  { href: "/community", label: "커뮤니티" },
];

/**
 * 점검 안내 카드.
 * @param message — 상단 제목 아래 보조 문구(선택, 없으면 기본 안내)
 */
export default function MaintenanceState({ message }: { message?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-12 text-center sm:py-14">
      {/* 배경: 은은한 점 패턴(가운데만 보이게 페이드) + 상단 글로우 + 상단 라인 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(rgb(var(--g500) / 0.18) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        aria-hidden
      />

      <div className="relative">
        {/* 상태 배지 — 살아 있는 상태임을 보여 주는 점 깜빡임 */}
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold tracking-wide text-amber-600 dark:text-amber-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          서버 점검 중
        </span>

        <h2 className="mt-5 text-xl font-black tracking-tight text-gray-50 sm:text-2xl">
          사이퍼즈 서버가 점검 중이에요
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-400">
          {message ?? "점검 중에는 플레이어 검색·전적·랭킹 조회가 잠시 멈춰요."}
          <br />
          점검이 끝나면 바로 다시 이용할 수 있어요.
        </p>

        {/* 다시 시도 — 서버 컴포넌트를 다시 요청한다 */}
        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className="btn-primary mt-6 rounded-full px-5 shadow-md shadow-primary/25 disabled:opacity-70"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={pending ? "animate-spin" : ""}
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          {pending ? "확인 중…" : "다시 시도"}
        </button>

        {/* 점검 중에도 볼 수 있는 페이지 */}
        <div className="mt-8">
          <p className="text-[11px] font-semibold text-gray-500">점검 중에도 볼 수 있어요</p>
          <div className="mt-2.5 flex flex-wrap justify-center gap-2">
            {AVAILABLE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-primary/40 hover:text-primary"
              >
                {l.label}
                <span aria-hidden>→</span>
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-8 text-[11px] text-gray-500">정기 점검은 보통 목요일 오전에 진행돼요</p>
      </div>
    </div>
  );
}
