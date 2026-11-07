"use client";
/**
 * VisitLogView.tsx — 관리자 '방문 로그' 탭.
 * 방문 기록을 기간·이벤트·경로/검색어·기기·앱/웹·검색 로봇 포함 여부로 걸러 최신순으로 보여 주고, 50건씩 '더 보기'로 넘긴다.
 * 방문자 칸을 누르면 그 사람의 요약(VisitorPanel)이 열리고, '이 방문자 기록만 보기'로 이동 경로를 시간순으로 볼 수 있다.
 * 일별 탭의 하루 상세에서 넘어올 때는 preset 으로 조건을 미리 채운다.
 */
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LogsResponse, VisitLog } from "@/lib/admin-analytics-core";
import {
  addDays,
  deviceLabel,
  eventLabel,
  eventTone,
  formatKst,
  kstToday,
  referrerHost,
  shortId,
} from "@/lib/admin-analytics-core";
import VisitorPanel from "./VisitorPanel";
import { adminGet, analyticsUrl, ErrorCard, fmt, StateCard } from "./shared";

/** 방문 로그 필터 */
export interface LogFilter {
  /** 시작 날짜(KST) */
  from: string;
  /** 끝 날짜(KST, 포함) */
  to: string;
  /** 이벤트 이름(빈 값이면 전체) */
  event: string;
  /** 경로·검색어에 들어 있는 글자(빈 값이면 전체) */
  text: string;
  /** 기기 유형(빈 값이면 전체) */
  device: "" | "desktop" | "mobile" | "tablet";
  /** 앱/웹(빈 값이면 전체) */
  client: "" | "app" | "web";
  /** 방문자 ID(빈 값이면 전체) */
  visitorId: string;
  /** 검색 로봇 포함 */
  bots: boolean;
}

/** 다른 탭에서 넘어올 때 미리 채울 조건 */
export type LogPreset = Partial<Pick<LogFilter, "from" | "to" | "text" | "event" | "visitorId">>;

/** 한 페이지 건수 */
const PAGE_SIZE = 50;

/**
 * 기본 필터(최근 7일, 로봇 제외).
 * @returns 필터
 */
function defaultFilter(): LogFilter {
  const today = kstToday();
  return { from: addDays(today, -6), to: today, event: "", text: "", device: "", client: "", visitorId: "", bots: false };
}

