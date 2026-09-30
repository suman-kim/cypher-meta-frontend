"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/CharacterAvatar";
import {
  buildPersona,
  roleLabel,
  roleColorOf,
  toOfficialView,
  UNKNOWN_OFFICIAL_ROLE,
  type PlayerHistorySummary,
} from "@/lib/analysis";
import type { PositionSystem } from "@/lib/official";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";

const C = 2 * Math.PI * 54; // 도넛 둘레(r=54)
// 기존 포지션 코드·공식 역할군명 모두 색을 돌려준다
const roleColor = roleColorOf;
const fmtYM = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const fmtMin = (sec?: number): string => (sec ? `${Math.round(sec / 60)}분` : "-");

/** 개인 분석 기준 — 플레이어 화면의 게임 타입 탭(전체/공식전/일반전)과 같다 */
export type AnalysisGameType = "all" | "rating" | "normal";

/** 개인 분석 섹션 접힘 상태를 기억하는 localStorage 키(방문자별 편의 설정) */
const HIDDEN_KEY = "cy_player_analysis_hidden";

/**
 * 개인 분석 섹션 — 누적 전적(GET /meta/history/:playerId) 기반.
 * 기준(전체/공식전/일반전)은 페이지 상단 게임 타입 탭을 따른다(자체 토글 없음).
 * 일반전은 API가 승패·KDA를 주지 않아 픽·플레이 중심으로 표시하고, 전체는 승률·KDA 를 공식전 판으로만 계산한다.
 * 첫 조회 시 백엔드가 백그라운드로 백필하므로, 비어있으면 몇 초 간격으로 자동 재조회한다.
 * 포지션 체계가 official 이면 공식 역할군 필드로 같은 화면을 그린다(toOfficialView) — legacy 면 기존 그대로.
 * 제목 줄의 접기/펼치기로 섹션을 숨길 수 있고, 선택은 브라우저(localStorage)에 기억한다. 접혀 있으면 API 도 부르지 않는다.
 * @param playerId — 대상 플레이어 ID
 * @param positionSystem — 포지션 체계(서버 페이지가 전달, 기본 legacy)
 * @param gameType — 분석 기준(페이지 탭 값: all | rating | normal)
 */
