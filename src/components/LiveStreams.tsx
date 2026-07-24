"use client";

/**
 * LiveStreams — 메인 '지금 방송 중'. 플랫폼별로 한 줄씩(치지직 / SOOP / 유튜브) 가로 레일.
 * 각 플랫폼 라인 위에 플랫폼 태그 타이틀을 두고, 그 플랫폼 방송만 시청자수 내림차순으로 슬라이드한다.
 *
 * 실시간 미리보기(하이브리드):
 *  - 평소: 썸네일 30초 자동 갱신.
 *  - 데스크톱(hover): 마우스 오버한 카드만 실제 HLS 영상(음소거) 재생.
 *  - 모바일/태블릿: 화면에 가장 크게 보이는 카드 "한 개"만 자동 재생(전체 레일 통틀어 1개).
 *  실패(CORS 등) 시 조용히 썸네일 유지.
 *
 * SSR initial 로 즉시 렌더 + 60초 /api/live 폴링. 드래그 스크롤은 RankerSlider 와 동일.
 */
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";
import SafeImage from "@/components/SafeImage";
import { loadHls } from "@/lib/hls-loader";
import type { LivePlatform, LiveStream } from "@/lib/live";

/** 플랫폼별 뱃지 색/이름 */
const PLATFORM: Record<LivePlatform, { label: string; bg: string; fg: string }> = {
  chzzk: { label: "CHZZK", bg: "#00E19C", fg: "#053a2b" },
  youtube: { label: "YouTube", bg: "#FF0033", fg: "#ffffff" },
  soop: { label: "SOOP", bg: "#1f6fff", fg: "#ffffff" },
};

/** 라인 표시 순서 */
const PLATFORM_ORDER: LivePlatform[] = ["chzzk", "soop", "youtube"];

/** 가로 레일 공통 클래스(좌우 끝 페이드 마스크 없음) */
const RAIL_CLASS =
  "flex cursor-grab select-none gap-1 overflow-x-auto overscroll-x-contain pb-2 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:pointer-events-none";

/** 시청자수를 한국식(만/천)으로 축약 */
function fmtViewers(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString("ko-KR");
}

/** 방송 시작 시각 → 경과 시간(uptime). openDate 는 KST 기준 문자열로 가정. */
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

/** 이 기기가 마우스 호버를 지원하는지(모바일 터치 제외) */
function hoverCapable(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
}

/**
 * 라이브 카드 1개 — 카드 전체(썸네일 포함)가 방송 페이지 링크.
 * @param active — 터치 기기에서 부모가 지정한 "현재 자동재생 카드" 여부(데스크톱이면 undefined → hover 사용)
 */
