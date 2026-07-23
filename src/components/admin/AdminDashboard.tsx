"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

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

function DayBars({ data }: { data: Stats["byDay"] }) {
  if (data.length === 0)
    return <div className="card p-8 text-center text-sm text-gray-500">데이터가 없습니다.</div>;
  const max = Math.max(1, ...data.map((d) => d.views));
  return (
    <div className="card p-4">
      <div className="flex h-40 items-end gap-1">
        {data.map((d) => (
          <div
            key={d.date}
            className="group relative flex h-full flex-1 items-end"
            title={`${d.date} · 조회 ${d.views} · 방문자 ${d.uniques}`}
          >
            <div
              className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
              style={{ height: `${(d.views / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-gray-500">
        <span>{data[0]?.date.slice(5)}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.date.slice(5)}</span>}
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
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

  const load = useCallback(async (tk: string, d: number) => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, rRes] = await Promise.all([
        fetch(`/api/admin/stats?days=${d}`, { headers: { "x-admin-token": tk } }),
        fetch(`/api/admin/recent?limit=50`, { headers: { "x-admin-token": tk } }),
      ]);
      if (sRes.status === 401 || rRes.status === 401) {
        throw new Error("관리자 인증에 실패했습니다. 토큰을 확인하세요.");
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
          <button type="button" onClick={logout} className="btn-ghost">
            로그아웃
          </button>
        </div>
      </div>

      {loading && !stats ? (
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

          {/* 일자별 방문 */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-400">일자별 방문 추이</h2>
            <DayBars data={stats.byDay} />
          </section>

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
              title="기기"
              items={stats.byDevice.map((d) => ({ label: d.device, value: d.views }))}
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
      ) : null}
    </div>
  );
}
