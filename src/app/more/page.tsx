/**
 * /more — 앱 하단 탭 "더보기". 웹에는 이 화면이 없어 웹 요청은 홈으로 보낸다.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAppRequest } from "@/lib/app-mode";
import { getLiveStreams } from "@/lib/live";
import { getLatestUpdate } from "@/lib/updates";
import AppMore from "@/components/app/screens/core/AppMore";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "더보기", robots: { index: false, follow: false } };

export default async function MorePage() {
  if (!isAppRequest()) redirect("/");
  const [lives, latest] = await Promise.all([
    getLiveStreams(50, 300).catch(() => []),
    getLatestUpdate(600).catch(() => null),
  ]);
  return (
    <AppMore
      liveCount={lives.length}
      latestUpdate={latest ? [latest.version, latest.title].filter(Boolean).join(" ") : null}
    />
  );
}