function LiveCard({ s, tick, active }: { s: LiveStream; tick: number; active?: boolean }) {
  const initial = s.channelName?.trim()?.[0] ?? "?";
  const up = fmtUptime(s.openDate);

  const [hover, setHover] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 미리보기 트리거: 데스크톱=hover, 터치=부모가 넘긴 active
  const preview = active === undefined ? hover : active;

  // 썸네일 자동 갱신(30초 tick 으로 캐시버스팅)
  const thumb = s.thumbnailUrl
    ? `${s.thumbnailUrl}${s.thumbnailUrl.includes("?") ? "&" : "?"}_t=${tick}`
    : "";

  // 미리보기 활성 시 치지직 HLS 재생. 실제 재생이 시작될 때만(setPlaying) 영상 노출 →
  // CORS 등으로 실패하면 검은 박스 없이 썸네일 유지. 220ms 디바운스로 스크롤/호버 깜빡임 방지.
  useEffect(() => {
    if (!preview || s.platform !== "chzzk") return;
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    const video = videoRef.current;
    const onPlaying = () => {
      if (!cancelled) setPlaying(true);
    };
    video?.addEventListener("playing", onPlaying);

    const run = async () => {
      try {
        const channelId = s.id.replace(/^chzzk:/, "");
        const r = await fetch(`/api/chzzk/live-url?channelId=${encodeURIComponent(channelId)}`, {
          cache: "no-store",
        });
        if (!r.ok) return;
        const { url } = (await r.json()) as { url?: string | null };
        if (!url || cancelled || !video) return;

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url; // Safari/iOS 네이티브 HLS
        } else {
          // hls.js 는 CDN 지연로드되므로 타입 없이 any 로 다룸
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Hls = (await loadHls()) as any;
          if (cancelled || !Hls || !Hls.isSupported?.()) return;
          const inst = new Hls({ maxBufferLength: 6, liveSyncDurationCount: 3, enableWorker: true });
          hls = inst;
          inst.on(Hls.Events.ERROR, (_e: unknown, data: { fatal?: boolean }) => {
            if (data?.fatal) {
              try {
                inst.destroy();
              } catch {
                /* noop */
              }
            }
          });
          inst.loadSource(url);
          inst.attachMedia(video);
        }
        video.muted = true;
        video.play().catch(() => {});
      } catch {
        /* 재생 불가 → 썸네일 유지 */
      }
    };

    const timer = setTimeout(() => void run(), 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setPlaying(false);
      video?.removeEventListener("playing", onPlaying);
      if (hls) {
        try {
          hls.destroy();
        } catch {
          /* noop */
        }
      }
      if (video) {
        try {
          video.pause();
          video.removeAttribute("src");
          video.load();
        } catch {
          /* noop */
        }
      }
    };
  }, [preview, s.platform, s.id]);

  // 호버/활성 시 유튜브 iframe 임베드 미리보기(220ms 디바운스). 음소거 자동재생.
  useEffect(() => {
    if (!preview || s.platform !== "youtube") {
      setYtReady(false);
      return;
    }
    const t = setTimeout(() => setYtReady(true), 220);
    return () => {
      clearTimeout(t);
      setYtReady(false);
    };
  }, [preview, s.platform]);

  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      data-id={s.id}
      onMouseEnter={() => hoverCapable() && setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative h-[200px] w-[240px] shrink-0 overflow-hidden rounded-xl border border-line bg-surface-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-float lg:h-[236px] lg:w-[430px]"
    >
      <SafeImage
        src={thumb}
        alt={s.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        fallbackText={initial}
      />
      {s.platform === "chzzk" && preview && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={`absolute inset-0 h-full w-full bg-black object-cover transition-opacity duration-300 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
          style={{ pointerEvents: "none" }}
        />
      )}
      {s.platform === "youtube" && preview && ytReady && (
        <iframe
          src={`https://www.youtube.com/embed/${s.id.replace(/^youtube:/, "")}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1`}
          title={s.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="lazy"
          className="absolute inset-0 z-[1] h-full w-full border-0"
          style={{ pointerEvents: "none" }}
        />
      )}
      {/* 영상 위 텍스트 가독성용 하단 그라데이션 */}
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      {/* 상단 좌: LIVE + 시청자수(명) */}
      <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
        <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          LIVE
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-sm">
          {fmtViewers(s.viewerCount)}명
        </span>
      </div>
      {/* 상단 우: 방송 시간 (시간 의존값—하이드레이션 경고 억제) */}
      {up && (
        <span
          suppressHydrationWarning
          className="absolute right-2 top-2 z-10 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm"
        >
          {up}
        </span>
      )}
      {/* 하단: 제목 + 채널 (영상 안) */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-2.5">
        <p className="truncate text-sm font-semibold text-white drop-shadow" title={s.title}>
          {s.title || "제목 없음"}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <SafeImage
            src={s.channelImageUrl ?? ""}
            alt={s.channelName}
            className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white/25"
            fallbackClassName="rounded-full"
            fallbackText={initial}
          />
          <span className="flex min-w-0 items-center gap-1 truncate text-xs font-medium text-white/85">
            <span className="truncate">{s.channelName}</span>
            {s.verified && <span className="shrink-0 text-sky-300">✔</span>}
          </span>
        </div>
      </div>
    </a>
  );
}

/** 플랫폼 1개의 태그 타이틀 + 가로 레일(한 줄) */
function PlatformRail({
  platform,
  items,
  tick,
  touch,
  activeId,
}: {
  platform: LivePlatform;
  items: LiveStream[];
  tick: number;
  touch: boolean;
  activeId: string | null;
}) {
  const p = PLATFORM[platform];
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return; // 터치/펜은 브라우저 네이티브 가로 스크롤(관성) 사용
    const el = track.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
    // setPointerCapture 미사용: click 이 트랙으로 넘어가 카드 링크 이동이 막히는 문제 방지
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = track.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 8) drag.current.moved = true; // 트랙패드 미세 움직임을 드래그로 오인하지 않도록
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const onUp = () => {
    drag.current.active = false;
  };
  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div>
      {/* 플랫폼 태그 타이틀 (섹션 타이틀보다 작게) */}
      <div className="mb-2.5 flex items-center gap-1.5">
        <span
          className="rounded-md px-2.5 py-1 text-[13px] font-black shadow-sm"
          style={{ backgroundColor: p.bg, color: p.fg }}
        >
          {p.label}
        </span>
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-bold text-gray-500">
          {items.length}개
        </span>
      </div>
      <div
        ref={track}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCapture}
        className={RAIL_CLASS}
      >
        {items.map((s) => (
          <LiveCard key={s.id} s={s} tick={tick} active={touch ? activeId === s.id : undefined} />
        ))}
      </div>
    </div>
  );
}

