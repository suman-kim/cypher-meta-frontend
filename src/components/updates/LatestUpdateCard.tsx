import Link from "next/link";
import type { UpdateNote } from "@/lib/updates";

/** 메인 페이지용 슬림 '최신 업데이트' 배너 카드 — /updates 로 이동 */
export default function LatestUpdateCard({ update }: { update: UpdateNote }) {
  return (
    <Link
      href="/updates"
      className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-float"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-base">📢</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-primary">새 업데이트</span>
          {update.version && (
            <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
              {update.version}
            </span>
          )}
        </div>
        <p className="truncate text-sm font-semibold text-gray-100">{update.title}</p>
      </div>
      <span className="shrink-0 text-sm font-medium text-gray-400 transition-colors group-hover:text-primary">
        자세히 ›
      </span>
    </Link>
  );
}
