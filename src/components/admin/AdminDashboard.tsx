"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import BoardManager from "./BoardManager";
import NoticeManager from "./NoticeManager";
import CollectionManager from "./CollectionManager";
import CostumeManager from "./CostumeManager";
import UpdateManager from "./UpdateManager";

/* ── 타입 ── */
interface Stats {
  range: { days: number };
  totals: { views: number; visitors: number; todayViews: number; todayVisitors: number };
  byDay: { date: string; views: number; uniques: number }[];
  topPages: { path: string; views: number }[];
  topSearches: { query: string; count: number }[];
  topReferrers: { referrer: string; views: number }[];
  byCountry: { country: string; views: number }[];
  byDevice: { device: string; views: number }[];
  byBrowser: { browser: string; views: number }[];
  byHour: { hour: number; views: number; uniques: number }[];
  events: { event: string; count: number }[];
  byOs: { os: string; views: number }[];
}
interface RecentVisit {
  createdAt: string;
  event: string;
  path: string;
  query: string | null;
  referrer: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  ip: string | null;
}

const TOKEN_KEY = "cy_admin_token";
const DAY_OPTIONS = [7, 30, 90];

function fmt(n: number | undefined): string {
  return (n ?? 0).toLocaleString("ko-KR");
}

/** 2-letter ISO 국가코드 → 국기 이모지 */
function flag(cc: string): string {
  const c = (cc || "").toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "🌐";
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/* ── 소형 컴포넌트 ── */
function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-gray-50">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

/** 일자별 방문 추이 — 조회수(영역) + 방문자(라인) 콤보 */
function TrendChart({ data }: { data: Stats["byDay"] }) {
  if (data.length === 0)
    return <div className="card p-8 text-center text-sm text-gray-500">데이터가 없습니다.</div>;
  const max = Math.max(1, ...data.map((d) => d.views));
  const n = data.length;
  const X = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const Y = (v: number) => 6 + (1 - v / max) * 82;
  const viewsPts = data.map((d, i) => `${X(i).toFixed(2)},${Y(d.views).toFixed(2)}`).join(" ");
  const uniqPts = data.map((d, i) => `${X(i).toFixed(2)},${Y(d.uniques).toFixed(2)}`).join(" ");
  const step = n > 1 ? 100 / (n - 1) : 100;
  const totalViews = data.reduce((s, d) => s + d.views, 0);
  const totalUniq = data.reduce((s, d) => s + d.uniques, 0);
  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="h-2 w-2 rounded-full" style={{ background: "rgb(var(--primary))" }} />
            조회수 <b className="text-gray-100">{fmt(totalViews)}</b>
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="h-2 w-2 rounded-full" style={{ background: "#34d399" }} />
            방문자 <b className="text-gray-100">{fmt(totalUniq)}</b>
          </span>
        </div>
        <span className="text-[11px] text-gray-500">최고 {fmt(max)} / 일</span>
      </div>
      <svg viewBox="0 0 100 96" preserveAspectRatio="none" className="h-44 w-full">
        <defs>
          <linearGradient id="cyViewsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1="0"
            y1={6 + g * 82}
            x2="100"
            y2={6 + g * 82}
            stroke="rgb(var(--surface-3))"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <polygon points={`0,92 ${viewsPts} 100,92`} fill="url(#cyViewsArea)" />
        <polyline
          points={viewsPts}
          fill="none"
          stroke="rgb(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={uniqPts}
          fill="none"
          stroke="#34d399"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => (
          <rect key={i} x={Math.max(0, X(i) - step / 2)} y="0" width={step} height="96" fill="transparent">
            <title>{`${d.date} · 조회 ${fmt(d.views)} · 방문자 ${fmt(d.uniques)}`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-gray-500">
        <span>{data[0]?.date.slice(5)}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.date.slice(5)}</span>}
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

/** 시간대별 방문(KST) — 24시간 막대, 피크 시간 강조 */
function HourChart({ data }: { data: Stats["byHour"] }) {
  const map = new Map(data.map((d) => [d.hour, d]));
  const hours = Array.from({ length: 24 }, (_, h) => map.get(h) ?? { hour: h, views: 0, uniques: 0 });
  const max = Math.max(1, ...hours.map((h) => h.views));
  const hasData = hours.some((h) => h.views > 0);
  const peak = hours.reduce((a, b) => (b.views > a.views ? b : a), hours[0]);
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-100">
          시간대별 방문 <span className="text-[11px] font-normal text-gray-500">KST</span>
        </h3>
        {hasData && (
          <span className="text-[11px] text-gray-500">
            피크 <b className="text-primary">{peak.hour}시</b> · {fmt(peak.views)}
          </span>
        )}
      </div>
      <div className="flex h-28 items-end gap-[3px]">
        {hours.map((h) => (
          <div
            key={h.hour}
            className="flex h-full flex-1 items-end"
            title={`${h.hour}시 · 조회 ${fmt(h.views)} · 방문자 ${fmt(h.uniques)}`}
          >
            <div
              className="w-full rounded-t transition-colors"
              style={{
                height: `${Math.max((h.views / max) * 100, h.views > 0 ? 3 : 0)}%`,
                background: hasData && h.hour === peak.hour ? "#34d399" : "rgb(var(--primary) / 0.6)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-gray-500">
        <span>0시</span>
        <span>6시</span>
        <span>12시</span>
        <span>18시</span>
        <span>23시</span>
      </div>
    </div>
  );
}

const DONUT_COLORS = ["rgb(var(--primary))", "#34d399", "#e3b23c", "#a78bfa", "#f472b6"];
/** 비중 도넛(디바이스 등) */
function Donut({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  const filtered = items.filter((i) => i.value > 0).slice(0, 5);
  const total = filtered.reduce((s, i) => s + i.value, 0) || 1;
  let acc = 0;
  return (
    <div className="card p-4">
      <h3 className="text-sm font-bold text-gray-100">{title}</h3>
      {filtered.length === 0 ? (
        <p className="mt-6 text-center text-xs text-gray-500">데이터 없음</p>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <svg viewBox="0 0 42 42" className="h-24 w-24 shrink-0 -rotate-90">
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgb(var(--surface-3))" strokeWidth="6" />
            {filtered.map((it, i) => {
              const seg = (it.value / total) * 100;
              const el = (
                <circle
                  key={i}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                  strokeWidth="6"
                  strokeDasharray={`${seg.toFixed(2)} ${(100 - seg).toFixed(2)}`}
                  strokeDashoffset={(-acc).toFixed(2)}
                />
              );
              acc += seg;
              return el;
            })}
          </svg>
          <ul className="min-w-0 flex-1 space-y-1.5">
            {filtered.map((it, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-gray-300" title={it.label}>
                  {it.label}
                </span>
                <span className="shrink-0 font-semibold text-gray-400">
                  {Math.round((it.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 파생 인사이트 타일 */
function Insights({ stats, days }: { stats: Stats; days: number }) {
  const t = stats.totals;
  const perVisitor = (t.views / Math.max(1, t.visitors)).toFixed(1);
  const avgDaily = Math.round(
    stats.byDay.reduce((s, d) => s + d.uniques, 0) / Math.max(1, stats.byDay.length),
  );
  const events = stats.events ?? [];
  const evTotal = events.reduce((s, e) => s + e.count, 0) || 1;
  const search = events.find((e) => e.event === "search")?.count ?? 0;
  const peak = stats.byDay.reduce<Stats["byDay"][number] | null>(
    (a, b) => (b.uniques > (a?.uniques ?? -1) ? b : a),
    null,
  );
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label="방문자당 조회수" value={perVisitor} sub="페이지뷰 / 순방문자" />
      <StatTile label="일 평균 방문자" value={fmt(avgDaily)} sub={`최근 ${days}일 평균`} />
      <StatTile
        label="검색 이벤트"
        value={fmt(search)}
        sub={`전체 이벤트의 ${Math.round((search / evTotal) * 100)}%`}
      />
      <StatTile
        label="최고 방문일"
        value={peak ? fmt(peak.uniques) : "-"}
        sub={peak ? `${peak.date.slice(5)} 방문자` : ""}
      />
    </div>
  );
}

function BarList({
  title,
  items,
  empty = "데이터 없음",
}: {
  title: string;
  items: { label: string; value: number }[];
  empty?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="card p-4">
      <h3 className="text-sm font-bold text-gray-100">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-xs text-gray-500">{empty}</li>}
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className="relative">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-gray-200" title={it.label}>
                {it.label}
              </span>
              <span className="shrink-0 font-semibold text-gray-400">{fmt(it.value)}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${(it.value / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── 메인 ── */
export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<
    "analytics" | "board" | "notice" | "update" | "collect" | "costume"
  >("analytics");

  const load = useCallback(async (tk: string, d: number) => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, rRes] = await Promise.all([
        fetch(`/api/admin/stats?days=${d}`, { headers: { "x-admin-token": tk } }),
        fetch(`/api/admin/recent?limit=50`, { headers: { "x-admin-token": tk } }),
      ]);
      // 401 이면 백엔드(AdminGuard)의 실제 사유를 그대로 노출한다.
      //  · "서버에 ADMIN_TOKEN 이 설정되지 않았습니다." → 백엔드에 ADMIN_TOKEN 환경변수 미설정
      //  · "관리자 인증에 실패했습니다."               → 토큰 값 불일치(공백/오타 등)
      const authFail = sRes.status === 401 ? sRes : rRes.status === 401 ? rRes : null;
      if (authFail) {
        const body = (await authFail.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "관리자 인증에 실패했습니다. 토큰을 확인하세요.");
      }
      if (!sRes.ok) throw new Error(`통계 조회 실패 (${sRes.status})`);
      setStats(await sRes.json());
      setRecent(rRes.ok ? await rRes.json() : []);
    } catch (e) {
      setError((e as Error).message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 최초 로드: 저장된 토큰 있으면 자동 조회
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (saved) {
      setToken(saved);
      load(saved, days);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onLogin(e: FormEvent) {
    e.preventDefault();
    const tk = input.trim();
    if (!tk) return;
    window.localStorage.setItem(TOKEN_KEY, tk);
    setToken(tk);
    load(tk, days);
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setStats(null);
    setRecent([]);
    setInput("");
  }

  function changeDays(d: number) {
    setDays(d);
    if (token) load(token, d);
  }

  /* 로그인 게이트 */
  if (!token || (!stats && error)) {
    return (
      <div className="mx-auto max-w-sm">
        <div className="card space-y-4 p-6">
          <div>
            <h1 className="text-xl font-black text-gray-50">관리자 로그인</h1>
            <p className="mt-1 text-sm text-gray-500">관리자 토큰을 입력하세요.</p>
          </div>
          <form onSubmit={onLogin} className="space-y-3">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ADMIN_TOKEN"
              className="input"
              autoFocus
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              접속
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-gray-50">관리자 대시보드</h1>
        <div className="flex items-center gap-2">
          {view === "analytics" && (
            <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => changeDays(d)}
                  className={`segtab ${days === d ? "segtab-active" : ""}`}
                >
                  {d}일
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={logout} className="btn-ghost">
            로그아웃
          </button>
        </div>
      </div>

      {/* 뷰 전환 탭 */}
      <div className="flex w-fit items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
        {([
          ["analytics", "분석"],
          ["board", "게시판"],
          ["notice", "공지사항"],
          ["update", "업데이트"],
          ["collect", "수집 관리"],
          ["costume", "코스튬"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`segtab ${view === key ? "segtab-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "analytics" && (loading && !stats ? (
        <div className="card p-10 text-center text-sm text-gray-500">불러오는 중…</div>
      ) : stats ? (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={`총 조회수 (${days}일)`} value={fmt(stats.totals.views)} />
            <StatTile label={`순 방문자 (${days}일)`} value={fmt(stats.totals.visitors)} />
            <StatTile label="오늘 조회수" value={fmt(stats.totals.todayViews)} />
            <StatTile label="오늘 방문자" value={fmt(stats.totals.todayVisitors)} />
          </div>

          <Insights stats={stats} days={days} />

          {/* 일자별 방문 추이 (조회수 + 방문자) */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-400">일자별 방문 추이</h2>
            <TrendChart data={stats.byDay} />
          </section>

          {/* 시간대별 방문 + 디바이스 비중 */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <HourChart data={stats.byHour ?? []} />
            <Donut
              title="디바이스 비중"
              items={stats.byDevice.map((d) => ({ label: d.device, value: d.views }))}
            />
          </div>

          {/* 리스트 그리드 */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <BarList
              title="인기 페이지"
              items={stats.topPages.map((p) => ({ label: p.path, value: p.views }))}
            />
            <BarList
              title="인기 검색어"
              items={stats.topSearches.map((s) => ({ label: s.query, value: s.count }))}
              empty="검색 기록 없음"
            />
            <BarList
              title="유입 경로 (referrer)"
              items={stats.topReferrers.map((r) => ({ label: r.referrer, value: r.views }))}
              empty="외부 유입 없음"
            />
            <BarList
              title="국가"
              items={stats.byCountry.map((c) => ({
                label: `${flag(c.country)} ${c.country}`,
                value: c.views,
              }))}
            />
            <BarList
              title="브라우저"
              items={stats.byBrowser.map((b) => ({ label: b.browser, value: b.views }))}
            />
            <BarList
              title="OS"
              items={(stats.byOs ?? []).map((o) => ({ label: o.os, value: o.views }))}
            />
          </div>

          {/* 최근 방문 */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-400">최근 방문 {recent.length}건</h2>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
                    <th className="px-3 py-2.5 text-left">시각</th>
                    <th className="px-3 py-2.5 text-left">이벤트</th>
                    <th className="px-3 py-2.5 text-left">경로</th>
                    <th className="px-3 py-2.5 text-left">지역</th>
                    <th className="px-3 py-2.5 text-left">기기/브라우저</th>
                    <th className="px-3 py-2.5 text-left">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                        방문 기록이 없습니다.
                      </td>
                    </tr>
                  )}
                  {recent.map((v, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-400" title={v.createdAt}>
                        {timeAgo(v.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`chip ${
                            v.event === "search"
                              ? "bg-primary/10 text-primary"
                              : "bg-surface-3 text-gray-500"
                          }`}
                        >
                          {v.event === "search" ? `검색: ${v.query ?? ""}` : "조회"}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-gray-200" title={v.path}>
                        {v.path}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-400">
                        {v.country ? `${flag(v.country)} ${v.city || v.country}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-400">
                        {[v.device, v.browser].filter(Boolean).join(" · ") || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">{v.ip || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null)}

      {view === "board" && <BoardManager token={token} />}
      {view === "notice" && <NoticeManager token={token} />}
      {view === "update" && <UpdateManager token={token} />}
      {view === "collect" && <CollectionManager token={token} />}
      {view === "costume" && <CostumeManager token={token} />}
    </div>
  );
}
