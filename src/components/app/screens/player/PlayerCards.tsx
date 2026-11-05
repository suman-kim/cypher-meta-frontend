"use client";

/**
 * 앱 플레이어 화면의 접히는 분석 카드 두 장.
 *
 * - PlayerAnalysisCard: 개인 분석(누적 전적) — 웹 PlayerAnalysis 와 같은 API(GET /api/meta/history/:id?gameType=)를
 *   앱 카드 모양으로 다시 그린다. 처음 조회한 플레이어는 백엔드가 전적을 모으는 중이라 비어 있을 수 있어
 *   5초 간격으로 3번까지 다시 불러온다. 접어 두면 부르지 않고, 접힘 상태는 웹과 같은 키로 기기에 기억한다.
 * - AiSummaryCard: AI 전적 분석 — 서버가 만든 RecentSummary(lib/profile buildRecentSummary)를 그린다.
 *   접힌 상태에서도 첫 문단 두 줄을 미리 보여 준다.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";
import { buildPersona, roleColorOf, roleLabel, toOfficialView, UNKNOWN_OFFICIAL_ROLE, type PlayerHistorySummary } from "@/lib/analysis";
import type { PositionSystem } from "@/lib/official";
import type { RecentInsight, RecentSummary } from "@/lib/profile";
import { Icon, type IconName } from "../../icons";
import { CharImg, Skel, WinLossStrip, wrClass, type WL } from "../../ui";
import { stripEmoji, streakText, type NormalPlaySummary } from "./player-data";
import { SubLabel } from "./parts";

/** 개인 분석 기준 — 플레이어 화면의 보기 기준과 같다 */
export type AnalysisBasis = "all" | "rating" | "normal";

/** 접힘 상태를 기억하는 기기 저장 키 (웹 PlayerAnalysis 와 같은 키) */
const HIDDEN_KEY = "cy_player_analysis_hidden";
/** 비어 있을 때 다시 불러오는 최대 횟수와 간격 */
const MAX_RETRY = 3;
const RETRY_MS = 5000;

/**
 * 접히는 카드의 머리 줄.
 * @param title 카드 제목
 * @param open 펼침 여부
 * @param onToggle 누를 때
 * @param lead 제목 앞 아이콘 (선택)
 * @param chip 제목 옆 작은 칩 글자 (선택)
 * @param controls 펼쳐지는 영역의 id
 */
