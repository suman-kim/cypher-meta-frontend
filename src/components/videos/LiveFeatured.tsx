"use client";

/**
 * LiveFeatured — 동영상 페이지 전용 '지금 방송 중' UI(메인과 다른 레이아웃).
 * 시청자수 1위 방송을 대형 피처드 카드로, 나머지를 작은 카드로 배치한다.
 * 썸네일 30초 자동 갱신 + 목록 60초 폴링. 카드 클릭 시 방송 페이지로 이동(새 탭).
 */
import { useEffect, useState } from "react";
import SafeImage from "@/components/SafeImage";
import type { LivePlatform, LiveStream } from "@/lib/live";

const PLATFORM: Record<LivePlatform, { label: string; bg: string; fg: string }> = {
  chzzk: { label: "CHZZK", bg: "#00E19C", fg: "#053a2b" },
  youtube: { label: "YouTube", bg: "#FF0033", fg: "#ffffff" },
  soop: { label: "SOOP", bg: "#1f6fff", fg: "#ffffff" },
};

function fmtViewers(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString("ko-KR");
}

function fmtUptime(openDate: string | null): string | null {
  if (!openDate) return null;
  const iso = openDate.includes("T") ? openDate : openDate.replace(" ", "T") + "+09:00";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 0) return null;
  if (mins < 60) return `${mins}분`;
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}

function bust(url: string | null, tick: number): string {
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}_t=${tick}`;
}

const clamp2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

/** 대형 피처드 카드 — 풀블리드 썸네일 + 하단 그라데이션 + 오버레이 텍스트 */
function FeaturedCard({ s, tick }: { s: LiveStream; tick: number }) {
  const p = PLATFORM[s.platform];
  const initial = s.channelName?.trim()?.[0] ?? "?";
  const up = fmtUptime(s.openDate);
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block h-full min-h-[240px] overflow-hidden rounded-2xl border border-line bg-surface-3 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-float"
    >
      <SafeImage
        src={bust(s.thumbnailUrl, tick)}
        alt={s.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        fallbackText={initial}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      <div className="absolute left-3 top-3 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          LIVE
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
          {fmtViewers(s.viewerCount)}명
        </span>
      </div>
      {up && (
        <span
          suppressHydrationWarning
          className="absolute right-3 top-3 rounded-md bg-black/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm"
        >
          {up}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4">
        <span
          className="inline-block rounded-md px-2 py-0.5 text-[11px] font-black shadow-sm"
          style={{ backgroundColor: p.bg, color: p.fg }}
        >
          {p.label}
        </span>
        <h3
          className="mt-2 text-lg font-bold leading-snug text-white drop-shadow sm:text-xl"
          style={clamp2}
          title={s.title}
        >
          {s.title || "제목 없음"}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <SafeImage
            src={s.channelImageUrl ?? ""}
            alt={s.channelName}
            className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-white/30"
            fallbackClassName="rounded-full"
            fallbackText={initial}
          />
          <span className="flex items-center gap-1 truncate text-sm font-medium text-gray-200">
            <span className="truncate">{s.channelName}</span>
            {s.verified && <span className="shrink-0 text-primary">✔</span>}
          </span>
        </div>
      </div>
    </a>
  );
}

/** 작은 카드 — 썸네일 + 오버레이 + 제목/채널 */
function MiniCard({ s, tick }: { s: LiveStream; tick: number }) {
  const p = PLATFORM[s.platform];
  const initial = s.channelName?.trim()?.[0] ?? "?";
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-float"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-3">
        <SafeImage
          src={bust(s.thumbnailUrl, tick)}
          alt={s.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          fallbackText={initial}
        />
        <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
          <span className="inline-flex items-center gap-0.5 rounded bg-red-600 px-1 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">
            <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
            LIVE
          </span>
          <span className="rounded bg-black/70 px-1 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {fmtViewers(s.viewerCount)}명
          </span>
        </div>
        <span
          className="absolute right-1.5 top-1.5 rounded px-1 py-0.5 text-[9px] font-black shadow-sm"
          style={{ backgroundColor: p.bg, color: p.fg }}
        >
          {p.label}
        </span>
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-semibold text-gray-100 group-hover:text-primary" title={s.title}>
          {s.title || "제목 없음"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-gray-500">{s.channelName}</p>
      </div>
    </a>
  );
}

export default function LiveFeatured({ initial, limit = 20 }: { initial: LiveStream[]; limit?: number }) {
  const [streams, setStreams] = useState<LiveStream[]>(initial);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/live?limit=${limit}`, { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as { streams?: LiveStream[] };
        if (alive && Array.isArray(data?.streams)) setStreams(data.streams);
      } catch {
        /* ignore */
      }
    };
    const hidden = () => typeof document !== "undefined" && document.hidden;
    const pollId = setInterval(() => !hidden() && load(), 60_000);
    const thumbId = setInterval(() => !hidden() && setTick((t) => t + 1), 30_000);
    return () => {
      alive = false;
      clearInterval(pollId);
      clearInterval(thumbId);
    };
  }, [limit]);

  const featured = streams[0];
  const rest = streams.slice(1, 5);

  return (
    <section>
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-red-500/10 text-base">🔴</span>
        <h2 className="text-lg font-bold text-gray-100">지금 방송 중</h2>
        {streams.length > 0 && (
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-400">
            {streams.length}
          </span>
        )}
      </div>

      {!featured ? (
        <div className="card p-10 text-center text-sm text-gray-500">현재 진행 중인 사이퍼즈 방송이 없습니다.</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1.5fr,1fr]">
          <FeaturedCard s={featured} tick={tick} />
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {rest.map((s) => (
                <MiniCard key={s.id} s={s} tick={tick} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
