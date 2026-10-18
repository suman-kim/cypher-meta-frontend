"use client";

/**
 * PlayerMatchList.tsx
 * 플레이어 상세의 "최근 전적" 목록 — 스크롤하면 이어서 더 불러오는 무한 스크롤 목록.
 *
 * - 서버가 처음 내려준 전적(게임 타입별 최근 ~100판)을 PAGE_SIZE 씩 나눠 그린다(네트워크 없음).
 * - 다 그리면 게임 타입별 Neople `next` 커서로 /api/players/{id}/matches 를 불러 다음 100판을 받는다.
 * - '전체' 탭은 공식전·일반전 두 흐름을 날짜순으로 합친다. 아직 덜 받은 흐름의 마지막 경기보다
 *   오래된 경기는 그 흐름을 더 받을 때까지 보류한다(나중에 받은 경기가 이미 그린 목록 중간에 끼는 것을 방지).
 * - 하단 센티넬이 화면 가까이 오면(IntersectionObserver) 자동으로 불러오고, 버튼으로도 불러올 수 있다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MatchRow from "@/components/MatchRow";
import { getJSON } from "@/lib/api-client";
import type { MatchRow as MatchRowType } from "@/lib/types";

/** 한 번에 화면에 더 그리는 전적 수 */
const PAGE_SIZE = 20;

/** 게임 타입별 전적 흐름 — 서버 초기값, 이후 받은 페이지가 누적된다 */
export interface MatchStream {
  gameTypeId: string;
  /** 최신순 전적 */
  rows: MatchRowType[];
  /** Neople 다음 페이지 커서 — 없으면 이 흐름은 끝 */
  next?: string;
}

interface Props {
  playerId: string;
  streams: MatchStream[];
}

/** 게임 타입을 붙인 전적 한 줄 */
interface TaggedMatch {
  match: MatchRowType;
  gameTypeId: string;
}

/** /api/players/{id}/matches 응답 */
interface MatchesPage {
  rows?: MatchRowType[];
  next?: string | null;
}

/**
 * 흐름에서 가장 오래된 경기 시각.
 * @param s — 전적 흐름
 * @returns 가장 이른 date. 전적이 없으면 null
 */
function oldestDate(s: MatchStream): string | null {
  let min: string | null = null;
  for (const r of s.rows) {
    const d = r.date ?? "";
    if (min === null || d < min) min = d;
  }
  return min;
}

/**
 * 순서 확정을 막고 있는 흐름 — 커서가 남은 흐름 중 가장 최근에 끊긴 흐름.
 * 이 흐름의 마지막 경기보다 오래된 경기는 이 흐름을 더 받아야 날짜순이 확정된다.
 * @param streams — 전체 흐름
 * @returns { stream, cutoff } — 커서가 남은 흐름이 없으면 null.
 *          전적 없이 커서만 있는 흐름은 cutoff 를 가장 큰 값으로 두어 먼저 받게 한다.
 */
function frontierOf(streams: MatchStream[]): { stream: MatchStream; cutoff: string } | null {
  let best: { stream: MatchStream; cutoff: string } | null = null;
  for (const s of streams) {
    if (!s.next) continue;
    const cutoff = oldestDate(s) ?? "￿";
    if (!best || cutoff > best.cutoff) best = { stream: s, cutoff };
  }
  return best;
}

export default function PlayerMatchList({ playerId, streams: initial }: Props) {
  const [streams, setStreams] = useState<MatchStream[]>(initial);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 전적 갱신 등으로 서버 초기값이 새로 오면 처음부터 다시 보여 준다
  useEffect(() => {
    setStreams(initial);
    setVisible(PAGE_SIZE);
    setError(null);
  }, [initial]);

  // 흐름 병합(중복 제거·최신순) 후, 순서가 확정된 구간까지만 표시 후보로 둔다
  const { safe, frontier } = useMemo(() => {
    const seen = new Set<string>();
    const all: TaggedMatch[] = [];
    for (const s of streams) {
      for (const m of s.rows) {
        const key = `${s.gameTypeId}-${m.matchId}`;
        if (!m.matchId || seen.has(key)) continue;
        seen.add(key);
        all.push({ match: m, gameTypeId: s.gameTypeId });
      }
    }
    all.sort((a, b) => (b.match.date ?? "").localeCompare(a.match.date ?? ""));
    const f = frontierOf(streams);
    return { safe: f ? all.filter((t) => (t.match.date ?? "") >= f.cutoff) : all, frontier: f };
  }, [streams]);

  const hasMore = visible < safe.length || frontier !== null;

  /** 다음 묶음 표시 — 받아 둔 전적이 남았으면 그리기만, 다 그렸으면 다음 페이지를 받는다 */
  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    if (visible < safe.length) {
      setVisible((v) => v + PAGE_SIZE);
      return;
    }
    if (!frontier?.stream.next) return;

    const { gameTypeId, next } = frontier.stream;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ gameTypeId, next });
      const page = await getJSON<MatchesPage>(`/api/players/${encodeURIComponent(playerId)}/matches?${q}`);
      const rows = Array.isArray(page.rows) ? page.rows : [];
      setStreams((prev) =>
        prev.map((s) =>
          s.gameTypeId === gameTypeId
            ? // 빈 페이지면 커서가 남아 있어도 끝으로 본다(같은 요청 반복 방지)
              { ...s, rows: [...s.rows, ...rows], next: rows.length > 0 ? (page.next ?? undefined) : undefined }
            : s,
        ),
      );
      setVisible((v) => v + PAGE_SIZE);
    } catch (e) {
      setError((e as Error).message || "전적을 더 불러오지 못했습니다.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [visible, safe.length, frontier, playerId]);

  // 하단 센티넬 관찰 → 화면 600px 앞에서 미리 불러온다.
  // loadMore 가 바뀔 때마다 다시 관찰해, 불러온 뒤에도 센티넬이 보이면 이어서 불러온다. 오류 시엔 자동 재시도 중단.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || error || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "0px 0px 600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore, error]);

  const shown = safe.slice(0, visible);

  return (
    <div className="space-y-2">
      {shown.map((m) => (
        <MatchRow
          key={`${m.gameTypeId}-${m.match.matchId}`}
          match={m.match}
          gameTypeId={m.gameTypeId}
          highlightPlayerId={playerId}
        />
      ))}

      <div ref={sentinelRef} className="pt-1">
        {error ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <p className="text-xs text-gray-500">{error}</p>
            <button
              type="button"
              onClick={() => void loadMore()}
              className="h-9 rounded-lg border border-line bg-surface px-4 text-xs font-bold text-gray-300 transition-colors hover:border-primary/40 hover:text-primary"
            >
              다시 시도
            </button>
          </div>
        ) : loading ? (
          <div className="flex h-11 items-center justify-center gap-2 text-xs text-gray-500" role="status">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-600 border-t-primary" />
            전적을 불러오는 중…
          </div>
        ) : hasMore ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="h-11 w-full rounded-xl border border-line bg-surface text-sm font-bold text-gray-300 transition-colors hover:border-primary/40 hover:text-primary"
          >
            전적 더 보기
          </button>
        ) : shown.length > 0 ? (
          <p className="py-2 text-center text-xs text-gray-500">
            최근 90일 이내 전적을 모두 불러왔습니다 · {shown.length.toLocaleString()}경기
          </p>
        ) : null}
      </div>
    </div>
  );
}
