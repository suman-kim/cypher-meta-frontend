"use client";

import { useCallback, useEffect, useState } from "react";

/* ── 타입 ── */
interface Config {
  id: string;
  autoCollect: boolean;
  intervalHours: number;
  mode: string; // rotating | fixed
  rankers: number;
  perPlayer: number;
  gameType: string;
  cronWindow: number;
  maxRank: number;
  cursorOffset: number;
  updatedAt: string;
}
interface Run {
  id: string;
  trigger: string;
  source: string;
  mode: string;
  gameType: string;
  rankFrom: number;
  rankTo: number;
  offset: number;
  windowSize: number;
  perPlayer: number;
  scanned: number;
  collected: number;
  playerRows: number;
  status: string;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

const SOURCE_LABEL: Record<string, string> = {
  interval: "주기 스케줄러",
  cron: "크론",
  api: "수동 API",
  boot: "부팅",
};
const STATUS_META: Record<string, { label: string; cls: string }> = {
  success: { label: "성공", cls: "bg-win/15 text-win" },
  failed: { label: "실패", cls: "bg-lose/15 text-red-300" },
  running: { label: "진행중", cls: "bg-primary/15 text-primary" },
  skipped: { label: "건너뜀", cls: "bg-surface-3 text-gray-400" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDur(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

/* ── 소형 입력 ── */
function NumField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-400">{label}</span>
      <input
        type="number"
        className="input h-9"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>}
    </label>
  );
}

export default function CollectionManager({ token }: { token: string }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState<Config | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { "x-admin-token": token };
      const [cRes, rRes] = await Promise.all([
        fetch("/api/admin/collect/config", { headers, cache: "no-store" }),
        fetch("/api/admin/collect/runs?limit=50", { headers, cache: "no-store" }),
      ]);
      if (!cRes.ok) throw new Error(`설정 조회 실패 (${cRes.status})`);
      const cfg = (await cRes.json()) as Config;
      setConfig(cfg);
      setForm(cfg);
      setRuns(rRes.ok ? ((await rRes.json()) as Run[]) : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (k: keyof Config, v: unknown) =>
    setForm((f) => (f ? ({ ...f, [k]: v } as Config) : f));

  const dirty = form && config && JSON.stringify(form) !== JSON.stringify(config);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/collect/config", {
        method: "POST",
        headers: { "x-admin-token": token, "Content-Type": "application/json" },
        body: JSON.stringify({
          autoCollect: form.autoCollect,
          intervalHours: Number(form.intervalHours),
          mode: form.mode,
          rankers: Number(form.rankers),
          perPlayer: Number(form.perPlayer),
          gameType: form.gameType,
          cronWindow: Number(form.cronWindow),
          maxRank: Number(form.maxRank),
          cursorOffset: Number(form.cursorOffset),
        }),
      });
      if (!res.ok) throw new Error(`저장 실패 (${res.status})`);
      const cfg = (await res.json()) as Config;
      setConfig(cfg);
      setForm(cfg);
      setMsg("설정을 저장했습니다. (다음 사이클부터 반영)");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunningNow(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/collect/run", {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? `수집 실패 (${res.status})`);
      if (data?.status === "already_running") setMsg("이미 수집이 진행 중입니다.");
      else if (data?.status === "disabled") setMsg("자동 수집이 꺼져 있어 실행되지 않았습니다.");
      else
        setMsg(
          `수집 완료: ${data?.rankFrom ?? "?"}~${data?.rankTo ?? "?"}위 · 신규 ${data?.collected ?? 0}경기 · 기록 ${data?.playerRows ?? 0}건`,
        );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunningNow(false);
    }
  };

  if (loading && !config)
    return <div className="card p-8 text-center text-sm text-gray-500">불러오는 중…</div>;
  if (error && !config)
    return (
      <div className="space-y-3">
        <div className="rounded-md bg-lose/10 px-3 py-2 text-sm text-red-300">{error}</div>
        <button className="btn-ghost h-9" onClick={() => void load()}>
          다시 시도
        </button>
      </div>
    );
  if (!form || !config) return null;

  const rotating = form.mode === "rotating";
  const pct =
    config.mode === "rotating" && config.maxRank > 0
      ? Math.min(100, Math.max(0, Math.round((config.cursorOffset / config.maxRank) * 100)))
      : 0;

  return (
    <div className="space-y-5">
      {(msg || error) && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            error ? "bg-lose/10 text-red-300" : "bg-win/10 text-win"
          }`}
        >
          {error ?? msg}
        </div>
      )}

      {/* ── 진행 현황 ── */}
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-100">수집 진행 현황</h3>
          <span className="text-[11px] text-gray-500">
            설정 갱신 {fmtDate(config.updatedAt)}
          </span>
        </div>
        {config.mode === "rotating" ? (
          <>
            <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
              <span>
                레이팅 랭킹 상위 <b className="text-gray-100">{config.maxRank.toLocaleString()}</b>위 순회 ·
                1회 <b className="text-gray-100">{config.cronWindow}</b>명
              </span>
              <span>
                다음 시작 커서 <b className="text-primary">{config.cursorOffset.toLocaleString()}</b>위 (
                {pct}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-400">
            고정 모드 — 매 실행 레이팅 랭킹 상위{" "}
            <b className="text-gray-100">{config.rankers.toLocaleString()}</b>위를 수집합니다.
          </div>
        )}
      </div>

      {/* ── 설정 편집 ── */}
      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-100">수집 설정</h3>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost h-9 px-3 text-xs"
              onClick={() => setForm(config)}
              disabled={!dirty || saving}
            >
              되돌리기
            </button>
            <button className="btn-primary h-9 px-4 disabled:opacity-50" onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? "저장 중…" : "설정 저장"}
            </button>
          </div>
        </div>

        {/* 자동수집 on/off + 모드 */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[rgb(var(--primary))]"
              checked={form.autoCollect}
              onChange={(e) => patch("autoCollect", e.target.checked)}
            />
            자동 수집 사용
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">방식</span>
            <div className="inline-flex gap-1 rounded-lg border border-line bg-surface-2 p-1">
              {[
                { k: "rotating", label: "회전(순회)" },
                { k: "fixed", label: "고정(상위N)" },
              ].map((m) => (
                <button
                  key={m.k}
                  className={`segtab text-xs ${form.mode === m.k ? "segtab-active" : ""}`}
                  onClick={() => patch("mode", m.k)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 공통 필드 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumField
            label="수집 주기(시간)"
            value={form.intervalHours}
            step={0.5}
            min={0.1}
            onChange={(n) => patch("intervalHours", n)}
            hint="스케줄러 반복 간격"
          />
          <NumField
            label="플레이어당 매치"
            value={form.perPlayer}
            min={1}
            max={30}
            onChange={(n) => patch("perPlayer", n)}
            hint="1~30"
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-400">게임 타입</span>
            <select
              className="input h-9"
              value={form.gameType}
              onChange={(e) => patch("gameType", e.target.value)}
            >
              <option value="rating">공식전 (rating)</option>
              <option value="normal">일반전 (normal)</option>
            </select>
            <span className="mt-1 block text-[11px] text-gray-500">랭킹/매치 필터</span>
          </label>
        </div>

        {/* 모드별 필드 */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rotating ? (
            <>
              <NumField
                label="1회 수집 인원(window)"
                value={form.cronWindow}
                min={1}
                max={100}
                onChange={(n) => patch("cronWindow", n)}
                hint="1~100"
              />
              <NumField
                label="순회 상한 순위(maxRank)"
                value={form.maxRank}
                min={1}
                onChange={(n) => patch("maxRank", n)}
                hint="상위 몇 위까지 순회"
              />
              <NumField
                label="현재 커서(offset)"
                value={form.cursorOffset}
                min={0}
                onChange={(n) => patch("cursorOffset", n)}
                hint="0으로 두면 1위부터 재순회"
              />
            </>
          ) : (
            <NumField
              label="상위 랭커 수(rankers)"
              value={form.rankers}
              min={1}
              max={1000}
              onChange={(n) => patch("rankers", n)}
              hint="매 실행 상위 N위 · 1~1000"
            />
          )}
        </div>
      </div>

      {/* ── 지금 수집 ── */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-xs text-gray-400">
          현재 설정으로 즉시 1회 수집합니다. (수동 트리거로 이력에 기록)
        </div>
        <button
          className="btn-primary h-9 px-4 disabled:opacity-50"
          onClick={() => void runNow()}
          disabled={runningNow}
        >
          {runningNow ? "수집 중…" : "지금 수집"}
        </button>
      </div>

      {/* ── 수집 이력 ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3">
          <h3 className="text-sm font-bold text-gray-100">수집 이력</h3>
          <button className="btn-ghost h-8 px-3 text-xs" onClick={() => void load()} disabled={loading}>
            새로고침
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2/30 text-xs font-semibold text-gray-500">
                <th className="px-3 py-2.5 text-left">시작</th>
                <th className="px-3 py-2.5 text-left">트리거</th>
                <th className="px-3 py-2.5 text-left">방식</th>
                <th className="px-3 py-2.5 text-right">랭커 범위</th>
                <th className="px-3 py-2.5 text-right">스캔</th>
                <th className="px-3 py-2.5 text-right">신규</th>
                <th className="px-3 py-2.5 text-right">기록</th>
                <th className="px-3 py-2.5 text-right">소요</th>
                <th className="px-3 py-2.5 text-center">상태</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-gray-500">
                    수집 이력이 없습니다.
                  </td>
                </tr>
              )}
              {runs.map((r) => {
                const st = STATUS_META[r.status] ?? { label: r.status, cls: "bg-surface-3 text-gray-400" };
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface-2/40">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">{fmtDate(r.startedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`chip px-1.5 py-0 text-[10px] ${
                          r.trigger === "manual" ? "bg-navy/20 text-blue-300" : "bg-primary/15 text-primary"
                        }`}
                      >
                        {r.trigger === "manual" ? "수동" : "자동"}
                      </span>
                      <span className="ml-1.5 text-[11px] text-gray-500">
                        {SOURCE_LABEL[r.source] ?? r.source}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">
                      {r.mode === "rotating" ? "회전" : "고정"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-gray-300">
                      {r.rankFrom.toLocaleString()}~{r.rankTo.toLocaleString()}위
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-gray-400">
                      {r.scanned.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold text-gray-100">
                      {r.collected.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-gray-400">
                      {r.playerRows.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-gray-500">
                      {fmtDur(r.durationMs)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`chip px-1.5 py-0 text-[10px] ${st.cls}`} title={r.error ?? undefined}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