export default function PlayerAnalysis({
  playerId,
  positionSystem = "legacy",
  gameType,
}: {
  playerId: string;
  nickname?: string | null;
  positionSystem?: PositionSystem;
  gameType: AnalysisGameType;
}) {
  const official = positionSystem === "official";
  // 섹션 접기/펼치기 — 기본은 펼침, 선택은 브라우저에 기억한다(저장소를 못 쓰면 매번 펼침)
  const [hidden, setHidden] = useState(false);
  // 저장된 설정을 읽기 전에는 불러오지 않는다(접어 둔 경우 새로고침 직후 불필요한 호출 방지)
  const [prefReady, setPrefReady] = useState(false);
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(HIDDEN_KEY) === "1");
    } catch {
      /* 저장소 사용 불가(프라이빗 모드 등) — 기본값 유지 */
    }
    setPrefReady(true);
  }, []);
  /** 접기/펼치기 전환 후 선택을 저장한다 */
  const toggleHidden = () =>
    setHidden((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(HIDDEN_KEY, next ? "1" : "0");
      } catch {
        /* 저장 실패는 무시 — 이번 방문에는 그대로 동작 */
      }
      return next;
    });
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

  // 접혀 있으면 불러오지 않는다(펼칠 때 처음 불러옴)
  useEffect(() => {
    if (!prefReady || hidden) return;
    setStatus("loading");
    retries.current = 0;
    load();
  }, [load, hidden, prefReady]);

  // 첫 조회 백필 레이스: 비어있으면 5초 간격 자동 재시도(최대 3회)
  useEffect(() => {
    if (hidden || status !== "empty" || retries.current >= 3) return;
    const t = setTimeout(() => {
      retries.current += 1;
      load();
    }, 5000);
    return () => clearTimeout(t);
  }, [status, load, hidden]);

  const isNormal = gameType === "normal";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <h2 className="text-lg font-bold text-gray-100">개인 분석</h2>
        <span className="chip bg-surface-2 text-[11px] text-gray-500">누적 전적 기반</span>
        {/* 현재 기준(상단 탭 값) 표시 */}
        <span className="chip bg-primary/10 text-[11px] font-semibold text-primary">
          {gameType === "all" ? "전체" : gameType === "rating" ? "공식전" : "일반전"}
        </span>
        {/* 표본 경기·기간 — 모바일은 버튼 아래 둘째 줄(전체 폭)로 내려 접기 버튼이 밀리지 않게, sm 이상은 한 줄 */}
        {!hidden && status === "ready" && data && (
          <span className="order-last w-full text-[11px] text-gray-500 sm:order-none sm:w-auto">
            표본 {data.coverage.total.toLocaleString()}경기
            {data.coverage.oldest && <> · {fmtYM(data.coverage.oldest)}~{fmtYM(data.coverage.newest)}</>}
          </span>
        )}
        {/* 보이기/숨기기 */}
        <button
          type="button"
          onClick={toggleHidden}
          aria-expanded={!hidden}
          aria-controls="player-analysis-body"
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-semibold text-gray-400 transition-colors hover:text-gray-100"
        >
          {hidden ? "펼치기" : "접기"}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${hidden ? "" : "rotate-180"}`}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {hidden ? (
        <p className="px-1 text-xs text-gray-500">개인 분석을 접어 두었어요. 펼치기를 누르면 다시 볼 수 있어요.</p>
      ) : (
        <div id="player-analysis-body" className="space-y-3">

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
            {gameType === "all" ? "" : isNormal ? "일반전 " : "공식전 "}전적을 수집하고 있어요
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

      {status === "ready" && data && (
        <AnalysisBody
          data={official ? toOfficialView(data) : data}
          isNormal={isNormal}
          isAll={gameType === "all"}
          official={official}
        />
      )}
        </div>
      )}
    </section>
  );
}

/**
 * 실제 분석 본문 렌더(타입별 분기).
 * @param data — 화면용 요약(official 이면 toOfficialView 결과)
 * @param isNormal — 일반전 여부
 * @param isAll — '전체' 기준 여부(주력 캐릭터에 합산 판 수와 공식전 전적을 나눠 표시)
 * @param official — 공식 역할군 체계 여부(라벨을 "포지션"→"역할군"으로, 궁극기 판별 진행 안내 표시)
 */
function AnalysisBody({
  data,
  isNormal,
  isAll,
  official,
}: {
  data: PlayerHistorySummary;
  isNormal: boolean;
  isAll: boolean;
  official: boolean;
}) {
  const term = official ? "역할군" : "포지션";
  const pending = official ? (data.coverage.ultimatePending ?? 0) : 0;
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
            <Kpi label={`주 ${term}`} value={roleLabel(data.primaryRole)} valueColor={roleColor(data.primaryRole)} sub={`${data.positions[0]?.share ?? 0}%`} />
            <Kpi label="평균 플레이시간" value={fmtMin(data.avgPlayTime)} />
            <Kpi label="최다 캐릭터" value={top?.name ?? "-"} sub={top ? `${top.games}판` : undefined} />
          </>
        ) : (
          <>
            <Kpi label="통산 승률" value={`${data.winRate}%`} sub={`${data.wins}승 ${data.losses}패`} />
            <Kpi label={`주 ${term}`} value={roleLabel(data.primaryRole)} valueColor={roleColor(data.primaryRole)} sub={`${data.positions[0]?.share ?? 0}%`} />
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
          <h3 className="mb-3 text-sm font-bold text-gray-100">{term} 성향</h3>
          {pending > 0 && (
            <p className="-mt-2 mb-2 text-[11px] text-gray-500">
              궁극기(1차/2차) 판별 중인 경기 {pending.toLocaleString()}건 — 판별되면 역할군이 확정됩니다.
            </p>
          )}
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
                주 {term}
              </text>
              <text x="66" y="80" textAnchor="middle" fontSize="14" fontWeight="800" fill={roleColor(data.primaryRole)}>
                {roleLabel(data.primaryRole)}
              </text>
            </svg>
            <div className="flex-1 space-y-2">
              {data.positions.filter((p) => p.games > 0).map((p) => (
                <div key={p.role} className="flex items-center gap-2 text-[13px]">
                  {/* 공식 역할군이면 공식 아이콘(도넛 색은 역할군 색 유지), 기존 포지션·미확정은 색 사각형 */}
                  {official && p.role !== UNKNOWN_OFFICIAL_ROLE ? (
                    <OfficialRoleIcon role={p.role} size={16} />
                  ) : (
                    <span className="h-2.5 w-2.5 shrink-0 rounded" style={{ background: roleColor(p.role) }} />
                  )}
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
                        <div className="text-[10px] text-gray-500">
                          {/* 전체: 합산 판 수와 승률 분모(공식전)가 달라 나눠 표시 */}
                          {isAll && c.decided != null && c.decided !== c.games
                            ? `${c.games}판 · 공식 ${c.decided}전 ${c.wins}승`
                            : `${c.games}전 ${c.wins}승`}
                        </div>
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
