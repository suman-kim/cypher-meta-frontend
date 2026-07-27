import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUpdate, getUpdateComments } from "@/lib/updates";
import UpdateBody from "@/components/updates/UpdateBody";
import UpdateComments from "@/components/updates/UpdateComments";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const u = await getUpdate(params.id);
  return {
    title: u ? `${u.title} · 업데이트 노트` : "업데이트 노트",
    robots: u ? undefined : { index: false },
  };
}

/** 작성 시각 → KST 절대 날짜 */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 작성 시각 → 상대 시간 */
function relDate(iso: string): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

export default async function UpdateDetailPage({ params }: Props) {
  const [update, comments] = await Promise.all([
    getUpdate(params.id),
    getUpdateComments(params.id),
  ]);
  if (!update) notFound();

  return (
    <div className="relative mx-auto max-w-3xl space-y-6">
      {/* 페이지 오로라 배경 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-24 -top-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl dark:bg-primary/25" />
        <div className="absolute -left-24 top-56 h-64 w-64 rounded-full bg-[#8b5cf6]/12 blur-3xl dark:bg-[#a98bff]/18" />
      </div>

      {/* 뒤로가기 */}
      <Link
        href="/updates"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary"
      >
        <span aria-hidden>←</span> 업데이트 목록
      </Link>

      {/* 상세 카드 (프로스티드 글래스) */}
      <article className="relative overflow-hidden rounded-3xl border border-primary/30 bg-surface/80 p-6 shadow-[0_18px_50px_-30px_rgba(83,131,232,0.6)] backdrop-blur-xl dark:bg-white/[0.06] dark:shadow-[0_0_44px_-16px_rgba(122,162,255,0.55)] sm:p-8">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl dark:bg-primary/25" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            {update.version && (
              <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-300">
                {update.version}
              </span>
            )}
            <span className="rounded-full bg-gradient-to-r from-primary to-[#8b5cf6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              Update
            </span>
            <time className="ml-auto flex items-center gap-1.5 text-xs text-gray-500" dateTime={update.createdAt}>
              <span className="font-medium text-gray-400">{relDate(update.createdAt)}</span>
              <span className="h-2.5 w-px bg-line" />
              {fmtDate(update.createdAt)}
            </time>
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-gray-50 sm:text-3xl">
            {update.title}
          </h1>
          <UpdateBody content={update.content} className="mt-5" />
        </div>
      </article>

      {/* 댓글 */}
      <UpdateComments updateId={update.id} initialComments={comments} />
    </div>
  );
}
