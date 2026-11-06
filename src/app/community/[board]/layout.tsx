import { ReactNode } from "react";
import BoardSidebar from "@/components/community/BoardSidebar";
import { isAppRequest } from "@/lib/app-mode";

export default function CommunityBoardLayout({ children }: { children: ReactNode }) {
  // 앱 WebView: 웹 게시판 사이드바 없이 화면(목록·글·글쓰기)만 그린다. 게시판 전환은 앱 화면의 세그먼트가 맡는다.
  if (isAppRequest()) return <>{children}</>;

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
      <div className="mb-4 lg:mb-0 lg:sticky lg:top-20 lg:self-start">
        <BoardSidebar />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
