"use client";

/**
 * 앱 방송·동영상 화면 (시안 11).
 *
 * 구성: 상단바(뒤로 + "방송 · 동영상") 아래 붙는 세그먼트 [방송 N | 동영상].
 *  - 방송: 시청자수 순 목록. 썸네일(LIVE 시청자수·방송 시간), 제목, 채널·플랫폼, 오른쪽 종 버튼(방송 시작 알림 켜기/끄기).
 *    알림은 기기에만 저장한다(app-storage). 실제 푸시는 다음 단계라 처음 켜면 안내 줄을 보인다.
 *  - 동영상: 웹 VideoBrowser 와 같은 /api/videos(커서)로 조회순·최신순 카드 목록, 끝까지 내리면 이어 불러오기.
 * - 방송·영상 링크는 플랫폼 페이지라 앱 밖(기기 브라우저·플랫폼 앱)으로 연다(target=_blank).
 * - ?tab=videos 로 들어오면 동영상 칸을 먼저 연다(홈 빈 상태 버튼). 칸을 바꾸면 주소의 tab 도 맞춰 둔다.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveStream } from "@/lib/live";
import type { Video, VideoSort } from "@/lib/videos";
import { toggleLiveAlert, useHydrated, useLiveAlerts } from "@/lib/app-storage";
import SafeImage from "@/components/SafeImage";
import { AppTopBar, toast } from "../../AppChrome";
import { Icon } from "../../icons";
import { PLATFORM_LOOK, uptime } from "../../live";
import { AppPage, Chip, Segmented, Skel, StateBox } from "../../ui";
import { compactNum, Notice, Spinner } from "./social-ui";

/** 화면 칸 */
export type VideosTab = "live" | "videos";

/** 동영상 다음 쪽 커서 (웹 VideoBrowser·/api/videos 와 같은 모양) */
export interface VideoCursor {
  /** 유튜브 pageToken, 더 없으면 "none" */
  yt: string;
  /** 치지직 offset, 더 없으면 -1 */
  cz: number;
}

/** 앱 방송·동영상 화면이 받는 데이터 */
export interface AppVideosProps {
  /** 지금 방송 중 (시청자수 내림차순) */
  lives: LiveStream[];
  /** 동영상 첫 쪽 (조회순) */
  initialVideos: Video[];
  /** 동영상 다음 쪽 커서 */
  initialCursor: VideoCursor;
  /** 동영상이 더 있는지 */
  initialHasMore: boolean;
  /** 처음 열 칸 */
  initialTab: VideosTab;
  /** 방송 시간 계산 기준 시각(ms) — 서버·클라이언트 표시를 맞춘다 */
  now: number;
}

/** /api/videos 응답 */
interface ApiPage {
  /** 동영상 목록 */
  videos?: Video[];
  /** 다음 커서 */
  next?: VideoCursor;
  /** 더 있는지 */
  hasMore?: boolean;
}

/** 동영상 한 쪽 크기 */
const PAGE = 20;
/** 정렬 칩 */
const SORTS: { key: VideoSort; label: string }[] = [
  { key: "view", label: "조회순" },
  { key: "recent", label: "최신순" },
];

/**
 * @param props AppVideosProps
 */
export default function AppVideos({ lives, initialVideos, initialCursor, initialHasMore, initialTab, now }: AppVideosProps) {
  const [tab, setTab] = useState<VideosTab>(initialTab);

  /** 칸 전환 — 주소의 ?tab 도 바꿔 둔다(새로고침·공유해도 같은 칸) */
  function pick(k: string) {
    const next: VideosTab = k === "videos" ? "videos" : "live";
    setTab(next);
    window.history.replaceState(null, "", next === "videos" ? "/videos?tab=videos" : "/videos");
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <AppTopBar title="방송 · 동영상" backHref="/more">
        <Segmented
          items={[
            { key: "live", label: `방송 ${lives.length}` },
            { key: "videos", label: "동영상" },
          ]}
          value={tab}
          onChange={pick}
        />
      </AppTopBar>
      {tab === "live" ? (
        <LiveList lives={lives} now={now} onShowVideos={() => pick("videos")} />
      ) : (
        <VideoList initial={initialVideos} initialCursor={initialCursor} initialHasMore={initialHasMore} />
      )}
    </>
  );
}

