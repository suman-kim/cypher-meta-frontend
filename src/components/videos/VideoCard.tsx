"use client";

/**
 * VideoCard — 사이퍼즈 동영상(VOD) 카드. 썸네일 + 재생시간 + 플랫폼 뱃지 + 제목 + 채널 + 조회수/업로드 시점.
 * 카드 전체가 동영상 링크(새 탭).
 */
import SafeImage from "@/components/SafeImage";
import type { Video, VideoPlatform } from "@/lib/videos";

const PLATFORM: Record<VideoPlatform, { label: string; bg: string; fg: string }> = {
  chzzk: { label: "CHZZK", bg: "#00E19C", fg: "#053a2b" },
  youtube: { label: "YouTube", bg: "#FF0033", fg: "#ffffff" },
};

const clamp2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

/** 조회수 축약 */
function fmtViews(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억회`;
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만회`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천회`;
  return `${n.toLocaleString("ko-KR")}회`;
}

/** 재생시간 초 → m:ss / h:mm:ss */
function fmtDuration(sec: number | null): string | null {
  if (!sec || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 업로드 시점 상대표시 */
function fmtAgo(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const diff = Date.now() - t;
  if (diff < 0) return null;
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d >= 365) return `${Math.floor(d / 365)}년 전`;
  if (d >= 30) return `${Math.floor(d / 30)}개월 전`;
  if (d >= 1) return `${d}일 전`;
  if (h >= 1) return `${h}시간 전`;
  if (min >= 1) return `${min}분 전`;
  return "방금 전";
}

export default function VideoCard({ v }: { v: Video }) {
  const p = PLATFORM[v.platform];
  const initial = v.channelName?.trim()?.[0] ?? "?";
  const dur = fmtDuration(v.durationSec);
  const ago = fmtAgo(v.publishedAt);

  return (
    <a
      href={v.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-float"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-3">
        <SafeImage
          src={v.thumbnailUrl ?? ""}
          alt={v.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          fallbackText={initial}
        />
        <span
          className="absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-black shadow-sm"
          style={{ backgroundColor: p.bg, color: p.fg }}
        >
          {p.label}
        </span>
        {dur && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-bold text-white">
            {dur}
          </span>
        )}
      </div>
      <div className="flex gap-3 p-3">
        <SafeImage
          src={v.channelImageUrl ?? ""}
          alt={v.channelName}
          className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover"
          fallbackClassName="rounded-full"
          fallbackText={initial}
        />
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold leading-snug text-gray-100 transition-colors group-hover:text-primary"
            style={clamp2}
            title={v.title}
          >
            {v.title || "제목 없음"}
          </p>
          <div className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500">
            <span className="truncate">{v.channelName}</span>
            {v.verified && <span className="shrink-0 text-primary">✔</span>}
          </div>
          <div className="mt-0.5 text-[11px] text-gray-500" suppressHydrationWarning>
            조회 {fmtViews(v.viewCount)}
            {ago ? ` · ${ago}` : ""}
          </div>
        </div>
      </div>
    </a>
  );
}
