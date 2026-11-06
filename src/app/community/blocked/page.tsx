/**
 * /community/blocked — 이 기기에서 차단한 작성자 관리(목록·차단 풀기).
 * 차단은 서버에 저장하지 않으므로 화면은 기기 저장값을 읽는 BlockedAuthorsList 가 그린다.
 * 앱 요청이면 앱 상단바·여백으로, 웹이면 카드 레이아웃으로 감싼다.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { isAppRequest } from "@/lib/app-mode";
import { AppTopBar } from "@/components/app/AppChrome";
import { AppPage } from "@/components/app/ui";
import BlockedAuthorsList from "@/components/moderation/BlockedAuthorsList";

export const metadata: Metadata = {
  title: "차단한 작성자",
  robots: { index: false },
};

/** 차단 안내 문구 */
const NOTE = "차단은 이 기기에만 저장되고 상대에게 알려지지 않아요. 같은 닉네임을 쓰는 다른 사람의 글도 함께 숨겨져요.";

/** 차단한 작성자 화면 */
export default function BlockedAuthorsPage() {
  if (isAppRequest()) {
    return (
      <>
        <AppTopBar title="차단한 작성자" backHref="/more" />
        <AppPage>
          <p className="px-1 text-[13px] leading-relaxed text-gray-500">{NOTE}</p>
          <BlockedAuthorsList />
        </AppPage>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-2">
      <Link href="/community" className="inline-block text-sm text-gray-400 hover:text-primary">
        ← 커뮤니티
      </Link>
      <div>
        <h1 className="text-xl font-bold text-gray-50">차단한 작성자</h1>
        <p className="mt-1 text-sm text-gray-500">{NOTE}</p>
      </div>
      <BlockedAuthorsList />
    </div>
  );
}
