/**
 * 앱 플레이어·매치 화면의 오류 화면 (서버 컴포넌트).
 * 상단바(뒤로 가기) + 안내 상자 + 다음에 할 일(다시 시도·검색 등)을 보여 준다. 막다른 화면을 두지 않는다.
 */
import type { ReactNode } from "react";
import { AppTopBar } from "../../AppChrome";
import type { IconName } from "../../icons";
import { AppPage, StateBox } from "../../ui";

/**
 * @param title 상단바 제목
 * @param message 큰 안내 글
 * @param desc 작은 설명 (선택)
 * @param actions 다음 동작 버튼·링크들
 * @param icon 안내 아이콘 (기본: 경고)
 * @param backHref 이전 화면이 없을 때 뒤로 가기가 갈 주소
 */
export default function AppErrorScreen({
  title,
  message,
  desc,
  actions,
  icon,
  backHref = "/search",
}: {
  title: string;
  message: string;
  desc?: string;
  actions: ReactNode;
  icon?: IconName;
  backHref?: string;
}) {
  return (
    <div className="min-h-[100dvh]">
      <AppTopBar variant="back" title={title} backHref={backHref} />
      <AppPage className="pt-6">
        <StateBox
          kind="error"
          icon={icon}
          title={message}
          desc={desc}
          action={<div className="flex flex-wrap justify-center gap-2">{actions}</div>}
        />
      </AppPage>
    </div>
  );
}
