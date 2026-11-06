"use client";

/**
 * TermsAgree — 글·댓글을 쓰기 전 운영 정책 동의(웹·앱 공용, Play 사용자 제작 콘텐츠 정책).
 * 아직 동의하지 않았으면 체크 상자를, 동의했으면 짧은 안내 한 줄을 보인다(한 번 동의하면 이 기기에 기억).
 * '정책 보기'는 쓰던 내용을 잃지 않도록 페이지를 옮기지 않고 그 자리에서 펼친다(앱 WebView 포함).
 * 폼은 useTermsAgreed() 로 동의 여부를 보고, 동의 전 제출이면 missing=true 로 이 칸을 강조한다.
 */
import { useState } from "react";
import { agreeTerms, COMMUNITY_ENFORCEMENT, COMMUNITY_RULES, useTermsAgreed } from "@/lib/moderation";

/**
 * @param missing 동의 없이 등록을 눌렀으면 true(빨간 안내)
 * @param onAgree 체크했을 때(폼의 오류 표시 지우기 등)
 */
export default function TermsAgree({ missing = false, onAgree }: { missing?: boolean; onAgree?: () => void }) {
  const agreed = useTermsAgreed();
  const [open, setOpen] = useState(false);

  const toggle = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className="font-semibold text-primary underline-offset-2 hover:underline"
    >
      {open ? "정책 접기" : "정책 보기"}
    </button>
  );

  const rules = open && (
    <div className="mt-2 rounded-lg bg-surface px-3 py-2.5 text-xs leading-relaxed text-gray-400">
      <p className="font-semibold text-gray-200">이런 글은 올릴 수 없어요</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {COMMUNITY_RULES.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-1.5">{COMMUNITY_ENFORCEMENT}</p>
      <p className="mt-1.5 text-gray-500">자세한 내용은 이용약관의 &lsquo;커뮤니티 운영 정책&rsquo;에 있어요.</p>
    </div>
  );

  if (agreed) {
    return (
      <div className="text-[11px] text-gray-500">
        운영 정책에 동의했어요 · {toggle}
        {rules}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${missing ? "border-red-400/60 bg-red-500/5" : "border-line bg-surface-2/50"}`}>
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={false}
          onChange={() => {
            agreeTerms();
            onAgree?.();
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--primary))]"
        />
        <span className="text-xs leading-relaxed text-gray-300">
          <b className="text-gray-100">커뮤니티 운영 정책</b>에 동의해요. 욕설·음란물·광고·개인정보 노출 같은 글은 신고되면 지워져요.
        </span>
      </label>
      <div className="mt-1 pl-6 text-xs">{toggle}</div>
      {rules}
      {missing && (
        <p className="mt-1.5 pl-6 text-xs font-semibold text-red-300" role="alert">
          글을 올리려면 운영 정책에 동의해 주세요.
        </p>
      )}
    </div>
  );
}
