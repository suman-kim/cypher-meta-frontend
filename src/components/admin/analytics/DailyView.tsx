"use client";
/**
 * DailyView.tsx — 관리자 '일별' 탭.
 * 한국 시간 하루 단위로 조회수를 보여 준다. 두 가지 보기를 전환한다.
 *  - 날짜별 요약: 조회수·방문자·새 방문자·검색·앱/웹·기타 이벤트 + 전날 대비
 *  - 화면별 조회수: 날짜 × 화면 종류(홈·전적·커뮤니티 …) 표, 칸 색이 진할수록 많음(열마다 따로 비교)
 * 날짜 줄을 누르면 그날 상세(DayDetail)가 바로 아래에 펼쳐진다.
 */
import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DailyResponse, DailyRow } from "@/lib/admin-analytics-core";
import { changeRate, heatAlpha, isWeekend, weekdayOf } from "@/lib/admin-analytics-core";
import DayDetail from "./DayDetail";
import { analyticsUrl, ErrorCard, fmt, StateCard, useAdminData } from "./shared";
import type { LogPreset } from "./VisitLogView";

/** 보기 종류 */
type Mode = "summary" | "groups";

/**
 * 일별 탭.
 * @param props.token — 관리자 토큰
 * @param props.days — 최근 며칠(오늘 포함)
 * @param props.onOpenLogs — 방문 로그 탭을 이 조건으로 열기
 */
