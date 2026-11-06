/**
 * /notifications — 앱 알림(새 소식 모음). 웹에는 이 화면이 없어 웹 요청은 홈으로 보낸다.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAppRequest } from "@/lib/app-mode";
import { getLiveStreams } from "@/lib/live";
import { getUpdates } from "@/lib/updates";
import { getNotices, isBoard } from "@/lib/community";
import { formatMatchListDate } from "@/lib/format";
import AppNotifications from "@/components/app/screens/core/AppNotifications";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "알림", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  if (!isAppRequest()) redirect("/");
  const [lives, updates, notices] = await Promise.all([
    getLiveStreams(50, 300).catch(() => []),
    getUpdates(3, 0, 600).catch(() => null),
    getNotices(3, 600).catch(() => []),
  ]);
  return (
    <AppNotifications
      now={Date.now()}
      lives={lives}
      updates={(updates?.items ?? []).map((u) => ({
        id: u.id,
        href: `/updates/${u.id}`,
        title: [u.version, u.title].filter(Boolean).join(" "),
        meta: formatMatchListDate(u.createdAt),
      }))}
      notices={notices.map((n) => ({
        id: n.id,
        href: `/community/${isBoard(n.boardType) ? n.boardType : "free"}/${n.id}`,
        title: n.title,
        meta: formatMatchListDate(n.createdAt),
      }))}
    />
  );
}
