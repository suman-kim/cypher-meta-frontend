"use client";

/**
 * BlockedAuthorsList — 이 기기에서 차단한 작성자 목록과 차단 풀기(웹·앱 공용).
 * 불러오기 전(하이드레이션 전)·빈 목록·목록 세 상태를 보이고, 빈 목록이면 커뮤니티로 가는 길을 둔다.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatKoreanDateTime } from "@/lib/format";
import { unblockAuthor, useBlockedAuthors } from "@/lib/moderation";

/**
 * 차단한 작성자 목록.
 */
export default function BlockedAuthorsList() {
  const list = useBlockedAuthors();
  // 서버 렌더 직후에는 이 기기 목록을 아직 모르므로 '불러오는 중'으로 둔다
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return <div className="h-24 animate-pulse rounded-2xl bg-surface-2" aria-label="불러오는 중" />;
  }

  if (list.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 rounded-2xl border border-line bg-surface px-6 py-10 text-center">
        <p className="text-sm font-bold text-gray-100">차단한 작성자가 없어요</p>
        <p className="text-xs leading-relaxed text-gray-500">
          글이나 댓글의 &lsquo;차단&rsquo;을 누르면 그 작성자의 글이 이 기기에서 보이지 않아요.
        </p>
        <Link href="/community" className="mt-1 flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
          커뮤니티로 가기
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {list.map((b) => (
        <li key={b.name} className="flex items-center gap-3 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-3 text-sm font-bold text-gray-400">
            {Array.from(b.name)[0] ?? "?"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-100">{b.name}</span>
            <span className="block text-[11px] text-gray-500" suppressHydrationWarning>
              {formatKoreanDateTime(b.at)} 차단
            </span>
          </span>
          <button
            type="button"
            onClick={() => unblockAuthor(b.name)}
            className="h-9 shrink-0 rounded-xl border border-line px-3 text-xs font-semibold text-gray-200 hover:bg-surface-2"
          >
            차단 풀기
          </button>
        </li>
      ))}
    </ul>
  );
}