/**
 * 라이브 섹션 본체.
 * @param initial — 서버(SSR)에서 합친 초기 라이브 목록
 * @param limit — 폴링 시 요청할 최대 라이브 수
 */
export default function LiveStreams({ initial, limit = 20 }: { initial: LiveStream[]; limit?: number }) {
  const [streams, setStreams] = useState<LiveStream[]>(initial);
  const [tick, setTick] = useState(0);
  const [touch, setTouch] = useState(false); // hover 미지원(모바일/태블릿)
  const [activeId, setActiveId] = useState<string | null>(null); // 터치: 자동재생 대상 카드(전체 레일 통틀어 1개)

  const sectionRef = useRef<HTMLElement>(null);

  // 기기 판별(마운트 후 1회)
  useEffect(() => {
    setTouch(!hoverCapable());
  }, []);

  // 목록 60초 폴링 + 썸네일 30초 자동 갱신(탭 백그라운드면 스킵)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/live?limit=${limit}`, { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as { streams?: LiveStream[] };
        if (alive && Array.isArray(data?.streams)) setStreams(data.streams);
      } catch {
        /* 폴링 실패는 조용히 무시 */
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

  // 터치 기기: 전체 레일 통틀어 화면에 가장 크게 보이는 카드 1개만 자동재생
  useEffect(() => {
    if (!touch) return;
    const root = sectionRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.id;
          if (id) ratios.set(id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let bestId: string | null = null;
        let best = 0;
        ratios.forEach((r, id) => {
          if (r > best) {
            best = r;
            bestId = id;
          }
        });
        setActiveId(best >= 0.5 ? bestId : null);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    root.querySelectorAll<HTMLElement>("[data-id]").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [touch, streams]);

  // 플랫폼별 그룹(있는 플랫폼만, 각 그룹 시청자수 내림차순)
  const groups = PLATFORM_ORDER.map((pf) => ({
    pf,
    items: streams.filter((s) => s.platform === pf).sort((a, b) => b.viewerCount - a.viewerCount),
  })).filter((g) => g.items.length > 0);

  return (
    <section ref={sectionRef}>
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-gray-100">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-red-500/10 text-base">🔴</span>
          지금 방송 중
          {streams.length > 0 && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-400">
              {streams.length}
            </span>
          )}
        </h2>
        <span className="text-xs text-gray-500">시청자수 순</span>
      </div>

      {groups.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">현재 진행 중인 사이퍼즈 방송이 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <PlatformRail key={g.pf} platform={g.pf} items={g.items} tick={tick} touch={touch} activeId={activeId} />
          ))}
        </div>
      )}
    </section>
  );
}