export default function DailyView({
  token,
  days,
  onOpenLogs,
}: {
  token: string;
  days: number;
  onOpenLogs: (preset: LogPreset) => void;
}) {
  const { data, loading, error, reload } = useAdminData<DailyResponse>(token, analyticsUrl("daily", { days }));
  const [mode, setMode] = useState<Mode>("summary");
  const [openDate, setOpenDate] = useState<string | null>(null);

  // 최신 날짜가 위로
  const rows = useMemo(() => (data ? [...data.rows].reverse() : []), [data]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-gray-100">일별 조회수</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            한국 시간 자정 기준 · 검색 로봇 제외 · 날짜를 누르면 그날 상세가 열려요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
            {([
              ["summary", "날짜별 요약"],
              ["groups", "화면별 조회수"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`segtab ${mode === key ? "segtab-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={reload} disabled={loading} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50">
            {loading ? "불러오는 중…" : "새로고침"}
          </button>
        </div>
      </div>

      {error ? (
        <ErrorCard message={error} onRetry={reload} />
      ) : !data ? (
        <StateCard kind="loading" rows={6} />
      ) : rows.every((r) => r.views === 0 && r.otherEvents === 0) ? (
        <StateCard
          kind="empty"
          title={`최근 ${days}일 동안 방문 기록이 없어요`}
          desc="기간을 늘려 보거나, 사이트에 방문이 생기면 다시 확인해 주세요."
        />
      ) : mode === "summary" ? (
        <SummaryTable rows={rows} today={data.range.to} openDate={openDate} onToggle={(d) => setOpenDate(openDate === d ? null : d)} detail={(d) => <DayDetail token={token} date={d} onOpenLogs={onOpenLogs} />} />
      ) : (
        <GroupTable data={data} rows={rows} today={data.range.to} openDate={openDate} onToggle={(d) => setOpenDate(openDate === d ? null : d)} detail={(d) => <DayDetail token={token} date={d} onOpenLogs={onOpenLogs} />} />
      )}
    </section>
  );
}

/**
 * 날짜 칸(월-일 + 요일, 주말 강조, 오늘 표시, 펼침 표시).
 * @param props.date — 'YYYY-MM-DD'
 * @param props.open — 펼쳐졌는지
 * @param props.today — 오늘(아직 끝나지 않은 날)인지
 * @param props.sticky — 가로로 밀어도 왼쪽에 붙어 있게 할지(넓은 표)
 */
function DateCell({ date, open, today = false, sticky = false }: { date: string; open: boolean; today?: boolean; sticky?: boolean }) {
  return (
    <td className={`whitespace-nowrap px-3 py-2 ${sticky ? "sticky left-0 z-10 bg-surface" : ""}`}>
      <span className={`mr-1 inline-block w-3 text-gray-500 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
        ›
      </span>
      <span className="font-semibold text-gray-200">{date.slice(5)}</span>{" "}
      <span className={`text-xs ${isWeekend(date) ? "text-primary" : "text-gray-500"}`}>{weekdayOf(date)}</span>
      {today && <span className="chip ml-1.5 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-600 dark:text-emerald-400">오늘</span>}
    </td>
  );
}

/**
 * 전날 대비 칩. 오늘은 하루가 끝나지 않아 비교하지 않는다.
 * @param props.cur — 그날 값
 * @param props.prev — 전날 값
 * @param props.today — 오늘인지
 */
function Delta({ cur, prev, today = false }: { cur: number; prev: number | undefined; today?: boolean }) {
  if (today) return <span className="text-[11px] text-gray-500" title="하루가 끝나지 않아 전날과 비교하지 않아요">집계 중</span>;
  const rate = changeRate(cur, prev);
  if (rate === null) return <span className="text-[11px] text-gray-600">-</span>;
  const up = rate > 0;
  return (
    <span className={`text-[11px] font-semibold ${rate === 0 ? "text-gray-500" : up ? "text-emerald-600 dark:text-emerald-400" : "text-lose"}`}>
      {up ? "▲" : rate < 0 ? "▼" : ""}
      {Math.abs(rate)}%
    </span>
  );
}

/** 표 공통 속성 */
interface TableProps {
  /** 날짜별 줄(최신이 위) */
  rows: DailyRow[];
  /** 펼친 날짜 */
  openDate: string | null;
  /** 날짜 펼치기/접기 */
  onToggle: (date: string) => void;
  /** 펼친 날짜 아래에 그릴 상세 */
  detail: (date: string) => ReactNode;
  /** 오늘 날짜(KST, 기간의 마지막 날) */
  today: string;
}

/**
 * 날짜별 요약 표.
 * @param props — TableProps
 */
function SummaryTable({ rows, openDate, onToggle, detail, today }: TableProps) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  const sum = (k: keyof Omit<DailyRow, "date" | "byGroup">) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const COLS = 7;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
            <th className="px-3 py-2.5 text-left">날짜</th>
            <th className="px-3 py-2.5 text-left">조회수 · 전날 대비</th>
            <th className="px-3 py-2.5 text-right" title="그날 한 번이라도 온 사람(브라우저 쿠키 기준)">방문자</th>
            <th className="px-3 py-2.5 text-right" title="그날 처음 온 사람(브라우저 쿠키 기준)">새 방문자</th>
            <th className="px-3 py-2.5 text-right">전적 검색</th>
            <th className="px-3 py-2.5 text-right">앱 / 웹 조회</th>
            <th className="px-3 py-2.5 text-right" title="버튼 클릭·공지 노출 같은 기록">기타 이벤트</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line bg-surface-2/40 text-xs text-gray-400">
            <td className="px-3 py-2 font-semibold">기간 합계</td>
            <td className="px-3 py-2 font-bold text-gray-100">{fmt(sum("views"))}</td>
            <td className="px-3 py-2 text-right" title="날짜마다 따로 센 값이라 더하지 않아요">-</td>
            <td className="px-3 py-2 text-right">{fmt(sum("newVisitors"))}</td>
            <td className="px-3 py-2 text-right">{fmt(sum("searches"))}</td>
            <td className="px-3 py-2 text-right">
              {fmt(sum("appViews"))} / {fmt(sum("webViews"))}
            </td>
            <td className="px-3 py-2 text-right">{fmt(sum("otherEvents"))}</td>
          </tr>
          {rows.map((r, i) => {
            const prev = rows[i + 1];
            const open = openDate === r.date;
            return (
              <Fragment key={r.date}>
                <tr
                  onClick={() => onToggle(r.date)}
                  className={`cursor-pointer border-b border-line transition-colors hover:bg-surface-2/60 ${open ? "bg-surface-2/60" : ""}`}
                  aria-expanded={open}
                >
                  <DateCell date={r.date} open={open} today={r.date === today} />
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-12 font-bold text-gray-100">{fmt(r.views)}</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${(r.views / max) * 100}%` }} />
                      </div>
                      <Delta cur={r.views} prev={prev?.views} today={r.date === today} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-200">{fmt(r.visitors)}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{fmt(r.newVisitors)}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{fmt(r.searches)}</td>
                  <td className="px-3 py-2 text-right text-gray-400">
                    <span className="text-emerald-600 dark:text-emerald-400">{fmt(r.appViews)}</span> / {fmt(r.webViews)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">{fmt(r.otherEvents)}</td>
                </tr>
                {open && (
                  <tr className="border-b border-line">
                    <td colSpan={COLS} className="p-3">
                      {detail(r.date)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 화면별 조회수 표(날짜 × 화면 종류, 열마다 진하기 비교).
 * @param props.data — 일별 응답(화면 종류 안내)
 * @param props — TableProps
 */
function GroupTable({ data, rows, openDate, onToggle, detail, today }: TableProps & { data: DailyResponse }) {
  const groups = data.groups;
  const colMax = Object.fromEntries(groups.map((g) => [g.key, Math.max(0, ...rows.map((r) => r.byGroup[g.key] ?? 0))]));
  const colSum = Object.fromEntries(groups.map((g) => [g.key, rows.reduce((s, r) => s + (r.byGroup[g.key] ?? 0), 0)]));
  const total = rows.reduce((s, r) => s + r.views, 0);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
            <th className="sticky left-0 z-10 bg-surface-2 px-3 py-2.5 text-left">날짜</th>
            {groups.map((g) => (
              <th key={g.key} className="px-2 py-2.5 text-right">
                {g.label}
              </th>
            ))}
            <th className="px-3 py-2.5 text-right">합계</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line bg-surface-2/40 text-xs text-gray-400">
            <td className="sticky left-0 z-10 bg-surface-2 px-3 py-2 font-semibold">기간 합계</td>
            {groups.map((g) => (
              <td key={g.key} className="px-2 py-2 text-right">
                <div className="font-semibold text-gray-200">{fmt(colSum[g.key])}</div>
                <div className="text-[10px] text-gray-500">{total ? Math.round((colSum[g.key] / total) * 100) : 0}%</div>
              </td>
            ))}
            <td className="px-3 py-2 text-right font-bold text-gray-100">{fmt(total)}</td>
          </tr>
          {rows.map((r) => {
            const open = openDate === r.date;
            return (
              <Fragment key={r.date}>
                <tr
                  onClick={() => onToggle(r.date)}
                  className={`cursor-pointer border-b border-line hover:bg-surface-2/60 ${open ? "bg-surface-2/60" : ""}`}
                  aria-expanded={open}
                >
                  <DateCell date={r.date} open={open} today={r.date === today} sticky />
                  {groups.map((g) => {
                    const v = r.byGroup[g.key] ?? 0;
                    return (
                      <td key={g.key} className="px-1 py-1 text-right">
                        <span
                          className={`block rounded px-1.5 py-1 tabular-nums ${v ? "text-gray-100" : "text-gray-600"}`}
                          style={{ background: v ? `rgb(var(--primary) / ${heatAlpha(v, colMax[g.key])})` : undefined }}
                          title={`${r.date} · ${g.label} ${fmt(v)}`}
                        >
                          {fmt(v)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold text-gray-200">{fmt(r.views)}</td>
                </tr>
                {open && (
                  <tr className="border-b border-line">
                    <td colSpan={groups.length + 2} className="p-3">
                      {detail(r.date)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
