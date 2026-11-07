"use client";
/**
 * DayDetail.tsx — 일별 표에서 날짜를 누르면 펼쳐지는 하루 상세.
 * 그날 합계, 페이지별 조회수(상위 20), 시간대별 방문, 검색어, 유입 경로, 이벤트를 한 화면에 묶어 보여 주고,
 * '이날 방문 로그 보기'·'이 화면 로그 보기'로 방문 로그 탭에 바로 넘어갈 수 있게 한다(막다른 화면 없음).
 */
import type { DayResponse } from "@/lib/admin-analytics-core";
import { eventLabel, referrerHost, weekdayOf } from "@/lib/admin-analytics-core";
import { analyticsUrl, ErrorCard, fmt, StateCard, useAdminData } from "./shared";
import type { LogPreset } from "./VisitLogView";

/**
 * 하루 상세.
 * @param props.token — 관리자 토큰
 * @param props.date — 볼 날짜 'YYYY-MM-DD' (KST)
 * @param props.onOpenLogs — 방문 로그 탭을 이 조건으로 열기
 */
export default function DayDetail({
  token,
  date,
  onOpenLogs,
}: {
  token: string;
  date: string;
  onOpenLogs: (preset: LogPreset) => void;
}) {
  const { data, loading, error, reload } = useAdminData<DayResponse>(token, analyticsUrl("day", { date }));

  if (error) return <ErrorCard message={error} onRetry={reload} />;
  if (loading || !data) return <StateCard kind="loading" rows={4} />;

  const t = data.totals;
  const hours = Array.from({ length: 24 }, (_, h) => data.hours.find((x) => x.hour === h) ?? { hour: h, views: 0, visitors: 0 });
  const maxHour = Math.max(1, ...hours.map((h) => h.views));
  const maxPage = Math.max(1, ...data.pages.map((p) => p.views));

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-100">
          {date} ({weekdayOf(date)}) 상세
        </h3>
        <button
          type="button"
          onClick={() => onOpenLogs({ from: date, to: date })}
          className="btn-ghost px-3 py-1.5 text-xs"
        >
          이날 방문 로그 보기 →
        </button>
      </div>

      {/* 합계 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["조회수", fmt(t.views)],
          ["방문자", fmt(t.visitors)],
          ["전적 검색", fmt(t.searches)],
          ["앱 / 웹 조회", `${fmt(t.appViews)} / ${fmt(t.webViews)}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface px-3 py-2">
            <div className="text-[11px] text-gray-500">{label}</div>
            <div className="text-lg font-black text-gray-50">{value}</div>
          </div>
        ))}
      </div>

      {t.views === 0 && data.events.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">이날은 방문 기록이 없어요.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* 페이지별 조회수 */}
          <section className="rounded-lg bg-surface p-3 lg:row-span-2">
            <h4 className="mb-2 text-xs font-bold text-gray-300">페이지별 조회수 (상위 20)</h4>
            {data.pages.length === 0 ? (
              <p className="text-xs text-gray-500">조회 기록이 없어요.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.pages.map((p) => (
                  <li key={p.path}>
                    <div className="flex items-center gap-2 text-xs">
                      <a
                        href={p.path}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-gray-200 hover:text-primary"
                        title={`${p.path} (새 탭에서 열기)`}
                      >
                        {p.path}
                      </a>
                      <button
                        type="button"
                        onClick={() => onOpenLogs({ from: date, to: date, text: p.path })}
                        className="shrink-0 text-[11px] text-gray-500 hover:text-primary"
                      >
                        로그
                      </button>
                      <span className="w-20 shrink-0 text-right text-gray-400">
                        <b className="text-gray-200">{fmt(p.views)}</b> · {fmt(p.visitors)}명
                      </span>
                    </div>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${(p.views / maxPage) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 시간대별 */}
          <section className="rounded-lg bg-surface p-3">
            <h4 className="mb-2 text-xs font-bold text-gray-300">시간대별 조회 (KST)</h4>
            <div className="flex h-20 items-end gap-[2px]">
              {hours.map((h) => (
                <div key={h.hour} className="flex h-full flex-1 items-end" title={`${h.hour}시 · 조회 ${fmt(h.views)} · 방문자 ${fmt(h.visitors)}`}>
                  <div
                    className="w-full rounded-t bg-primary/60"
                    style={{ height: `${Math.max((h.views / maxHour) * 100, h.views > 0 ? 4 : 0)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-500">
              <span>0시</span>
              <span>6시</span>
              <span>12시</span>
              <span>18시</span>
              <span>23시</span>
            </div>
          </section>

          {/* 검색어 · 유입 · 이벤트 */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MiniList
              title="검색어"
              empty="검색 기록이 없어요."
              items={data.searches.map((s) => ({ label: s.query, value: s.count }))}
            />
            <MiniList
              title="유입 경로"
              empty="외부에서 들어온 기록이 없어요."
              items={data.referrers.map((r) => ({ label: referrerHost(r.referrer), value: r.count, title: r.referrer }))}
            />
            <div className="sm:col-span-2">
              <MiniList
                title="이벤트"
                empty="기록된 이벤트가 없어요."
                items={data.events.map((e) => ({ label: eventLabel(e.event), value: e.count, title: e.event }))}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/**
 * 이름·숫자 짧은 목록.
 * @param props.title — 제목
 * @param props.items — 항목(이름·값·마우스를 올리면 보일 원래 값)
 * @param props.empty — 비었을 때 문구
 */
function MiniList({
  title,
  items,
  empty,
}: {
  title: string;
  items: { label: string; value: number; title?: string }[];
  empty: string;
}) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <h4 className="mb-2 text-xs font-bold text-gray-300">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={`${it.label}-${i}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-gray-300" title={it.title ?? it.label}>
                {it.label}
              </span>
              <span className="shrink-0 font-semibold text-gray-400">{fmt(it.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
