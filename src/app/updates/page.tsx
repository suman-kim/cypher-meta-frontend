import type { Metadata } from "next";
import Link from "next/link";
import { getUpdates } from "@/lib/updates";
import UpdateBody from "@/components/updates/UpdateBody";
import MarkUpdatesSeen from "@/components/updates/MarkUpdatesSeen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "업데이트 노트",
  description: "사이퍼즈 메타 사이트의 새 기능과 개선 사항을 최신순으로 확인하세요.",
  alternates: { canonical: "/updates" },
};

/** 도트 그리드 배경(히어로 텍스처) */
const DOT_GRID: React.CSSProperties = {
  backgroundImage: "radial-gradient(rgb(var(--border)) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
};

/** 작성 시각 → KST 절대 날짜(서버에서 1회 계산) */
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

/** 작성 시각 → 상대 시간(오늘/어제/N일 전) */
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

export default async function UpdatesPage() {
  const { items, total } = await getUpdates(50, 0).catch(() => ({ items: [], total: 0 }));
  const latestId = items[0]?.id ?? null;

  return (
    <div className="relative mx-auto max-w-3xl">
      {latestId && <MarkUpdatesSeen latestId={latestId} />}

      {/* 페이지 오로라 배경 (글래스 카드가 이 위에 얹혀 프로스티드 효과) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-24 -top-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl dark:bg-primary/25" />
        <div className="absolute -left-24 top-52 h-64 w-64 rounded-full bg-[#8b5cf6]/12 blur-3xl dark:bg-[#a98bff]/18" />
        <div className="absolute bottom-24 right-4 h-56 w-56 rounded-full bg-[#2dd4bf]/10 blur-3xl dark:bg-[#2dd4bf]/12" />
      </div>

      {/* 히어로 (프로스티드 글래스) */}
      <header className="relative mb-10 overflow-hidden rounded-3xl border border-line bg-surface/70 px-6 py-9 shadow-[0_20px_60px_-40px_rgba(40,60,120,0.6)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/25 blur-3xl dark:bg-primary/30" />
        <div
          className="pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
          style={DOT_GRID}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_8px_rgb(var(--primary))]" />
            What&rsquo;s New
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-50 sm:text-[2.5rem]">
            업데이트{" "}
            <span className="bg-gradient-to-r from-primary to-[#8b5cf6] bg-clip-text text-transparent">
              노트
            </span>
          </h1>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            사이트에 반영된 새 기능과 개선 사항을 최신순으로 정리했습니다.
          </p>
          {total > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-xs text-gray-400 backdrop-blur">
              <span className="font-black text-gray-100">{total}</span>개의 업데이트
              {items[0] && (
                <>
                  <span className="h-3 w-px bg-line" />
                  최근 <span className="font-semibold text-primary">{relDate(items[0].createdAt)}</span>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 타임라인 */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/70 p-14 text-center text-sm text-gray-500 backdrop-blur-md">
          아직 등록된 업데이트가 없습니다.
        </div>
      ) : (
        <ol>
          {items.map((u, i) => {
            const latest = i === 0;
            const last = i === items.length - 1;
            return (
              <li key={u.id} className="relative flex gap-4 pb-6 last:pb-0 sm:gap-5">
                {/* 좌측 타임라인(노드 + 연결선) */}
                <div className="relative flex w-4 shrink-0 flex-col items-center">
                  {latest ? (
                    <span className="relative mt-6 flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
                      <span className="relative h-3.5 w-3.5 rounded-full bg-primary ring-4 ring-bg shadow-[0_0_12px_2px_rgba(83,131,232,0.55)] dark:shadow-[0_0_14px_3px_rgba(122,162,255,0.65)]" />
                    </span>
                  ) : (
                    <span className="mt-6 h-2.5 w-2.5 rounded-full border border-line bg-surface-3 ring-4 ring-bg" />
                  )}
                  {!last && (
                    <span className="mt-2 w-px flex-1 bg-gradient-to-b from-primary/45 via-line to-transparent" />
                  )}
                </div>

                {/* 카드 (프로스티드 글래스) */}
                <Link
                  href={`/updates/${u.id}`}
                  className={`group relative block flex-1 overflow-hidden rounded-2xl border p-5 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 sm:p-6 ${
                    latest
                      ? "border-primary/40 bg-surface/80 shadow-[0_18px_50px_-30px_rgba(83,131,232,0.6)] dark:bg-white/[0.06] dark:shadow-[0_0_40px_-16px_rgba(122,162,255,0.55)]"
                      : "border-line bg-surface/70 hover:border-primary/30 dark:border-white/10 dark:bg-white/[0.035]"
                  }`}
                >
                  {latest && (
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {u.version && (
                      <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-300">
                        {u.version}
                      </span>
                    )}
                    {latest && (
                      <span className="rounded-full bg-gradient-to-r from-primary to-[#8b5cf6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                        New
                      </span>
                    )}
                    <time
                      className="ml-auto flex items-center gap-1.5 text-xs text-gray-500"
                      dateTime={u.createdAt}
                    >
                      <span className="font-medium text-gray-400">{relDate(u.createdAt)}</span>
                      <span className="h-2.5 w-px bg-line" />
                      {fmtDate(u.createdAt)}
                    </time>
                  </div>
                  <h2 className="mt-2.5 text-lg font-bold tracking-tight text-gray-50 sm:text-xl">
                    {u.title}
                  </h2>
                  <UpdateBody content={u.content} className="mt-3.5" />
                  <div className="mt-4 flex items-center gap-1.5 border-t border-line/70 pt-3 text-xs font-medium text-gray-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    댓글 {u.commentCount}
                    <span className="ml-auto inline-flex items-center gap-0.5 font-semibold text-primary">
                      자세히 보기 <span aria-hidden>›</span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
