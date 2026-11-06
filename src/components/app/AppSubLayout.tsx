/**
 * 앱 보조 화면 틀 — 앱 전용 화면을 따로 만들지 않은 화면(아이템·코스튬·업데이트·약관 등)을
 * 앱 상단바(뒤로 가기 + 제목) 아래에 웹 내용 그대로 보여 준다. 색은 앱 토큰을 따른다.
 * 각 구간의 layout.tsx 에서 앱 요청일 때만 감싼다(웹은 그대로).
 */
import type { ReactNode } from "react";
import { AppTopBar } from "./AppChrome";

/**
 * @param title 상단바 제목
 * @param backHref 이전 화면이 없을 때 뒤로 가기가 갈 주소 (기본 더보기)
 * @param children 웹 화면 내용
 */
export default function AppSubLayout({
  title,
  backHref = "/more",
  children,
}: {
  title: string;
  backHref?: string;
  children: ReactNode;
}) {
  return (
    <>
      <AppTopBar title={title} backHref={backHref} />
      <div className="min-w-0 px-4 pb-8 pt-2">{children}</div>
    </>
  );
}
