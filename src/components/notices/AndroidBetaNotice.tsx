"use client";

/**
 * AndroidBetaNotice — 안드로이드 앱 비공개 테스트 테스터 모집 안내 모달.
 * 참여 3단계(BetaSteps)와 모집 공고 페이지 링크를 보여 준다. 표시 여부(언제 띄울지)는 SiteNoticeHost 가 정한다.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { ANDROID_BETA, ANDROID_BETA_PERKS } from "@/lib/android-beta";
import { trackEvent } from "@/lib/track";
import BetaSteps from "./BetaSteps";

/** 안내를 닫는 방법 */
export type NoticeCloseReason =
  /** 닫기(X·배경·닫기 버튼·공고 페이지로 이동) — 며칠 뒤 다시 보임 */
  | "close"
  /** 다시 보지 않기 */
  | "hide"
  /** 마지막 단계(설치)까지 누름 — 다시 띄우지 않음 */
  | "done";

/** 안내 모달 속성 */
interface AndroidBetaNoticeProps {
  /**
   * 닫을 때 부른다.
   * @param reason 닫는 방법
   */
  onClose: (reason: NoticeCloseReason) => void;
}

/**
 * 테스터 모집 안내 모달.
 * @param props.onClose 닫을 때 호출(닫는 방법 전달)
 */
export default function AndroidBetaNotice({ onClose }: AndroidBetaNoticeProps) {
  /** 등장 애니메이션 상태 */
  const [show, setShow] = useState(false);
  /** 세 단계를 모두 눌렀는지 */
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close("close");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // close 는 렌더마다 새로 만들어지지만 동작이 같아 등록 한 번이면 된다
  }, []);

  /**
   * 페이드아웃 뒤 닫는다.
   * @param reason 닫는 방법
   */
  function close(reason: NoticeCloseReason) {
    setShow(false);
    trackEvent(`beta_notice_${reason}`);
    window.setTimeout(() => onClose(reason), 220);
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-md transition-opacity duration-300 sm:items-center ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={() => close("close")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-beta-title"
    >
      <div
        className={`w-full max-w-lg rounded-[1.35rem] bg-gradient-to-br from-[#34a853]/50 via-primary/25 to-line p-px shadow-[0_24px_70px_-20px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out ${
          show ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-[0.97] opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-[1.3rem] bg-surface">
          {/* 머리 */}
          <div className="relative overflow-hidden border-b border-line bg-gradient-to-br from-[#34a853]/10 via-surface to-surface px-5 pb-4 pt-5 sm:px-6">
            <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#34a853]/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 top-6 h-28 w-28 rounded-full bg-primary/20 blur-3xl" />
            <button
              type="button"
              onClick={() => close("close")}
              aria-label="닫기"
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-surface-3 hover:text-gray-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="relative flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4f8dff] via-[#2f6fec] to-[#3d4fe0] text-white shadow-lg shadow-primary/30">
                {/* 앱 아이콘과 같은 막대 3개 */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="4" y="13" width="4" height="7" rx="1.6" />
                  <rect x="10" y="9" width="4" height="11" rx="1.6" />
                  <rect x="16" y="4" width="4" height="16" rx="1.6" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#34a853]">Android Beta</p>
                <p className="text-xs text-gray-500">안드로이드 앱 비공개 테스트</p>
              </div>
            </div>

            <h2 id="android-beta-title" className="relative mt-3.5 text-lg font-bold tracking-tight text-gray-50">
              사이퍼즈 메타 앱 테스터를 모집해요
            </h2>
            <p className="relative mt-1 text-sm leading-relaxed text-gray-400">
              정식 출시 전 비공개 테스트에 참여해 주세요. 설치한 뒤 <b className="text-gray-200">{ANDROID_BETA.keepDays}일 동안</b> 지우지 않고
              두기만 해도 출시에 큰 도움이 돼요.
            </p>
            <div className="relative mt-3 flex flex-wrap gap-1.5">
              {ANDROID_BETA_PERKS.map((p) => (
                <span key={p} className="chip border border-line bg-surface-2 text-gray-300">
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* 참여 순서 — 화면이 낮으면 이 부분만 스크롤 */}
          <div className="max-h-[46vh] overflow-y-auto px-5 py-4 sm:max-h-[60vh] sm:px-6">
            <BetaSteps source="notice" onAllDoneChange={setAllDone} />
            <Link
              href={ANDROID_BETA.pagePath}
              onClick={() => close("close")}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              자주 묻는 질문 · 자세한 안내 보기
              <span aria-hidden>›</span>
            </Link>
          </div>

          {/* 바닥 */}
          <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-2/40 px-5 py-3.5 sm:px-6">
            <button type="button" onClick={() => close("hide")} className="text-xs text-gray-500 transition-colors hover:text-gray-300">
              다시 보지 않기
            </button>
            <button type="button" onClick={() => close(allDone ? "done" : "close")} className="btn-ghost">
              {allDone ? "완료" : "닫기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
