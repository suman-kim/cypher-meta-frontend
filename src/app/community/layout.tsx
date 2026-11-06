/**
 * /community 구간 레이아웃.
 * 앱 요청이고 앱 커뮤니티가 꺼져 있으면(APP_FEATURES.community) 게시판 대신 안내 화면을 그린다.
 * 웹은 그대로 하위 레이아웃·페이지를 그린다.
 */
import type { ReactNode } from "react";
import { isAppRequest } from "@/lib/app-mode";
import { APP_FEATURES } from "@/lib/app-features";
import { AppTopBar } from "@/components/app/AppChrome";
import { AppPage, GhostLink, StateBox } from "@/components/app/ui";

/**
 * @param children 커뮤니티 하위 화면
 */
export default function CommunityLayout({ children }: { children: ReactNode }) {
  if (isAppRequest() && !APP_FEATURES.community) {
    return (
      <div className="min-h-[100dvh]">
        <AppTopBar variant="back" title="커뮤니티" backHref="/" />
        <AppPage className="pt-6">
          <StateBox
            icon="comment"
            title="커뮤니티는 웹사이트에서 이용할 수 있어요"
            desc="앱에서는 전적 검색과 메타 정보를 먼저 제공하고 있어요."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <GhostLink href="/" icon="home">
                  홈으로
                </GhostLink>
                <GhostLink href="/meta" icon="meta">
                  메타 보기
                </GhostLink>
              </div>
            }
          />
        </AppPage>
      </div>
    );
  }
  return <>{children}</>;
}
