"use client";

/**
 * 앱 전체 랭킹의 4위 이후 목록 — 촘촘한 한 줄 반 행 + 끝에 닿으면 다음 50명 이어 불러오기.
 *
 * - 100위까지: 순위·변동 | 대표 캐릭터 얼굴 | 닉네임·클랜 / 성향 태그 1~2개 + 픽 얼굴 3개 | RP·승률
 * - 101위부터: 순위·변동 | 닉네임·클랜 | RP 만
 * 다음 순위는 /api/app/ranking?offset= 으로 받는다. 불러오는 중·실패(다시 시도)·끝 상태를 보여 준다.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../../icons";
import { CharImg, Skel, wrClass } from "../../ui";
import { MiniTag, RankDelta } from "./parts";
import { ENRICH_MAX_RANK, type AppRankPage, type AppRankRow } from "./rank-data";

/**
 * 100위 안쪽 촘촘한 행.
 * @param r 랭킹 한 줄
 */
function RichRow({ r }: { r: AppRankRow }) {
  const top = r.picks[0];
  return (
    <Link
      href={`/players/${r.playerId}`}
      className="grid grid-cols-[30px_40px_minmax(0,1fr)_auto] items-center gap-x-2.5 px-3 py-2.5 transition-colors active:bg-surface-2"
    >
      <span className="grid justify-items-center gap-0.5">
        <span className="text-[15px] font-extrabold tabular-nums text-gray-200">{r.rank}</span>
        <RankDelta rank={r.rank} beforeRank={r.beforeRank} />
      </span>
      <CharImg id={top?.characterId} name={top?.characterName ?? r.nickname} size={40} radius={12} />
      <span className="grid min-w-0 gap-1">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-sm font-bold text-gray-100">{r.nickname}</span>
          {r.clan && <span className="min-w-0 shrink-[2] truncate text-[11px] text-gray-500">{r.clan}</span>}
        </span>
        <span className="flex min-w-0 items-center gap-1">
          {r.tags[0] && <MiniTag tag={r.tags[0]} />}
          {r.tags[1] && <MiniTag tag={r.tags[1]} className="hidden min-[400px]:inline-flex" />}
          {r.picks.length > 0 && (
            <span
              className="ml-auto flex shrink-0 -space-x-1.5 pl-1"
              aria-label={`많이 고른 캐릭터 ${r.picks.map((p) => `${p.characterName} ${p.count}판`).join(", ")}`}
            >
              {r.picks.map((p) => (
                <CharImg
                  key={p.characterId}
                  id={p.characterId}
                  name={p.characterName}
                  size={18}
                  radius={9}
                  className="ring-2 ring-[rgb(var(--surface))]"
                />
              ))}
            </span>
          )}
        </span>
      </span>
      <span className="grid justify-items-end gap-0.5">
        <span className="whitespace-nowrap">
          <b className="text-[15px] font-extrabold tabular-nums text-primary">{r.rp.toLocaleString()}</b>
          <span className="ml-0.5 text-[10px] font-semibold text-gray-500">RP</span>
        </span>
        <span className={`whitespace-nowrap text-[11px] font-semibold tabular-nums ${wrClass(r.winRate)}`}>
          {r.winRate !== null ? `승률 ${r.winRate}%` : "기록 없음"}
        </span>
      </span>
    </Link>
  );
}

/**
 * 101위 이후 RP 만 보이는 행.
 * @param r 랭킹 한 줄
 */
function TailRow({ r }: { r: AppRankRow }) {
  return (
    <Link
      href={`/players/${r.playerId}`}
      className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-x-2.5 px-3 py-2.5 transition-colors active:bg-surface-2"
    >
      <span className="grid justify-items-center gap-0.5">
        <span className="text-sm font-bold tabular-nums text-gray-300">{r.rank}</span>
        <RankDelta rank={r.rank} beforeRank={r.beforeRank} />
      </span>
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="truncate text-sm font-semibold text-gray-100">{r.nickname}</span>
        {r.clan && <span className="min-w-0 shrink-[2] truncate text-[11px] text-gray-500">{r.clan}</span>}
      </span>
      <span className="whitespace-nowrap">
        <b className="text-sm font-bold tabular-nums text-primary">{r.rp.toLocaleString()}</b>
        <span className="ml-0.5 text-[10px] font-semibold text-gray-500">RP</span>
      </span>
    </Link>
  );
}

