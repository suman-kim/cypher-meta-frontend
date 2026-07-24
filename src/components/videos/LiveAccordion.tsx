"use client";

/**
 * LiveAccordion — 동영상 페이지 '지금 방송 중'. 모든 라이브를 가로 아코디언으로 배치.
 * 데스크톱: 각 패널이 flex-1 로 균등, 마우스를 올리면 그 패널이 커지고 나머지는 줄어든다.
 * 모바일: 가로 스크롤(패널 고정폭). 썸네일 30초 자동 갱신 + 목록 60초 폴링.
 */
import { useEffect, useState } from "react";
import SafeImage from "@/components/SafeImage";
import type { LivePlatform, LiveStream } from "@/lib/live";

const PLATFORM: Record<LivePlatform, { label: string; bg: string; fg: string }> = {
  chzzk: { label: "CHZZK", bg: "#00E19C", fg: "#053a2b" },
  youtube: { label: "YouTube", bg: "#FF0033", fg: "#ffffff" },
  soop: { label: "SOOP", bg: "#1f6fff", fg: "#ffffff" },
};

const clamp2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
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

/** 아코디언 패널 1개 */
function Panel({
  s,
  tick,
  active,
  onEnter,
}: {
  s: LiveStream;
  tick: number;
  active?: boolean;
  onEnter?: () => void;
}) {
  const p = PLATFORM[s.platform];
  const initial = s.channelName?.trim()?.[0] ?? "?";
  const up = fmtUptime(s.openDate);
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={onEnter}
      className={`group relative h-[240px] w-[82vw] shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-3 shadow-sm transition-all duration-500 ease-out sm:h-[520px] sm:w-0 sm:min-w-[60px] sm:shrink ${
        active ? "sm:flex-[6.5]" : "sm:flex-1"
      }`}
    >
      <SafeImage
        src={bust(s.thumbnailUrl, tick)}
        alt={s.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        fallbackText={initial}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />

      {/* 항상 표시: LIVE + 시청자수 */}
      <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
        <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          LIVE
        </span>
        <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          {fmtViewers(s.viewerCount)}명
        </span>
      </div>
      <span
        className="absolute right-2.5 top-2.5 rounded-md px-1.5 py-0.5 text-[10px] font-black shadow-sm"
        style={{ backgroundColor: p.bg, color: p.fg }}
      >
        {p.label}
      </span>

      {/* 하단 정보: 모바일은 항상, 데스크톱은 호버 시 노출 */}
      <div
        className={`absolute inset-x-0 bottom-0 p-3 opacity-100 transition-opacity duration-300 ${
          active ? "sm:opacity-100" : "sm:opacity-0"
        }`}
      >
        {up && <span className="text-[11px] font-medium text-white/75">{up} 방송 중</span>}
        <h3 className="mt-0.5 text-sm font-bold leading-snug text-white drop-shadow" style={clamp2} title={s.title}>
          {s.title || "제목 없음"}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5">
          <SafeImage
            src={s.channelImageUrl ?? ""}
            alt={s.channelName}
            className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white/30"
            fallbackClassName="rounded-full"
            fallbackText={initial}
          />
          <span className="flex items-center gap-1 truncate text-xs font-medium text-white/90">
            <span className="truncate">{s.channelName}</span>
            {s.verified && <span className="shrink-0 text-sky-300">✔</span>}
          </span>
        </div>
      </div>
    </a>
  );
}

/** 아코디언 아래에 이어붙는 일반 라이브 카드(나머지 방송) */
function RestCard({ s, tick }: { s: LiveStream; tick: number }) {
  const p = PLATFORM[s.platform];
  const initial = s.channelName?.trim()?.[0] ?? "?";
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl bg-surface shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-float"
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

export default function LiveAccordion({ initial, limit = 20 }: { initial: LiveStream[]; limit?: number }) {
  const [streams, setStreams] = useState<LiveStream[]>(initial);
  const [tick, setTick] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0); // 아코디언 확대 대상(기본=첫 번째, 벗어나면 다시 첫 번째)

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

      {streams.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-500">현재 진행 중인 사이퍼즈 방송이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {/* 상위 5개 아코디언(호버 확대) */}
          <div
            onMouseLeave={() => setActiveIdx(0)}
            className="flex overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:overflow-visible"
          >
            {streams.slice(0, 5).map((s, i) => (
              <Panel key={s.id} s={s} tick={tick} active={i === activeIdx} onEnter={() => setActiveIdx(i)} />
            ))}
          </div>
          {/* 나머지 라이브 — 카드 그리드로 이어붙임 */}
          {streams.length > 5 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {streams.slice(5).map((s) => (
                <RestCard key={s.id} s={s} tick={tick} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
