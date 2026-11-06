/**
 * AndroidBetaBanner — 홈(메인) 화면의 슬림 '앱 테스터 모집' 배너. 누르면 모집 공고 페이지로 간다.
 * '최신 업데이트' 배너(LatestUpdateCard)와 같은 모양이며, ANDROID_BETA.enabled 가 꺼지면 사라진다.
 */
import Link from "next/link";
import { ANDROID_BETA } from "@/lib/android-beta";

/** 홈 테스터 모집 배너 */
export default function AndroidBetaBanner() {
  if (!ANDROID_BETA.enabled) return null;
  return (
    <Link
      href={ANDROID_BETA.pagePath}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#34a853]/40 hover:shadow-float"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#4f8dff] via-[#2f6fec] to-[#3d4fe0] text-white">
        {/* 앱 아이콘과 같은 막대 3개 */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <rect x="4" y="13" width="4" height="7" rx="1.6" />
          <rect x="10" y="9" width="4" height="11" rx="1.6" />
          <rect x="16" y="4" width="4" height="16" rx="1.6" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[#34a853]">앱 테스터 모집</span>
          <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">Android</span>
        </div>
        <p className="truncate text-sm font-semibold text-gray-100">
          사이퍼즈 메타 앱 비공개 테스트에 참여해 주세요 · 3단계면 끝나요
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium text-gray-400 transition-colors group-hover:text-[#34a853]">
        참여하기 ›
      </span>
    </Link>
  );
}