/* ── 방송 ─────────────────────────────────────── */

/**
 * 방송 목록 칸.
 * @param lives 지금 방송 중
 * @param now 방송 시간 기준 시각(ms)
 * @param onShowVideos 빈 상태에서 동영상 칸으로 바꾸기
 */
function LiveList({ lives, now, onShowVideos }: { lives: LiveStream[]; now: number; onShowVideos: () => void }) {
  const hydrated = useHydrated();
  const alerts = useLiveAlerts();
  const anyOn = hydrated && Object.keys(alerts).length > 0;

  if (lives.length === 0) {
    return (
      <AppPage>
        <StateBox
          icon="video"
          title="현재 진행 중인 사이퍼즈 방송이 없어요"
          desc="지난 동영상은 동영상 칸에서 볼 수 있어요."
          action={
            <button
              type="button"
              onClick={onShowVideos}
              className="a-press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
            >
              <Icon name="play" size={14} />
              동영상 보기
            </button>
          }
        />
      </AppPage>
    );
  }

  return (
    <AppPage className="!gap-3">
      <p className="text-xs text-gray-500">시청자수 순 · 종을 누르면 방송 시작 알림을 켜요 · 누르면 방송 앱이나 브라우저로 열려요</p>
      {anyOn && (
        <Notice icon="bell" tone="ac">
          푸시 알림은 준비 중이에요. 알림을 켠 스트리머가 방송 중이면{" "}
          <Link href="/notifications" className="font-bold underline underline-offset-2">
            알림 화면
          </Link>
          에서 볼 수 있어요.
        </Notice>
      )}
      <ul className="grid gap-3.5">
        {lives.map((s) => (
          <LiveRow key={s.id} s={s} now={now} on={hydrated && !!alerts[s.id]} />
        ))}
      </ul>
    </AppPage>
  );
}

/**
 * 방송 한 줄 — 썸네일·제목·채널(앱 밖으로 열림) + 종 버튼.
 * @param s 방송
 * @param now 방송 시간 기준 시각(ms)
 * @param on 이 채널의 방송 시작 알림이 켜져 있는지
 */
function LiveRow({ s, now, on }: { s: LiveStream; now: number; on: boolean }) {
  const look = PLATFORM_LOOK[s.platform] ?? { label: s.platform, bg: "#4a5262" };
  const up = uptime(s.openDate, now);

  /** 알림 켜기/끄기 + 토스트 */
  function onBell() {
    const next = toggleLiveAlert(s.id);
    toast(next ? "방송 시작 알림을 켰어요" : "방송 시작 알림을 껐어요");
  }

  return (
    <li className="flex items-center gap-2">
      <a href={s.url} target="_blank" rel="noopener noreferrer" className="a-press flex min-w-0 flex-1 items-center gap-3">
        <span className="relative block h-[72px] w-[128px] shrink-0 overflow-hidden rounded-xl bg-app-ph">
          {s.thumbnailUrl && (
            // 외부 썸네일이라 next/image 최적화 없이 그대로 쓴다
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          )}
          <span
            className="absolute left-1.5 top-1.5 flex items-center gap-[3px] rounded bg-app-live px-[5px] py-0.5 text-[9.5px] font-extrabold text-white"
            aria-label={`${s.viewerCount.toLocaleString()}명 시청 중`}
          >
            LIVE
            <span className="tabular-nums">{compactNum(s.viewerCount)}</span>
          </span>
          {up && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {up}
            </span>
          )}
        </span>
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="line-clamp-2 text-sm font-bold leading-snug text-gray-100">{s.title || "제목 없는 방송"}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
            <span className="truncate">{s.channelName}</span>
            <span
              className="shrink-0 rounded px-1 py-px text-[9.5px] font-extrabold text-white"
              style={{ background: look.bg }}
            >
              {look.label}
            </span>
            <Icon name="external" size={12} className="shrink-0" />
          </span>
        </span>
      </a>
      <button
        type="button"
        onClick={onBell}
        aria-pressed={on}
        aria-label={on ? `${s.channelName} 방송 시작 알림 끄기` : `${s.channelName} 방송 시작 알림 켜기`}
        className={`a-press grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors ${
          on ? "bg-app-ac-soft text-primary" : "text-gray-500 active:bg-surface-2"
        }`}
      >
        <Icon name="bell" size={20} stroke={1.9} fill={on ? "currentColor" : "none"} />
      </button>
    </li>
  );
}

