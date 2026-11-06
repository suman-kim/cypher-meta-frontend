"use client";

/**
 * ModerationButtons — 글·댓글 옆의 '신고 · 차단' 버튼(웹·앱 공용).
 *  - variant="text": 작은 글자 버튼 두 개(신고 / 차단). 웹 글·댓글, 업데이트 댓글.
 *  - variant="icon": 점 세 개 버튼 하나 → 신고·차단 메뉴. 공간이 좁은 앱 댓글.
 * 작성자 닉네임이 없거나 공지면 아무것도 그리지 않는다. 시트는 루트의 ModerationHost 가 그린다(openModeration).
 */
import { canModerate } from "@/lib/moderation";
import { openModeration, type ModerationTarget } from "./ModerationSheet";

/** 버튼 속성 */
interface ModerationButtonsProps {
  /** 대상 */
  target: ModerationTarget;
  /** 모양(text | icon) */
  variant?: "text" | "icon";
  /** 공지 글이면 true(신고·차단 대상 아님) */
  isNotice?: boolean;
  /** 글자 버튼에 더할 클래스 */
  className?: string;
}

/**
 * 신고·차단 버튼.
 * @param props.target 대상
 * @param props.variant 모양
 * @param props.isNotice 공지 여부
 * @param props.className 글자 버튼 클래스
 */
export default function ModerationButtons({ target, variant = "text", isNotice = false, className = "" }: ModerationButtonsProps) {
  if (!canModerate(target.authorName, isNotice)) return null;

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          onClick={() => openModeration(target, "menu")}
          aria-label="신고·차단"
          className="grid h-7 w-7 place-items-center rounded-full text-gray-500 active:bg-surface-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h.01M12 12h.01M19 12h.01" />
          </svg>
        </button>
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={() => openModeration(target, "report")} className={`text-xs text-gray-500 hover:text-amber-400 ${className}`}>
        신고
      </button>
      <button type="button" onClick={() => openModeration(target, "block")} className={`text-xs text-gray-500 hover:text-gray-300 ${className}`}>
        차단
      </button>
    </>
  );
}
