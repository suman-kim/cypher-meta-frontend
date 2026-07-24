"use client";

/**
 * VideoBrowser — 사이퍼즈 동영상 그리드 + 정렬 탭(조회순/최신순) + 무한 스크롤(커서).
 * SSR initial(첫 페이지) 로 즉시 렌더. 탭 전환 시 첫 페이지 재조회.
 * 하단 센티넬이 보이면 커서(유튜브 pageToken + 치지직 offset)로 다음 페이지를 이어붙인다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import VideoCard from "@/components/videos/VideoCard";
import type { Video, VideoSort } from "@/lib/videos";

const TABS: { key: VideoSort; label: string }[] = [
  { key: "view", label: "조회순" },
  { key: "recent", label: "최신순" },
];

interface Cursor {
  yt: string; // pageToken 또는 "none"
  cz: number; // offset 또는 -1
}

interface ApiPage {
  videos?: Video[];
  next?: Cursor;
  hasMore?: boolean;
}

export default function VideoBrowser({
  initial,
  initialSort = "view",
  initialCursor,
  initialHasMore = true,
  pageSize = 24,
}: {
  initial: Video[];
  initialSort?: VideoSort;
  initialCursor: Cursor;
  initialHasMore?: boolean;
  pageSize?: number;
}) {
  const [sort, setSort] = useState<VideoSort>(initialSort);
  const [videos, setVideos] = useState<Video[]>(initial);
  const [cursor, setCursor] = useState<Cursor>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const firstRender = useRef(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Set<string>>(new Set(initial.map((v) => v.id)));

  // 탭 전환 시 첫 페이지 재조회 (초기 렌더는 SSR 데이터 사용)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let alive = true;
    setLoading(true);
    setVideos([]);
    seenRef.current = new Set();
    fetch(`/api/videos?sort=${sort}&yt=&cz=0&limit=${pageSize}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: ApiPage) => {
        if (!alive) return;
        const list = (Array.isArray(d.videos) ? d.videos : []).filter((v) => {
          if (seenRef.current.has(v.id)) return false;
          seenRef.current.add(v.id);
          return true;
        });
        setVideos(list);
        setCursor(d.next ?? { yt: "none", cz: -1 });
        setHasMore(Boolean(d.hasMore));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [sort, pageSize]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const r = await fetch(
        `/api/videos?sort=${sort}&yt=${encodeURIComponent(cursor.yt)}&cz=${cursor.cz}&limit=${pageSize}`,
        { cache: "no-store" },
      );
      const d = (r.ok ? await r.json() : {}) as ApiPage;
      const fresh = (Array.isArray(d.videos) ? d.videos : []).filter((v) => {
        if (seenRef.current.has(v.id)) return false;
        seenRef.current.add(v.id);
        return true;
      });
      setVideos((prev) => [...prev, ...fresh]);
      setCursor(d.next ?? { yt: "none", cz: -1 });
      setHasMore(Boolean(d.hasMore));
    } catch {
      /* 무시 — 다음 스크롤에 재시도 */
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, sort, cursor, pageSize]);

  // 하단 센티넬 관찰 → 다음 페이지
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "800px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore]);

  const showSkeleton = loading && videos.length === 0;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-gray-100">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-base">🎬</span>
          사이퍼즈 동영상
        </h2>
        <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSort(t.key)}
              aria-pressed={sort === t.key}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
                sort === t.key
                  ? "bg-surface text-primary shadow-sm ring-1 ring-line"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {showSkeleton ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-xl bg-surface-3" />
              <div className="mt-3 h-4 w-3/4 rounded bg-surface-3" />
              <div className="mt-2 h-3 w-1/2 rounded bg-surface-3" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-500">사이퍼즈 관련 동영상을 찾지 못했습니다.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
          <div ref={sentinelRef} className="h-10" />
          {loading && (
            <div className="flex justify-center py-4">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-primary" />
            </div>
          )}
          {!hasMore && <div className="py-6 text-center text-xs text-gray-500">모든 동영상을 불러왔어요.</div>}
        </>
      )}
    </section>
  );
}