/** 이벤트 분류 → 칩 색 */
const TONE_CLASS = {
  view: "bg-surface-3 text-gray-400",
  search: "bg-primary/10 text-primary",
  action: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const;

/**
 * 방문 로그 탭.
 * @param props.token — 관리자 토큰
 * @param props.preset — 미리 채울 조건(일별 탭에서 넘어올 때)
 */
export default function VisitLogView({ token, preset }: { token: string; preset?: LogPreset }) {
  const [filter, setFilter] = useState<LogFilter>(() => ({ ...defaultFilter(), ...preset }));
  const [textInput, setTextInput] = useState(filter.text);
  const [items, setItems] = useState<VisitLog[]>([]);
  const [events, setEvents] = useState<{ event: string; count: number }[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [visitor, setVisitor] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  /** 필터 → 쿼리 값 */
  const params = useMemo(
    () => ({
      from: filter.from,
      to: filter.to,
      event: filter.event,
      text: filter.text,
      device: filter.device,
      client: filter.client,
      visitorId: filter.visitorId,
      bots: filter.bots ? "1" : "",
      limit: PAGE_SIZE,
    }),
    [filter],
  );

  // 조건이 바뀌면 첫 페이지부터 다시 읽는다
  useEffect(() => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setError(null);
    setMoreError(null);
    adminGet<LogsResponse>(token, analyticsUrl("logs", params), c.signal)
      .then((d) => {
        if (c.signal.aborted) return;
        setItems(d.items);
        setCursor(d.nextCursor);
        if (d.events) setEvents(d.events);
      })
      .catch((e: Error) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [token, params, tick]);

  /** 다음 페이지를 이어 붙인다 */
  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setMoreLoading(true);
    setMoreError(null);
    try {
      const d = await adminGet<LogsResponse>(token, analyticsUrl("logs", { ...params, cursor }));
      setItems((prev) => [...prev, ...d.items]);
      setCursor(d.nextCursor);
    } catch (e) {
      setMoreError((e as Error).message);
    } finally {
      setMoreLoading(false);
    }
  }, [token, params, cursor]);

  /**
   * 필터 일부를 바꾼다.
   * @param patch — 바꿀 값
   */
  function update(patch: Partial<LogFilter>) {
    setFilter((f) => ({ ...f, ...patch }));
  }

  /**
   * 기간 빠른 선택.
   * @param days — 오늘 포함 최근 며칠
   */
  function quickRange(days: number) {
    const today = kstToday();
    update({ from: addDays(today, -(days - 1)), to: today });
  }

  /** 필터를 처음 상태로 */
  function reset() {
    setFilter(defaultFilter());
    setTextInput("");
  }

  /** @param e — 경로·검색어 검색 제출 */
  function onSearch(e: FormEvent) {
    e.preventDefault();
    update({ text: textInput.trim() });
  }

  const today = kstToday();
  const filtered =
    filter.event || filter.text || filter.device || filter.client || filter.visitorId || filter.bots ||
    filter.from !== addDays(today, -6) || filter.to !== today;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-gray-100">방문 로그</h2>
        <p className="mt-0.5 text-xs text-gray-500">시각은 한국 시간이에요. 방문자 칸을 누르면 그 사람이 본 화면을 모아 볼 수 있어요.</p>
      </div>

      {/* 필터 */}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="w-12 shrink-0 font-semibold text-gray-400">기간</span>
          <input
            type="date"
            value={filter.from}
            max={filter.to}
            onChange={(e) => e.target.value && update({ from: e.target.value })}
            className="input h-8 w-36 py-1 text-xs"
            aria-label="시작 날짜"
          />
          <span className="text-gray-500">~</span>
          <input
            type="date"
            value={filter.to}
            min={filter.from}
            max={today}
            onChange={(e) => e.target.value && update({ to: e.target.value })}
            className="input h-8 w-36 py-1 text-xs"
            aria-label="끝 날짜"
          />
          <div className="flex gap-1">
            {[
              [1, "오늘"],
              [7, "7일"],
              [30, "30일"],
            ].map(([d, label]) => (
              <button key={d} type="button" onClick={() => quickRange(d as number)} className="btn-ghost px-2 py-1 text-[11px]">
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="w-12 shrink-0 font-semibold text-gray-400">종류</span>
          <select
            value={filter.event}
            onChange={(e) => update({ event: e.target.value })}
            className="input h-8 w-auto max-w-[260px] py-1 text-xs"
            aria-label="이벤트"
          >
            <option value="">모든 이벤트</option>
            {events.map((ev) => (
              <option key={ev.event} value={ev.event}>
                {eventLabel(ev.event)} ({fmt(ev.count)})
              </option>
            ))}
            {filter.event && !events.some((ev) => ev.event === filter.event) && (
              <option value={filter.event}>{eventLabel(filter.event)}</option>
            )}
          </select>
          <select
            value={filter.device}
            onChange={(e) => update({ device: e.target.value as LogFilter["device"] })}
            className="input h-8 w-auto py-1 text-xs"
            aria-label="기기"
          >
            <option value="">모든 기기</option>
            <option value="desktop">PC</option>
            <option value="mobile">모바일</option>
            <option value="tablet">태블릿</option>
          </select>
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-0.5">
            {([
              ["", "앱+웹"],
              ["app", "앱"],
              ["web", "웹"],
            ] as const).map(([key, label]) => (
              <button
                key={key || "all"}
                type="button"
                onClick={() => update({ client: key })}
                className={`segtab px-2.5 py-1 text-[11px] ${filter.client === key ? "segtab-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-gray-400">
            <input type="checkbox" checked={filter.bots} onChange={(e) => update({ bots: e.target.checked })} />
            검색 로봇 포함
          </label>
        </div>

        <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2 text-xs">
          <span className="w-12 shrink-0 font-semibold text-gray-400">찾기</span>
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            maxLength={100}
            placeholder="경로나 검색어 일부 (예: /community, 닉네임)"
            className="input h-8 min-w-0 flex-1 py-1 text-xs sm:max-w-sm"
          />
          <button type="submit" className="btn-primary px-3 py-1.5 text-xs">
            찾기
          </button>
          {filtered && (
            <button type="button" onClick={reset} className="btn-ghost px-3 py-1.5 text-xs">
              필터 초기화
            </button>
          )}
        </form>

        {filter.visitorId && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
            방문자 <b className="font-mono">{shortId(filter.visitorId)}</b> 의 기록만 보는 중
            <button type="button" onClick={() => setVisitor(filter.visitorId)} className="underline-offset-2 hover:underline">
              요약 보기
            </button>
            <button type="button" onClick={() => update({ visitorId: "" })} className="ml-auto font-semibold hover:underline">
              전체 방문자 보기 ×
            </button>
          </div>
        )}
      </div>

      {/* 결과 */}
      {error ? (
        <ErrorCard message={error} onRetry={() => setTick((t) => t + 1)} />
      ) : loading && items.length === 0 ? (
        <StateCard kind="loading" rows={8} />
      ) : items.length === 0 ? (
        <StateCard
          kind="empty"
          title="조건에 맞는 방문 기록이 없어요"
          desc="기간을 넓히거나 다른 조건을 골라 보세요."
          action={
            filtered ? (
              <button type="button" onClick={reset} className="btn-ghost px-3 py-1.5 text-xs">
                필터 초기화
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className={`card overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
                <th className="px-3 py-2.5 text-left">시각</th>
                <th className="px-3 py-2.5 text-left">이벤트</th>
                <th className="px-3 py-2.5 text-left">경로</th>
                <th className="px-3 py-2.5 text-left">방문자</th>
                <th className="px-3 py-2.5 text-left">앱/웹</th>
                <th className="px-3 py-2.5 text-left">기기</th>
                <th className="px-3 py-2.5 text-left">유입</th>
                <th className="px-3 py-2.5 text-left">IP · 지역</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0 hover:bg-surface-2/40">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-400" title={formatKst(v.createdAt, true)}>
                    {formatKst(v.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`chip max-w-[200px] truncate ${TONE_CLASS[eventTone(v.event)]}`} title={v.event}>
                      {eventLabel(v.event)}
                    </span>
                  </td>
                  <td className="max-w-[260px] px-3 py-2">
                    <a href={v.path} target="_blank" rel="noreferrer" className="block truncate text-gray-200 hover:text-primary" title={v.path}>
                      {v.path}
                    </a>
                    {v.query && <span className="block truncate text-xs text-primary">“{v.query}”</span>}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setVisitor(v.visitorId)}
                      className="font-mono text-xs text-gray-300 underline-offset-2 hover:text-primary hover:underline"
                      title={`${v.visitorId} — 눌러서 요약 보기`}
                    >
                      {shortId(v.visitorId)}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`chip ${v.client === "app" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-surface-3 text-gray-500"}`}>
                      {v.client === "app" ? "앱" : "웹"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">
                    {[deviceLabel(v.device), v.browser, v.os].filter((x) => x && x !== "-").join(" · ") || "-"}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-xs text-gray-400" title={v.referrer ?? ""}>
                    {v.referrer ? referrerHost(v.referrer) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                    {v.ip || "-"}
                    {v.country ? ` · ${v.city || v.country}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col items-center gap-2 border-t border-line px-3 py-3 text-xs text-gray-500">
            {moreError && <p className="text-lose">{moreError}</p>}
            {cursor ? (
              <button type="button" onClick={loadMore} disabled={moreLoading} className="btn-ghost px-4 py-1.5 text-xs disabled:opacity-50">
                {moreLoading ? "불러오는 중…" : `${PAGE_SIZE}건 더 보기`}
              </button>
            ) : (
              <p>여기까지예요 · {fmt(items.length)}건</p>
            )}
          </div>
        </div>
      )}

      {visitor && (
        <VisitorPanel
          token={token}
          visitorId={visitor}
          onClose={() => setVisitor(null)}
          onShowLogs={(from) => {
            update({ visitorId: visitor, from, to: kstToday(), event: "", text: "", device: "", client: "", bots: true });
            setTextInput("");
            setVisitor(null);
          }}
        />
      )}
    </section>
  );
}