/**
 * @param initial 첫 화면에 서버가 그린 줄 (4위부터 또는 시작 순위부터)
 * @param initialNext 다음에 부를 offset (더 없으면 null)
 * @param basisNote 100위 안쪽 목록의 표본 안내 글
 */
export default function RankList({
  initial,
  initialNext,
  basisNote,
}: {
  initial: AppRankRow[];
  initialNext: number | null;
  basisNote: string;
}) {
  const [rows, setRows] = useState<AppRankRow[]>(initial);
  const [next, setNext] = useState<number | null>(initialNext);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  /** 다음 50명을 불러와 붙인다(이미 있는 플레이어는 뺀다). */
  const loadMore = useCallback(async () => {
    if (busy.current || next === null) return;
    busy.current = true;
    setLoading(true);
    setErr(false);
    try {
      const r = await fetch(`/api/app/ranking?offset=${next}`);
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as AppRankPage;
      setRows((prev) => {
        const seen = new Set(prev.map((x) => x.playerId));
        return [...prev, ...d.rows.filter((x) => !seen.has(x.playerId))];
      });
      setNext(d.nextOffset);
    } catch {
      setErr(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [next]);

  // 목록 끝 표시가 화면 가까이 오면 자동으로 다음 순위를 부른다(실패 상태에서는 버튼으로만)
  useEffect(() => {
    const el = sentinel.current;
    if (!el || next === null || err) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, next, err]);

  const rich = rows.filter((r) => r.rank <= ENRICH_MAX_RANK);
  const tail = rows.filter((r) => r.rank > ENRICH_MAX_RANK);

  return (
    <div className="grid grid-cols-1 gap-5">
      {rich.length > 0 && (
        <section className="grid grid-cols-1 gap-2.5">
          <div className="grid gap-0.5">
            <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-gray-100">
              {rich[0].rank}위 ~ {rich[rich.length - 1].rank}위
            </h2>
            <p className="text-[11px] text-gray-500">{basisNote}</p>
          </div>
          <div className="a-card divide-y divide-app-hair overflow-hidden">
            {rich.map((r) => (
              <RichRow key={r.playerId} r={r} />
            ))}
          </div>
        </section>
      )}

      {tail.length > 0 && (
        <section className="grid grid-cols-1 gap-2.5">
          <div className="grid gap-0.5">
            <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-gray-100">
              {tail[0].rank}위 ~ {tail[tail.length - 1].rank}위
            </h2>
            <p className="text-[11px] text-gray-500">101위부터는 RP 만 보여요 · 누르면 전적을 볼 수 있어요</p>
          </div>
          <div className="a-card divide-y divide-app-hair overflow-hidden">
            {tail.map((r) => (
              <TailRow key={r.playerId} r={r} />
            ))}
          </div>
        </section>
      )}

      {/* 이어 불러오기 상태 */}
      <div ref={sentinel} className="grid gap-2">
        {loading ? (
          <>
            <Skel className="h-14 rounded-[14px]" />
            <Skel className="h-14 rounded-[14px]" />
            <Skel className="h-14 rounded-[14px]" />
          </>
        ) : err ? (
          <div className="a-card grid justify-items-center gap-2.5 px-4 py-5 text-center">
            <span className="text-app-loss-tx">
              <Icon name="alert" size={22} />
            </span>
            <p className="text-sm font-semibold text-gray-200">다음 순위를 불러오지 못했어요</p>
            <button
              type="button"
              onClick={() => void loadMore()}
              className="a-press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
            >
              <Icon name="refresh" size={15} />
              다시 시도
            </button>
          </div>
        ) : next !== null ? (
          <p className="flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500">
            <Icon name="chevronDown" size={14} />
            아래로 내리면 다음 순위를 불러와요
          </p>
        ) : rows.length > 0 ? (
          <div className="grid justify-items-center gap-2 py-2">
            <p className="text-xs text-gray-500">모든 순위를 불러왔어요</p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-xs font-semibold text-gray-300"
            >
              <Icon name="chevronUp" size={13} />
              맨 위로
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
