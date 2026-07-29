"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/CharacterAvatar";
import {
  buildPersona,
  roleLabel,
  ROLE_COLORS,
  type PlayerHistorySummary,
} from "@/lib/analysis";

const C = 2 * Math.PI * 54; // 도넛 둘레(r=54)
const roleColor = (r?: string | null): string => ROLE_COLORS[(r as string) ?? "etc"] ?? ROLE_COLORS.etc;
const fmtYM = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const fmtMin = (sec?: number): string => (sec ? `${Math.round(sec / 60)}분` : "-");

type GameType = "rating" | "normal";
const TYPES: { key: GameType; label: string }[] = [
  { key: "rating", label: "공식전" },
  { key: "normal", label: "일반전" },
];

/**
 * 개인 분석 섹션 — 누적 전적(GET /meta/history/:playerId) 기반.
 * 공식전/일반전 2타입 토글. 일반전은 API가 승패·KDA를 주지 않아 픽·플레이 중심으로 표시.
 * 첫 조회 시 백엔드가 백그라운드로 백필하므로, 비어있으면 몇 초 간격으로 자동 재조회한다.
 */
export default function PlayerAnalysis({ playerId }: { playerId: string; nickname?: string | null }) {
  const [gameType, setGameType] = useState<GameType>("rating");
  const [data, setData] = useState<PlayerHistorySummary | null>(null);
  const [status, setStatus] = useState<"loading" | "empty" | "ready" | "error">("loading");
  const retries = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/meta/history/${encodeURIComponent(playerId)}?gameType=${gameType}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as PlayerHistorySummary;
      if (json?.coverage && json.coverage.total > 0) {
        setData(json);
        setStatus("ready");
      } else {
        setData(json ?? null);
        setStatus("empty");
      }
    } catch {
      setStatus("error");
    }
  }, [playerId, gameType]);

  useEffect(() => {
    setStatus("loading");
    retries.current = 0;
    load();
  }, [load]);

  // 첫 조회 백필 레이스: 비어있으면 5초 간격 자동 재시도(최대 3회)
  useEffect(() => {
    if (status !== "empty" || retries.current >= 3) return;
    const t = setTimeout(() => {
      retries.current += 1;
      load();
    }, 5000);
    return () => clearTimeout(t);
  }, [status, load]);

  const isNormal = gameType === "normal";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <h2 className="text-lg font-bold text-gray-100">개인 분석</h2>
        <span className="chip bg-surface-2 text-[11px] text-gray-500">누적 전적 기반</span>
        {/* 타입 토글 */}
        <div className="inline-flex overflow-hidden rounded-lg border border-bg-border">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setGameType(t.key)}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                gameType === t.key ? "bg-primary text-white" : "bg-surface-2 text-gray-400 hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {status === "ready" && data && (
          <span className="ml-auto text-[11px] text-gray-500">
            표본 {data.coverage.total.toLocaleString()}경기
            {data.coverage.oldest && <> · {fmtYM(data.coverage.oldest)}~{fmtYM(data.coverage.newest)}</>}
          </span>
        )}
      </div>

      {status === "loading" && (
        <div className="card p-6 text-center text-sm text-gray-500">분석 데이터를 불러오는 중…</div>
      )}

      {status === "error" && (
        <div className="card p-6 text-center text-sm text-gray-500">
          분석 데이터를 불러오지 못했어요.
          <button onClick={() => load()} className="ml-2 text-primary hover:underline">
            다시 시도
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="card flex flex-col items-center gap-2 p-6 text-center">
          <div className="text-2xl">🗂️</div>
          <div className="text-sm font-semibold text-gray-200">
            {isNormal ? "일반전" : "공식전"} 전적을 수집하고 있어요
          </div>
          <p className="max-w-md text-xs leading-relaxed text-gray-500">
            처음 조회한 플레이어라 백그라운드로 전적을 모으는 중이에요. 잠시 후 자동으로 채워집니다.
            {retries.current >= 3 && ` 계속 비어 있으면 ${isNormal ? "일반전 기록이 없을 수 있어요." : "새로고침해 주세요."}`}
          </p>
          <button
            onClick={() => {
              retries.current = 0;
              setStatus("loading");
              load();
            }}
            className="chip mt-1 bg-surface-2 text-xs text-gray-300 hover:text-gray-100"
          >
            새로고침
          </button>
        </div>
      )}

      {status === "ready" && data && <AnalysisBody data={data} isNormal={isNormal} />}
    </section>
  );
}