/* ── 동영상 ───────────────────────────────────── */

/**
 * 동영상 카드 목록 칸 — 정렬 칩 + 이어 불러오기.
 * @param initial 첫 쪽 (조회순)
 * @param initialCursor 다음 쪽 커서
 * @param initialHasMore 더 있는지
 */
function VideoList({
  initial,
  initialCursor,
  initialHasMore,
}: {
  initial: Video[];
  initialCursor: VideoCursor;
  initialHasMore: boolean;
}) {
  const [sort, setSort] = useState<VideoSort>("view");
  const [videos, setVideos] = useState<Video[]>(initial);
  const [cursor, setCursor] = useState<VideoCursor>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const busyRef = useRef(false);
  // 마지막으로 보낸 요청 번호 — 정렬을 바꾼 뒤 늦게 도착한 이전 정렬 응답을 버린다
  const reqRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // 지금 목록이 어떤 정렬로 채워져 있는지 (처음에는 서버가 준 조회순)
  const shownSortRef = useRef<VideoSort>("view");

  /**
   * 한 쪽을 받아 온다.
   * @param s 정렬
   * @param c 커서 (첫 쪽이면 yt="" cz=0)
   * @param reset true 면 목록을 갈아 끼운다(정렬 전환·처음부터 다시) — 받는 중이어도 새로 보낸다
   */
  const fetchPage = useCallback(async (s: VideoSort, c: VideoCursor, reset: boolean) => {
    if (busyRef.current && !reset) return;
    const id = ++reqRef.current;
    busyRef.current = true;
    setLoading(true);
    setErr(false);
    try {
      const r = await fetch(`/api/videos?sort=${s}&yt=${encodeURIComponent(c.yt)}&cz=${c.cz}&limit=${PAGE}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as ApiPage;
      if (id !== reqRef.current) return;
      const list = Array.isArray(d.videos) ? d.videos : [];
      setVideos((prev) => {
        if (reset) return list;
        const seen = new Set(prev.map((v) => v.id));
        return [...prev, ...list.filter((v) => !seen.has(v.id))];
      });
      setCursor(d.next ?? { yt: "none", cz: -1 });
      setHasMore(Boolean(d.hasMore));
    } catch {
      if (id === reqRef.current) setErr(true);
    } finally {
      if (id === reqRef.current) {
        busyRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  // 정렬을 바꾸면 첫 쪽부터 다시 (지금 목록과 같은 정렬이면 그대로)
  useEffect(() => {
    if (shownSortRef.current === sort) return;
    shownSortRef.current = sort;
    setVideos([]);
    setHasMore(true);
    fetchPage(sort, { yt: "", cz: 0 }, true);
  }, [sort, fetchPage]);

  // 목록 끝이 보이면 다음 쪽
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || err) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchPage(sort, cursor, false);
      },
      { rootMargin: "800px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchPage, sort, cursor, hasMore, err, videos.length]);

  const firstLoading = loading && videos.length === 0;

  return (
    <AppPage className="!gap-4">
      <div className="flex items-center gap-1.5">
        {SORTS.map((s) => (
          <Chip key={s.key} active={sort === s.key} soft onClick={() => setSort(s.key)}>
            {s.label}
          </Chip>
        ))}
        <span className="ml-auto text-[11px] text-gray-500">유튜브 사이퍼즈 영상</span>
      </div>

      {firstLoading ? (
        <div className="grid gap-5" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-2">
              <Skel className="aspect-video rounded-[14px]" />
              <Skel className="h-4 w-3/4 rounded" />
              <Skel className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        err ? (
          <StateBox
            kind="error"
            title="동영상을 불러오지 못했어요"
            desc="잠시 뒤 다시 시도해 주세요."
            action={<RetryButton onClick={() => fetchPage(sort, { yt: "", cz: 0 }, true)} />}
          />
        ) : (
          <StateBox icon="video" title="사이퍼즈 동영상을 찾지 못했어요" desc="정렬을 바꾸거나 잠시 뒤 다시 열어 주세요." />
        )
      ) : (
        <>
          <ul className="grid gap-5">
            {videos.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </ul>
          <div ref={sentinelRef} aria-hidden="true" />
          {loading && (
            <p className="flex items-center justify-center gap-2 py-2 text-xs text-gray-500">
              <Spinner size={14} />
              동영상을 더 불러오는 중
            </p>
          )}
          {err && (
            <div className="flex flex-col items-center gap-2 py-2 text-xs text-gray-500">
              <span>동영상을 더 불러오지 못했어요.</span>
              <RetryButton onClick={() => fetchPage(sort, cursor, false)} />
            </div>
          )}
          {!hasMore && !loading && <p className="py-2 text-center text-xs text-gray-500">모든 동영상을 불러왔어요.</p>}
        </>
      )}
    </AppPage>
  );
}

/**
 * 다시 시도 버튼.
 * @param onClick 누름 처리
 */
function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="a-press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
    >
      <Icon name="refresh" size={15} />
      다시 시도
    </button>
  );
}

/**
 * 재생 시간(초) → "m:ss" / "h:mm:ss".
 * @param sec 초 (없으면 null)
 */
function fmtDuration(sec: number | null): string | null {
  if (!sec || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * 올린 시점 → "3일 전" 꼴.
 * @param iso 올린 시각 (없으면 null)
 */
function fmtAgo(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 0) return null;
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d >= 365) return `${Math.floor(d / 365)}년 전`;
  if (d >= 30) return `${Math.floor(d / 30)}개월 전`;
  if (d >= 1) return `${d}일 전`;
  if (h >= 1) return `${h}시간 전`;
  if (min >= 1) return `${min}분 전`;
  return "방금 전";
}

/** 동영상 플랫폼 배지 */
const VIDEO_LOOK: Record<string, { label: string; bg: string }> = {
  youtube: { label: "YouTube", bg: "#e62117" },
  chzzk: { label: "CHZZK", bg: "#00b86b" },
};

/**
 * 동영상 카드 — 16:9 썸네일(길이), 제목 두 줄, 채널 · 조회수 · 올린 시점. 앱 밖으로 연다.
 * @param v 동영상
 */
function VideoCard({ v }: { v: Video }) {
  const dur = fmtDuration(v.durationSec);
  const ago = fmtAgo(v.publishedAt);
  const look = VIDEO_LOOK[v.platform] ?? { label: v.platform, bg: "#4a5262" };
  return (
    <li>
      <a href={v.url} target="_blank" rel="noopener noreferrer" className="a-press grid gap-2">
        <span className="relative block aspect-video overflow-hidden rounded-[14px] bg-app-ph">
          <SafeImage src={v.thumbnailUrl ?? ""} alt="" className="h-full w-full object-cover" fallbackText={v.channelName?.[0]} />
          <span className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-extrabold text-white" style={{ background: look.bg }}>
            {look.label}
          </span>
          {dur && (
            <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[10.5px] font-semibold text-white tabular-nums">
              {dur}
            </span>
          )}
        </span>
        <span className="flex gap-2.5">
          <span className="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-app-ph">
            <SafeImage
              src={v.channelImageUrl ?? ""}
              alt=""
              className="h-full w-full object-cover"
              fallbackClassName="rounded-full"
              fallbackText={v.channelName?.[0]}
            />
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="line-clamp-2 text-sm font-bold leading-snug text-gray-100">{v.title || "제목 없음"}</span>
            <span className="flex min-w-0 items-center gap-1 text-xs text-gray-500" suppressHydrationWarning>
              <span className="truncate">{v.channelName}</span>
              <span className="shrink-0">· 조회 {compactNum(v.viewCount)}회</span>
              {ago && <span className="shrink-0">· {ago}</span>}
              <Icon name="external" size={12} className="ml-0.5 shrink-0" />
            </span>
          </span>
        </span>
      </a>
    </li>
  );
}
