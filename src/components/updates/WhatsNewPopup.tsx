"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { markUpdatesSeen, snoozeUpdate, useUnseenUpdate } from "@/lib/updates-client";
import UpdateBody from "./UpdateBody";

/** 작성 시각 → 상대 시간(오늘/어제/N일 전) */
function relDate(iso: string): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

/**
 * WhatsNewPopup — 새 업데이트가 있고 아직 확인하지 않은 방문자에게 요약 팝업을 띄운다.
 * '나중에'(X·배경 클릭 포함)는 24시간 스누즈 — 확인 처리하지 않아 기간이 지나면 다시 뜬다
 * (헤더 NEW 뱃지는 유지). '전체 업데이트 보기'만 해당 버전을 '확인함'으로 영구 저장한다.
 * /updates·/admin 경로에서는 표시하지 않는다.
 */
export default function WhatsNewPopup() {
  const pathname = usePathname();
  const unseen = useUnseenUpdate({ respectSnooze: true });
  const [show, setShow] = useState(false);

  const hiddenRoute = !!pathname && (pathname.startsWith("/updates") || pathname.startsWith("/admin"));

  // 등장 시 살짝 지연 후 페이드인(로드 직후 깜빡임 방지)
  useEffect(() => {
    if (!unseen || hiddenRoute) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), 650);
    return () => clearTimeout(t);
  }, [unseen, hiddenRoute]);

  if (!unseen || hiddenRoute) return null;

  /** '나중에'/X/배경 클릭 — 24시간 스누즈(확인 처리 아님, 기간 후 재팝업). */
  function dismiss() {
    setShow(false);
    // 페이드아웃 후 스누즈 저장(저장 시 언마운트)
    window.setTimeout(() => {
      if (unseen) snoozeUpdate(unseen.id);
    }, 240);
  }

  /** '전체 업데이트 보기' — 해당 버전을 '확인함'으로 영구 저장. */
  function confirmSeen() {
    setShow(false);
    if (unseen) markUpdatesSeen(unseen.id);
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-md transition-opacity duration-300 sm:items-center ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="새 업데이트 안내"
    >
      {/* 그라데이션 헤어라인 테두리 래퍼 */}
      <div
        className={`w-full max-w-lg rounded-[1.35rem] bg-gradient-to-br from-primary/50 via-[#8b5cf6]/25 to-line p-px shadow-[0_24px_70px_-20px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out ${
          show ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-[0.97] opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-[1.3rem] bg-surface">
          {/* 헤더 */}
          <div className="relative overflow-hidden border-b border-line bg-gradient-to-br from-primary/10 via-surface to-surface px-5 pb-4 pt-5 sm:px-6">
            <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/25 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 top-6 h-28 w-28 rounded-full bg-[#8b5cf6]/20 blur-3xl" />
            <button
              type="button"
              onClick={dismiss}
              aria-label="닫기"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-surface-3 hover:text-gray-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="relative flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-white shadow-lg shadow-primary/30">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2.5l1.9 4.7 4.7 1.9-4.7 1.9L12 15.7l-1.9-4.7L5.4 9l4.7-1.9L12 2.5z" />
                  <path d="M18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" opacity="0.9" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">What&rsquo;s New</p>
                <p className="text-xs text-gray-500">새로운 업데이트가 있어요</p>
              </div>
            </div>

            <div className="relative mt-3.5 flex flex-wrap items-center gap-2">
              {unseen.version && (
                <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-300">
                  {unseen.version}
                </span>
              )}
              <span className="text-xs text-gray-500">{relDate(unseen.createdAt)}</span>
            </div>
            <h2 className="relative mt-1.5 text-lg font-bold tracking-tight text-gray-50">{unseen.title}</h2>
          </div>

          {/* 본문 */}
          <div className="max-h-[44vh] overflow-y-auto px-5 py-4 sm:px-6">
            <UpdateBody content={unseen.content} />
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/40 px-5 py-3.5 sm:px-6">
            <button type="button" onClick={dismiss} className="btn-ghost">
              나중에
            </button>
            <Link
              href="/updates"
              onClick={confirmSeen}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-float"
            >
              전체 업데이트 보기
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