/** 실제 분석 본문 렌더(타입별 분기). */
function AnalysisBody({ data, isNormal }: { data: PlayerHistorySummary; isNormal: boolean }) {
  const { persona, summary, keywords } = buildPersona(data, isNormal ? "normal" : "rating");
  const totalGames = data.positions.reduce((s, p) => s + p.games, 0) || 1;
  const top = data.topCharacters[0];
  const maxCharGames = top?.games || 1;

  // 포지션 도넛 세그먼트
  let acc = 0;
  const segs = data.positions
    .filter((p) => p.games > 0)
    .map((p) => {
      const frac = p.games / totalGames;
      const len = frac * C;
      const seg = { role: p.role, dash: `${len} ${C - len}`, rot: -90 + acc * 360 };
      acc += frac;
      return seg;
    });

  return (
    <div className="space-y-4">
      {/* 페르소나 + 요약 */}
      <div className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
              {isNormal ? "일반전 플레이 요약" : "플레이스타일 요약"}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-extrabold text-white"
              style={{ background: roleColor(data.primaryRole) }}
            >
              {persona}
            </span>
          </div>
          <p className="mt-2.5 text-[15px] leading-relaxed text-gray-200">{summary}</p>
          {keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {keywords.map((k) => (
                <span key={k} className="chip bg-surface-2 text-[11px] text-gray-400">
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {isNormal ? (
          <>
            <Kpi label="총 경기" value={data.coverage.total.toLocaleString()} sub="일반전 누적" />
            <Kpi label="주 포지션" value={roleLabel(data.primaryRole)} valueColor={roleColor(data.primaryRole)} sub={`${data.positions[0]?.share ?? 0}%`} />
            <Kpi label="평균 플레이시간" value={fmtMin(data.avgPlayTime)} />
            <Kpi label="최다 캐릭터" value={top?.name ?? "-"} sub={top ? `${top.games}판` : undefined} />
          </>
        ) : (
          <>
            <Kpi label="통산 승률" value={`${data.winRate}%`} sub={`${data.wins}승 ${data.losses}패`} />
            <Kpi label="주 포지션" value={roleLabel(data.primaryRole)} valueColor={roleColor(data.primaryRole)} sub={`${data.positions[0]?.share ?? 0}%`} />
            <Kpi label="평균 KDA" value={data.avgKda.toFixed(2)} />
            <div className="card p-3.5">
              <div className="text-[11px] text-gray-500">최근 폼</div>
              <div className="mt-1.5 flex items-center gap-1">
                {(data.recentForm.length ? data.recentForm : ["-"]).slice(0, 10).map((r, i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: r === "win" ? "#10b981" : r === "lose" ? "#ef4444" : "#6b7280" }}
                  />
                ))}
              </div>
              {data.recentForm.length > 0 && (
                <div className="mt-1.5 text-[11px] font-semibold text-gray-400">
                  {data.recentForm.filter((r) => r === "win").length}승 {data.recentForm.filter((r) => r === "lose").length}패
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* 포지션 도넛 */}
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold text-gray-100">포지션 성향</h3>
          <div className="flex items-center gap-5">
            <svg width="132" height="132" viewBox="0 0 132 132" className="shrink-0">
              <circle cx="66" cy="66" r="54" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="16" />
              {segs.map((s) => (
                <circle
                  key={s.role}
                  cx="66"
                  cy="66"
                  r="54"
                  fill="none"
                  stroke={roleColor(s.role)}
                  strokeWidth="16"
                  strokeDasharray={s.dash}
                  transform={`rotate(${s.rot} 66 66)`}
                />
              ))}
              <text x="66" y="61" textAnchor="middle" fontSize="11" fontWeight="700" fill="#94a3b8">
                주 포지션
              </text>
              <text x="66" y="80" textAnchor="middle" fontSize="14" fontWeight="800" fill={roleColor(data.primaryRole)}>
                {roleLabel(data.primaryRole)}
              </text>
            </svg>
            <div className="flex-1 space-y-2">
              {data.positions.filter((p) => p.games > 0).map((p) => (
                <div key={p.role} className="flex items-center gap-2 text-[13px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded" style={{ background: roleColor(p.role) }} />
                  <span className="font-semibold text-gray-200">{roleLabel(p.role)}</span>
                  <span className="text-[11px] text-gray-500">{p.games}판</span>
                  <span className="ml-auto font-extrabold text-gray-100">{p.share}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 주력 캐릭터 */}
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold text-gray-100">주력 캐릭터</h3>
          <div className="divide-y divide-bg-border">
            {data.topCharacters.slice(0, 6).map((c) => {
              const barW = isNormal ? Math.round((c.games / maxCharGames) * 100) : Math.min(100, c.winRate);
              return (
                <div key={c.name} className="flex items-center gap-3 py-2">
                  <span
                    className="inline-flex shrink-0 overflow-hidden rounded-lg border-2"
                    style={{ borderColor: roleColor(c.role) }}
                  >
                    <Avatar characterId={c.characterId} characterName={c.name} size={36} zoom={1} rounded={false} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-bold text-gray-100">{c.name}</span>
                      <span className="chip bg-surface-2 px-1.5 py-0 text-[10px] text-gray-500">{roleLabel(c.role)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-hover">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${barW}%`, background: roleColor(c.role) }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {isNormal ? (
                      <>
                        <div className="text-[13px] font-extrabold text-gray-100">{c.games}판</div>
                        <div className="text-[10px] text-gray-500">픽 수</div>
                      </>
                    ) : (
                      <>
                        <div className="text-[13px] font-extrabold" style={{ color: c.winRate >= 50 ? "#10b981" : "#ef4444" }}>
                          {c.winRate}%
                        </div>
                        <div className="text-[10px] text-gray-500">{c.games}전 {c.wins}승</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 연도별 변화 */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-100">연도별 플레이스타일 변화</h3>
          {data.byYear.length < 2 && (
            <span className="chip bg-surface-2 text-[11px] text-gray-500">시즌이 쌓일수록 풍부해져요</span>
          )}
        </div>
        {data.byYear.length === 0 ? (
          <p className="text-xs text-gray-500">연도별로 표시할 데이터가 아직 없어요.</p>
        ) : (
          <div className="space-y-0">
            {data.byYear.map((y, i) => (
              <div key={y.year} className="flex gap-4 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold text-white"
                    style={{ background: roleColor(y.topRole) }}
                  >
                    {y.year}
                  </div>
                  {i < data.byYear.length - 1 && <div className="mt-1 w-0.5 flex-1 bg-bg-border" />}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-gray-100">{roleLabel(y.topRole)} 중심</span>
                    {!isNormal && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold"
                        style={{ color: y.winRate >= 50 ? "#10b981" : "#ef4444", background: "rgba(148,163,184,0.12)" }}
                      >
                        승률 {y.winRate}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[12.5px] text-gray-400">
                    대표 캐릭터 <b className="font-bold text-gray-200">{y.topCharacter ?? "-"}</b> · <b className="font-bold text-gray-200">{y.games}</b>경기
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** KPI 타일. */
function Kpi({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="card p-3.5">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="mt-1 truncate text-xl font-extrabold text-gray-100" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-gray-500">{sub}</div>}
    </div>
  );
}
