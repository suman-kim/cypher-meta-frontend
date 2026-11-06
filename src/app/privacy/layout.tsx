/**
 * /privacy 구간 레이아웃 — 앱 요청이면 앱 보조 화면 틀(상단바 "개인정보처리방침")로 감싸고, 웹은 그대로 둔다.
 */
import type { ReactNode } from "react";
import { isAppRequest } from "@/lib/app-mode";
import AppSubLayout from "@/components/app/AppSubLayout";

/**
 * @param children 이 구간의 페이지
 */
export default function Layout({ children }: { children: ReactNode }) {
  if (isAppRequest()) return <AppSubLayout title="개인정보처리방침">{children}</AppSubLayout>;
  return <>{children}</>;
}
