"use client";
/**
 * ActivityView.tsx — 관리자 '활동' 탭.
 * 글·댓글·업데이트 댓글·신고·투표·코스튬 제보·앱 알림 기기 등록을 한 목록에 최신순으로 모아 보여 준다.
 *  - 위: 기간 동안 종류별 합계(눌러서 그 종류만 보기)와 하루별 활동 막대
 *  - 아래: 활동 목록(시각·종류·내용·작성자·보러 가기), 50건씩 '더 보기'
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityItem, ActivityResponse, ActivitySummaryResponse } from "@/lib/admin-analytics-core";
import { formatKst, weekdayOf } from "@/lib/admin-analytics-core";
import { adminGet, analyticsUrl, ErrorCard, fmt, StateCard, useAdminData } from "./shared";

/** 한 페이지 건수 */
const PAGE_SIZE = 50;

/** 활동 종류 → 색(칩·막대). 모르는 종류는 회색 */
const TYPE_STYLE: Record<string, { chip: string; bar: string }> = {
  post: { chip: "bg-primary/10 text-primary", bar: "rgb(var(--primary))" },
  comment: { chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", bar: "#34d399" },
  update_comment: { chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400", bar: "#38bdf8" },
  report: { chip: "bg-red-500/10 text-red-600 dark:text-red-400", bar: "#f87171" },
  vote: { chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400", bar: "#a78bfa" },
  costume_feedback: { chip: "bg-pink-500/10 text-pink-600 dark:text-pink-400", bar: "#f472b6" },
  push_device: { chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400", bar: "#fbbf24" },
};
/** 모르는 종류의 색 */
const OTHER_STYLE = { chip: "bg-surface-3 text-gray-400", bar: "#9ca3af" };

/**
 * 종류 색.
 * @param type — 활동 종류 키
 * @returns 칩 class·막대 색
 */
function styleOf(type: string) {
  return TYPE_STYLE[type] ?? OTHER_STYLE;
}

/**
 * 활동 탭.
 * @param props.token — 관리자 토큰
 * @param props.days — 요약 기간(최근 며칠)
 */
export default function ActivityView({ token, days }: { token: string; days: number }) {
  const summary = useAdminData<ActivitySummaryResponse>(token, analyticsUrl("activity/summary", { days }));
  const [type, setType] = useState<string>(""); // 빈 값이면 전체
  const [refresh, setRefresh] = useState(0); // 새로고침 횟수(목록도 다시 읽게)

  /** 요약과 목록을 함께 다시 읽는다 */
  function reloadAll() {
    summary.reload();
    setRefresh((n) => n + 1);
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-gray-100">사이트 활동</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            사람들이 남긴 글·댓글·신고·투표 등을 한곳에서 봐요. 목록은 기간과 상관없이 최신순이고, 지워진 글·댓글은 나오지 않아요.
          </p>
        </div>
        <button type="button" onClick={reloadAll} disabled={summary.loading} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50">
          {summary.loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>

      {summary.error ? (
        <ErrorCard message={summary.error} onRetry={reloadAll} />
      ) : !summary.data ? (
        <StateCard kind="loading" rows={2} />
      ) : (
        <SummaryPanel data={summary.data} type={type} onType={setType} />
      )}

      <ActivityList key={`${type}-${refresh}`} token={token} type={type} onClearType={() => setType("")} />
    </section>
  );
}

/**
 * 종류별 합계 칩 + 하루별 쌓인 막대.
 * @param props.data — 요약 응답
 * @param props.type — 고른 종류(빈 값이면 전체)
 * @param props.onType — 종류 고르기
 */
function SummaryPanel({
  data,
  type,
  onType,
}: {
  data: ActivitySummaryResponse;
  type: string;
  onType: (t: string) => void;
}) {
  const total = data.types.reduce((s, t) => s + t.total, 0);
  const shown = (t: string) => !type || type === t;
  const dayTotal = (r: ActivitySummaryResponse["rows"][number]) =>
    data.types.reduce((s, t) => s + (shown(t.key) ? r.byType[t.key] ?? 0 : 0), 0);
  const peak = Math.max(0, ...data.rows.map(dayTotal));
  const max = Math.max(1, peak);

  return (
    <div className="card space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold text-gray-500">최근 {data.range.days}일</span>
        <button
          type="button"
          onClick={() => onType("")}
          className={`chip border ${!type ? "border-primary/60 bg-primary/10 text-primary" : "border-line text-gray-400 hover:text-gray-200"}`}
        >
          전체 {fmt(total)}
        </button>
        {data.types.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onType(type === t.key ? "" : t.key)}
            className={`chip border ${type === t.key ? `border-current ${styleOf(t.key).chip}` : "border-line text-gray-400 hover:text-gray-200"}`}
          >
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: styleOf(t.key).bar }} />
            {t.label} {fmt(t.total)}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-gray-500">
          <span>하루별 활동 (최근 {data.range.days}일, 한국 시간)</span>
          <span>최고 {fmt(peak)}건 / 일</span>
        </div>
        <div className="flex h-24 items-end gap-[2px]">
          {data.rows.map((r) => {
            const n = dayTotal(r);
            const tip = [
              `${r.date} (${weekdayOf(r.date)}) · ${fmt(n)}건`,
              ...data.types.filter((t) => shown(t.key) && r.byType[t.key]).map((t) => `${t.label} ${fmt(r.byType[t.key])}`),
            ].join("\n");
            return (
              <div key={r.date} className="flex h-full min-w-[3px] flex-1 flex-col justify-end" title={tip}>
                {data.types
                  .filter((t) => shown(t.key) && r.byType[t.key])
                  .map((t) => (
                    <div
                      key={t.key}
                      className="w-full first:rounded-t"
                      style={{ height: `${(r.byType[t.key] / max) * 100}%`, background: styleOf(t.key).bar, opacity: 0.8 }}
                    />
                  ))}
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
          <span>{data.range.from.slice(5)}</span>
          <span>{data.range.to.slice(5)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 활동 목록(최신순, 더 보기).
 * @param props.token — 관리자 토큰
 * @param props.type — 볼 종류(빈 값이면 전체)
 * @param props.onClearType — 종류 필터 풀기
 */
function ActivityList({ token, type, onClearType }: { token: string; type: string; onClearType: () => void }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setError(null);
    adminGet<ActivityResponse>(token, analyticsUrl("activity", { types: type, limit: PAGE_SIZE }), c.signal)
      .then((d) => {
        if (c.signal.aborted) return;
        setItems(d.items);
        setNext(d.nextBefore);
        setLabels(Object.fromEntries(d.types.map((t) => [t.key, t.label])));
      })
      .catch((e: Error) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [token, type, tick]);

  /** 다음 페이지를 이어 붙인다 */
  const loadMore = useCallback(async () => {
    if (!next) return;
    setMoreLoading(true);
    setMoreError(null);
    try {
      const d = await adminGet<ActivityResponse>(token, analyticsUrl("activity", { types: type, limit: PAGE_SIZE, before: next }));
      setItems((prev) => [...prev, ...d.items]);
      setNext(d.nextBefore);
    } catch (e) {
      setMoreError((e as Error).message);
    } finally {
      setMoreLoading(false);
    }
  }, [token, type, next]);

  if (error) return <ErrorCard message={error} onRetry={() => setTick((t) => t + 1)} />;
  if (loading && items.length === 0) return <StateCard kind="loading" rows={6} />;
  if (items.length === 0) {
    return (
      <StateCard
        kind="empty"
        title={type ? `'${labels[type] ?? type}' 활동이 아직 없어요` : "아직 기록된 활동이 없어요"}
        desc="글·댓글·신고 같은 활동이 생기면 여기에 쌓여요."
        action={
          type ? (
            <button type="button" onClick={onClearType} className="btn-ghost px-3 py-1.5 text-xs">
              모든 활동 보기
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className={`card divide-y divide-line transition-opacity ${loading ? "opacity-60" : ""}`}>
      {items.map((it) => (
        <article key={`${it.type}:${it.id}`} className="flex gap-3 px-4 py-3">
          <div className="w-[88px] shrink-0 pt-0.5 font-mono text-[11px] leading-tight text-gray-500" title={formatKst(it.at, true)}>
            {formatKst(it.at).slice(0, 5)}
            <br />
            {formatKst(it.at).slice(6, 11)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`chip ${styleOf(it.type).chip}`}>{labels[it.type] ?? it.type}</span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-100" title={it.title}>
                {it.title}
              </p>
            </div>
            {(it.detail || it.actor) && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                {it.actor && <span className="mr-1.5 font-semibold text-gray-400">{it.actor}</span>}
                {it.detail}
              </p>
            )}
          </div>
          {it.link && (
            <a
              href={it.link}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 self-center text-xs text-gray-500 hover:text-primary"
              title={`${it.link} (새 탭에서 열기)`}
            >
              보기 →
            </a>
          )}
        </article>
      ))}
      <div className="flex flex-col items-center gap-2 px-3 py-3 text-xs text-gray-500">
        {moreError && <p className="text-lose">{moreError}</p>}
        {next ? (
          <button type="button" onClick={loadMore} disabled={moreLoading} className="btn-ghost px-4 py-1.5 text-xs disabled:opacity-50">
            {moreLoading ? "불러오는 중…" : `${PAGE_SIZE}건 더 보기`}
          </button>
        ) : (
          <p>여기까지예요 · {fmt(items.length)}건</p>
        )}
      </div>
    </div>
  );
}
