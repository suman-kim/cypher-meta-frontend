/**
 * /account — 앱 "내 계정 · 즐겨찾기". 내용은 기기 저장값이라 화면 전체를 클라이언트에서 그린다.
 * 웹에는 이 화면이 없어 웹 요청은 홈으로 보낸다.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAppRequest } from "@/lib/app-mode";
import AppAccount from "@/components/app/screens/core/AppAccount";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "내 계정 · 즐겨찾기", robots: { index: false, follow: false } };

export default function AccountPage() {
  if (!isAppRequest()) redirect("/");
  return <AppAccount />;
}
