"use client";

/**
 * BlockedNotice — 차단한 작성자의 글을 열었을 때 본문 대신 보이는 안내(웹·앱 공용).
 * 막다른 화면이 되지 않도록 '차단 풀기'와 목록으로 가는 길을 함께 둔다.
 */
import Link from "next/link";
import { unblockAuthor } from "@/lib/moderation";

/**
 * @param name 차단한 작성자 닉네임
 * @param backHref 목록 주소
 * @param backLabel 목록 버튼 글자
 */
export default function BlockedNotice({ name, backHref, backLabel = "목록으로" }: { name: string; backHref: string; backLabel?: string }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-gray-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM5.6 5.6l12.8 12.8" />
        </svg>
      </span>
      <div className="grid gap-1">
        <p className="text-base font-bold text-gray-100">차단한 작성자의 글이에요</p>
        <p className="text-sm text-gray-500">
          <b className="text-gray-300">{name}</b>님을 차단해서 내용을 숨겼어요.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => unblockAuthor(name)}
          className="h-10 rounded-xl border border-line px-4 text-sm font-semibold text-gray-200 hover:bg-surface-2"
        >
          차단 풀고 보기
        </button>
        <Link href={backHref} className="flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