function CardHead({
  title,
  open,
  onToggle,
  lead,
  chip,
  controls,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  lead?: IconName;
  chip?: string;
  controls: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
    >
      {lead && (
        <span className="text-primary">
          <Icon name={lead} size={18} />
        </span>
      )}
      <span className="text-[17px] font-extrabold tracking-[-0.02em] text-gray-100">{title}</span>
      {chip && (
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-gray-500">{chip}</span>
      )}
      <span className={`ml-auto text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
        <Icon name="chevronDown" size={18} />
      </span>
    </button>
  );
}

/* ── 개인 분석 ─────────────────────────────────── */

/**
 * 개인 분석 카드.
 * @param playerId 플레이어 ID
 * @param basis 보기 기준(all | rating | normal)
 * @param positionSystem 포지션 체계 — official 이면 공식 역할군으로 그린다
 * @param normalPlay 최근 일반전 요약 (공식전·전체 보기에서 아래에 덧붙임, 없으면 null)
 * @param normalHref 일반전 보기 주소
 */
export function PlayerAnalysisCard({
  playerId,
  basis,
  positionSystem,
  normalPlay,
  normalHref,
}: {
  playerId: string;
  basis: AnalysisBasis;
  positionSystem: PositionSystem;
  normalPlay: NormalPlaySummary | null;
  normalHref: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [prefReady, setPrefReady] = useState(false);
  const [data, setData] = useState<PlayerHistorySummary | null>(null);
  const [status, setStatus] = useState<"loading" | "empty" | "ready" | "error">("loading");
  const retries = useRef(0);

  // 기기에 기억한 접힘 상태를 읽는다 (읽기 전에는 부르지 않음)
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(HIDDEN_KEY) === "1");
    } catch {
      /* 저장소를 못 쓰면 펼친 채로 */
    }
    setPrefReady(true);
  }, []);

  /** 접기·펼치기 후 기억 */
  const toggle = () =>
    setHidden((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(HIDDEN_KEY, next ? "1" : "0");
      } catch {
        /* 무시 */
      }
      return next;
    });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/meta/history/${encodeURIComponent(playerId)}?gameType=${basis}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as PlayerHistorySummary;
      setData(json ?? null);
      setStatus(json?.coverage && json.coverage.total > 0 ? "ready" : "empty");
    } catch {
      setStatus("error");
    }
  }, [playerId, basis]);

  useEffect(() => {
    if (!prefReady || hidden) return;
    setStatus("loading");
    retries.current = 0;
    void load();
  }, [load, hidden, prefReady]);

  // 처음 조회한 플레이어 — 백엔드가 모으는 동안 몇 번 더 불러 본다
  useEffect(() => {
    if (hidden || status !== "empty" || retries.current >= MAX_RETRY) return;
    const t = setTimeout(() => {
      retries.current += 1;
      void load();
    }, RETRY_MS);
    return () => clearTimeout(t);
  }, [status, load, hidden]);

  const official = positionSystem === "official";
  const view = data && status === "ready" ? (official ? toOfficialView(data) : data) : null;

  return (
    <section className="a-card overflow-hidden">
      <CardHead title="개인 분석" open={!hidden} onToggle={toggle} chip="누적 전적" controls="app-player-analysis" />
      {hidden ? (
        <p className="px-4 pb-4 text-xs text-gray-500">접어 두었어요. 펼치면 누적 전적으로 만든 분석을 볼 수 있어요.</p>
      ) : (
        <div id="app-player-analysis" className="px-4 pb-4">
          {status === "loading" && (
            <div className="grid gap-3">
              <Skel className="h-14 rounded-2xl" />
              <Skel className="h-6 rounded-lg" />
              <div className="grid grid-cols-3 gap-2">
                <Skel className="h-14 rounded-xl" />
                <Skel className="h-14 rounded-xl" />
                <Skel className="h-14 rounded-xl" />
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="grid justify-items-center gap-2.5 rounded-2xl bg-bg px-4 py-5 text-center">
              <span className="text-app-loss-tx">
                <Icon name="alert" size={22} />
              </span>
              <p className="text-[13px] font-semibold text-gray-200">개인 분석을 불러오지 못했어요</p>
              <button
                type="button"
                onClick={() => {
                  setStatus("loading");
                  void load();
                }}
                className="a-press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
              >
                <Icon name="refresh" size={15} />
                다시 시도
              </button>
            </div>
          )}

          {status === "empty" && (
            <div className="grid gap-2.5 rounded-2xl bg-app-ac-soft px-3.5 py-3 text-app-ac-tx">
              <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                <span className={`mt-0.5 ${retries.current < MAX_RETRY ? "animate-spin" : ""}`}>
                  <Icon name="refresh" size={16} />
                </span>
                <span>
                  {retries.current < MAX_RETRY
                    ? `처음 조회한 플레이어라 ${basis === "normal" ? "일반전 " : basis === "rating" ? "공식전 " : ""}전적을 모으는 중이에요. 잠시 뒤 자동으로 채워져요.`
                    : basis === "normal"
                      ? "아직 모인 일반전 기록이 없어요. 일반전을 하지 않았거나 수집이 늦어지고 있어요."
                      : "아직 모인 전적이 없어요. 조금 뒤 다시 불러와 주세요."}
                </span>
              </div>
              {retries.current >= MAX_RETRY && (
                <button
                  type="button"
                  onClick={() => {
                    retries.current = 0;
                    setStatus("loading");
                    void load();
                  }}
                  className="a-press justify-self-start rounded-full bg-surface px-3.5 py-1.5 text-xs font-bold text-gray-200"
                >
                  다시 불러오기
                </button>
              )}
            </div>
          )}

          {view && <AnalysisBody d={view} basis={basis} official={official} />}

          {/* 일반전 플레이 요약 — 공식전·전체 보기에서만 (일반전 보기는 위 분석이 곧 일반전) */}
          {basis !== "normal" && normalPlay && normalPlay.count > 0 && (
            <div className="mt-4 grid gap-1.5 border-t border-app-hair pt-3.5">
              <SubLabel>일반전 플레이</SubLabel>
              <div className="flex items-center gap-2.5">
                {normalPlay.topCharacter && (
                  <CharImg id={normalPlay.topCharacter.characterId} name={normalPlay.topCharacter.characterName} size={30} radius={8} />
                )}
                <span className="min-w-0 flex-1 text-xs leading-relaxed text-gray-300">
                  최근 일반전 {normalPlay.count}
                  {normalPlay.capped ? "+" : ""}판
                  {normalPlay.topCharacter &&
                    ` · 자주 쓴 캐릭터 ${normalPlay.topCharacter.characterName}(${normalPlay.topCharacter.count}판)`}
                </span>
                <Link href={normalHref} scroll={false} replace className="flex shrink-0 items-center text-xs font-semibold text-primary">
                  일반전 보기
                  <Icon name="chevronRight" size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * 개인 분석 본문.
 * @param d 화면용 요약 (공식 역할군 체계면 toOfficialView 결과)
 * @param basis 보기 기준
 * @param official 공식 역할군 체계 여부 ("포지션" 대신 "역할군")
 */
function AnalysisBody({ d, basis, official }: { d: PlayerHistorySummary; basis: AnalysisBasis; official: boolean }) {
  const isNormal = basis === "normal";
  const term = official ? "역할군" : "포지션";
  const { persona, summary, keywords } = buildPersona(d, isNormal ? "normal" : "rating");
  const positions = d.positions.filter((p) => p.games > 0);
  const totalGames = positions.reduce((s, p) => s + p.games, 0) || 1;
  const form = d.recentForm ?? [];
  const wins = form.filter((r) => r === "win").length;
  const streak = streakText(form);
  const pending = official ? (d.coverage.ultimatePending ?? 0) : 0;
  const ym = (iso?: string | null) => {
    if (!iso) return "";
    const t = new Date(iso);
    return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, "0")}`;
  };
  const top = d.topCharacters[0];

  return (
    <div className="grid gap-4">
      {/* 표본 */}
      <p className="-mt-1 text-[11px] text-gray-500">
        표본 {d.coverage.total.toLocaleString()}경기
        {d.coverage.oldest && ` · ${ym(d.coverage.oldest)}~${ym(d.coverage.newest)}`}
      </p>

      {/* 한 줄 요약 */}
      <div className="grid gap-2 rounded-2xl bg-bg p-3.5">
        <span
          className="justify-self-start rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white"
          style={{ background: roleColorOf(d.primaryRole) }}
        >
          {persona}
        </span>
        <p className="text-[13px] leading-relaxed text-gray-200">{summary}</p>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k) => (
              <span key={k} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-gray-300">
                {k}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 숫자 3칸 */}
      <div className="grid grid-cols-3 gap-2">
        {isNormal ? (
          <>
            <Kpi label="총 경기" value={d.coverage.total.toLocaleString()} sub="일반전 누적" />
            <Kpi label="평균 경기 시간" value={d.avgPlayTime ? `${Math.round(d.avgPlayTime / 60)}분` : "-"} />
            <Kpi label="최다 캐릭터" value={top?.name ?? "-"} sub={top ? `${top.games}판` : undefined} />
          </>
        ) : (
          <>
            <Kpi
              label="통산 승률"
              value={`${d.winRate}%`}
              valueClass={wrClass(d.winRate)}
              sub={`${d.wins}승 ${d.losses}패`}
            />
            <Kpi label="평균 KDA" value={d.avgKda.toFixed(2)} sub="(킬+어시)÷데스" />
            <Kpi
              label={`주 ${term}`}
              value={roleLabel(d.primaryRole)}
              sub={`${d.positions[0]?.share ?? 0}%`}
            />
          </>
        )}
      </div>

      {/* 최근 폼 (공식전에서만 승패가 있다) */}
      {!isNormal && form.length > 0 && (
        <div className="grid gap-2">
          <SubLabel>최근 폼</SubLabel>
          <span className="text-[13px] font-semibold text-gray-100">
            최근 공식전 {form.length}판 {wins}승 {form.length - wins}패{streak ? ` · ${streak}` : ""}
          </span>
          <WinLossStrip results={form as WL[]} />
        </div>
      )}

      {/* 주력 캐릭터 */}
      {d.topCharacters.length > 0 && (
        <div className="grid gap-2">
          <SubLabel right={basis === "all" && !isNormal ? "승률은 공식전 판으로 계산" : undefined}>주력 캐릭터</SubLabel>
          <div className="grid grid-cols-3 gap-2">
            {d.topCharacters.slice(0, 6).map((c) => {
              const inner = (
                <>
                  <CharImg id={c.characterId} name={c.name} size={30} radius={8} />
                  <span className="grid min-w-0 gap-px">
                    <span className="truncate text-xs font-bold text-gray-100">{c.name}</span>
                    <span className="truncate text-[10px] text-gray-500">
                      {c.games}판
                      {!isNormal && (
                        <>
                          {" · "}
                          <span className={wrClass(c.winRate)}>{c.winRate}%</span>
                        </>
                      )}
                    </span>
                  </span>
                </>
              );
              const cls = "flex min-w-0 items-center gap-2 rounded-xl bg-bg p-2";
              return c.characterId ? (
                <Link key={c.name} href={`/characters/${c.characterId}`} className={`a-press ${cls}`}>
                  {inner}
                </Link>
              ) : (
                <div key={c.name} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 포지션·역할군 비율 */}
      {positions.length > 0 && (
        <div className="grid gap-2">
          <SubLabel>{term} 비율</SubLabel>
          {pending > 0 && (
            <p className="text-[11px] text-gray-500">
              궁극기(1차/2차) 판별 중인 경기 {pending.toLocaleString()}건 — 판별되면 역할군이 정해져요.
            </p>
          )}
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {positions.map((p) => (
              <span key={p.role} style={{ width: `${(p.games / totalGames) * 100}%`, background: roleColorOf(p.role) }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {positions.map((p) => (
              <span key={p.role} className="flex items-center gap-1.5 text-[11px] text-gray-300">
                {official && p.role !== UNKNOWN_OFFICIAL_ROLE ? (
                  <OfficialRoleIcon role={p.role} size={14} />
                ) : (
                  <span className="h-2 w-2 rounded-sm" style={{ background: roleColorOf(p.role) }} />
                )}
                {roleLabel(p.role)}
                <b className="font-bold text-gray-100">{p.share}%</b>
                <span className="text-gray-500">{p.games}판</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 연도별 플레이스타일 */}
      <div className="grid gap-2">
        <SubLabel right={d.byYear.length > 0 && d.byYear.length < 2 ? "시즌이 쌓일수록 풍부해져요" : undefined}>
          연도별 플레이스타일
        </SubLabel>
        {d.byYear.length === 0 ? (
          <p className="text-xs text-gray-500">연도별로 보여 줄 기록이 아직 없어요.</p>
        ) : (
          <ul className="grid gap-1.5">
            {d.byYear.map((y) => (
              <li key={y.year} className="flex items-center gap-2.5 text-xs">
                <span className="w-9 shrink-0 font-bold tabular-nums text-gray-500">{y.year}</span>
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: roleColorOf(y.topRole) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-gray-300">
                  <b className="font-bold text-gray-100">{roleLabel(y.topRole)} 중심</b>
                  {y.topCharacter ? ` · ${y.topCharacter}` : ""} · {y.games}경기
                </span>
                {!isNormal && <span className={`shrink-0 font-bold tabular-nums ${wrClass(y.winRate)}`}>{y.winRate}%</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * 개인 분석 숫자 칸.
 * @param label 지표 이름
 * @param value 값
 * @param sub 아래 보조 글 (선택)
 * @param valueClass 값 글자 색 클래스 (선택)
 */
function Kpi({ label, value, sub, valueClass = "text-gray-100" }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="grid min-w-0 gap-0.5 rounded-xl bg-bg px-2.5 py-2.5">
      <span className="truncate text-[10.5px] text-gray-500">{label}</span>
      <span className={`truncate text-[15px] font-extrabold ${valueClass}`}>{value}</span>
      {sub && <span className="truncate text-[10px] text-gray-500">{sub}</span>}
    </div>
  );
}

/* ── AI 전적 분석 ──────────────────────────────── */

/** 분석 타일 제목 → 아이콘 (웹 데이터의 이모지 대신) */
const INSIGHT_ICON: Record<string, IconName> = {
  "최근 폼": "target",
  "평균 KDA": "sword",
  "주력 캐릭터": "star",
  "최근 흐름": "trendUp",
  "평균 플레이타임": "clock",
  "ACE 획득": "trophy",
};

/**
 * 분석 타일 하나.
 * @param it 웹 분석 항목 (아이콘 이모지는 쓰지 않는다)
 */
function InsightTile({ it }: { it: RecentInsight }) {
  const tone = it.tone === "good" ? "text-app-win-tx" : it.tone === "bad" ? "text-app-loss-tx" : "text-gray-100";
  return (
    <div className="grid min-w-0 gap-0.5 rounded-xl bg-bg px-3 py-2.5">
      <span className="flex items-center gap-1 text-[10.5px] font-semibold text-gray-500">
        <span className={it.tone === "good" || it.tone === "bad" ? tone : "text-primary"}>
          <Icon name={INSIGHT_ICON[it.title] ?? "sparkle"} size={12} />
        </span>
        {it.title === "평균 플레이타임" ? "평균 경기 시간" : it.title}
      </span>
      <span className={`truncate text-base font-extrabold ${tone}`}>{stripEmoji(it.value)}</span>
      {it.sub && <span className="truncate text-[10.5px] text-gray-500">{stripEmoji(it.sub)}</span>}
    </div>
  );
}

/**
 * AI 전적 분석 카드 (기본 접힘, 첫 문단 미리 보기).
 * @param summary 서버가 만든 최근 전적 요약
 * @param basisLabel 보기 기준 이름 (전체/공식전/일반전)
 */
export function AiSummaryCard({ summary, basisLabel }: { summary: RecentSummary; basisLabel: string }) {
  const [open, setOpen] = useState(false);
  if (summary.sample === 0) return null;
  const paras = summary.analysis.map(stripEmoji).filter(Boolean);

  return (
    <section className="a-card overflow-hidden">
      <CardHead
        title="AI 전적 분석"
        lead="sparkle"
        chip={`최근 ${summary.sample}판`}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        controls="app-player-ai"
      />
      <div id="app-player-ai" className="px-4 pb-4">
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="grid w-full gap-1 text-left">
            <p className="line-clamp-2 text-[13px] leading-relaxed text-gray-300">{paras[0] ?? "최근 전적을 분석했어요."}</p>
            <span className="text-xs font-semibold text-primary">펼쳐서 전체 보기</span>
          </button>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-2">
              {paras.map((p, i) => (
                <p key={i} className="text-[13px] leading-[1.65] text-gray-200">
                  {p}
                </p>
              ))}
            </div>
            {summary.items.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {summary.items.map((it) => (
                  <InsightTile key={it.title} it={it} />
                ))}
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-gray-500">
              지금 보기 기준(‘{basisLabel}’)의 최근 {summary.sample}판을 자동으로 분석한 참고용 요약이에요. 보기 기준을 바꾸면
              분석도 함께 바뀌어요.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
