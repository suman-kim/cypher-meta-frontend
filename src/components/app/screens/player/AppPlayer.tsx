/**
 * 앱 플레이어 상세 화면 (시안 03).
 *
 * 순서: 큰 캐릭터 그림 머리(티어·순위·클랜·급수, 닉네임, RP, 성향 태그, 전적 갱신·비교하기)
 *       → 내 계정 연동 띠(?link=1) → 보기 기준(전체·공식전·일반전, 스크롤해도 상단바 아래 붙음)
 *       → 지표 4칸 + 지표 기준 안내 → 개인 분석 → AI 전적 분석 → 플레이 스타일 → 주 플레이 시간대
 *       → 자주 만난 유저 → 최근 매치(펼침·더 보기)
 * 데이터는 웹 플레이어 페이지(app/players/[playerId]/page.tsx)가 불러와 계산한 값을 그대로 받는다.
 * 상호작용(상단바·갱신·연동·접힘·매치 펼침)은 PlayerClient / PlayerCards / PlayerMatches 조각이 맡는다.
 */
import { Suspense, type ReactNode } from "react";
import TrackOnView from "@/components/player/TrackOnView";
import type { MatchStream } from "@/components/player/PlayerMatchList";
import { characterImage } from "@/lib/images";
import type { PositionSystem } from "@/lib/official";
import type { PlayStyle, RecentSummary, TopCharacter } from "@/lib/profile";
import type { MatchRow } from "@/lib/types";
import type { SavedPlayer } from "@/lib/app-storage";
import { Icon } from "../../icons";
import { AppPage, Badge, CharImg, GhostLink, PlayTags, SectionHead, Segmented, StateBox, tierKo, wrClass } from "../../ui";
import { PartyCard, PartyCardSkeleton } from "./PartyCard";
import { AiSummaryCard, PlayerAnalysisCard, type AnalysisBasis } from "./PlayerCards";
import { PlayerLinkBand, PlayerRefresh, PlayerSavedSync, PlayerTopBar } from "./PlayerClient";
import { PlayerMatches } from "./PlayerMatches";
import { WEEK_LABELS, type NormalPlaySummary, type WeekHeat } from "./player-data";

/** 상단 지표 4칸에 쓰는 값 (웹 페이지가 계산한 값) */
export interface PlayerStats {
  /** 공식전 통산 승 */
  officialWins: number;
  /** 공식전 통산 패 */
  officialLosses: number;
  /** 공식전 통산 승률(%) — 기록이 없으면 null */
  officialWinRate: number | null;
  /** 최근 공식전 승률(%) — 최근 공식전이 없으면 null */
  recentWinRate: number | null;
  /** 최근 승률 계산에 쓴 승패 확정 판수 */
  recentResolved: number;
  /** 최근 공식전 평균 KDA — 없으면 null */
  avgKda: number | null;
  /** 평균 KDA 계산에 쓴 판수 */
  kdaSample: number;
  /** 최근 수집된 일반전 판수 표기 ("54판", "100+판", "-") */
  normalCountLabel: string;
}

/** 앱 플레이어 화면이 받는 데이터 */
export interface AppPlayerProps {
  /** 플레이어 ID */
  playerId: string;
  /** 닉네임 */
  nickname: string;
  /** 클랜 이름 (없으면 null) */
  clanName: string | null;
  /** 급수 (Neople grade, 없으면 null) */
  grade: number | null;
  /** 티어 이름 (없으면 null) */
  tierName: string | null;
  /** 공식전 RP (없으면 null) */
  rp: number | null;
  /** 최고 RP (없으면 null) */
  maxRp: number | null;
  /** 공식전 전체 순위 (순위권 밖이면 null) */
  rank: number | null;
  /** 대표 캐릭터 (없으면 null) */
  represent: { characterId: string; characterName: string; positionName: string | null } | null;
  /** 성향 태그 (웹 computePlaystyleTags 결과, 이모지 포함 그대로) */
  tags: string[];
  /** 데이터를 원본에서 마지막으로 받은 시각(ISO, 모르면 null) */
  cachedAt: string | null;
  /** 보기 기준 */
  basis: AnalysisBasis;
  /** 포지션 체계 (official | legacy) */
  positionSystem: PositionSystem;
  /** 내 계정 연동 흐름으로 들어왔는지 (?link=1) */
  linkFlow: boolean;
  /** 지표 4칸 값 */
  stats: PlayerStats;
  /** AI 전적 분석 (최근 매치 요약) */
  recentSummary: RecentSummary;
  /** 근거리·원거리 비율 (분류된 판이 없으면 null) */
  playStyle: PlayStyle | null;
  /** 자주 플레이한 캐릭터 (보기 기준 최근 매치) */
  topChars: TopCharacter[];
  /** 분석에 쓴 최근 매치 수 */
  sampleCount: number;
  /** 요일×시간 히트맵 */
  heat: WeekHeat;
  /** 최근 일반전 요약 (없으면 null) */
  normalPlay: NormalPlaySummary | null;
  /** 최근 매치 목록 초기값 (게임 타입별 흐름) */
  listStreams: MatchStream[];
  /** 자주 만난 유저 계산에 쓸 최근 매치 */
  partyMatches: MatchRow[];
  /** 자주 만난 유저 계산 판수 */
  partySample: number;
}

/** 보기 기준 이름 */
const BASIS_LABEL: Record<AnalysisBasis, string> = { all: "전체", rating: "공식전", normal: "일반전" };

/** 상단바 높이 (안전 영역 제외) — 머리 그림을 상단바 밑까지 끌어올릴 때 쓴다 */
const BAR_H = 52;

/**
 * 히트맵 칸 색 (경기 수가 많을수록 진한 강조색).
 * @param n 칸의 경기 수
 * @param max 최대 경기 수
 */
function heatColor(n: number, max: number): string {
  if (n === 0 || max === 0) return "rgb(var(--surface-2))";
  return `rgb(var(--primary) / ${(0.22 + (n / max) * 0.78).toFixed(2)})`;
}

/**
 * @param props 플레이어 데이터 (AppPlayerProps)
 */
export default function AppPlayer(props: AppPlayerProps) {
  const {
    playerId,
    nickname,
    clanName,
    grade,
    tierName,
    rp,
    maxRp,
    rank,
    represent,
    tags,
    cachedAt,
    basis,
    positionSystem,
    linkFlow,
    stats,
    recentSummary,
    playStyle,
    topChars,
    sampleCount,
    heat,
    normalPlay,
    listStreams,
    partyMatches,
    partySample,
  } = props;

  const base = `/players/${playerId}`;
  const hrefOf = (b: AnalysisBasis) => (b === "all" ? base : `${base}?gameTypeId=${b}`);
  const basisLabel = BASIS_LABEL[basis];
  const isNormal = basis === "normal";
  const saved: SavedPlayer = {
    playerId,
    nickname,
    characterId: represent?.characterId,
    rp: rp ?? undefined,
    rank,
    tierName: tierName ?? undefined,
  };
  const tierText = tierKo(tierName);
  const metaLine = [rank ? `전체 ${rank.toLocaleString()}위` : null, clanName, grade ? `${grade}급` : null].filter(Boolean);
  const hasList = listStreams.some((s) => s.rows.length > 0);

  return (
    <div className="min-h-[100dvh]">
      <TrackOnView playerId={playerId} nickname={nickname} />
      <PlayerSavedSync player={saved} />
      <PlayerTopBar player={saved} />

      {/* 머리 — 상단바 밑까지 끌어올려 큰 캐릭터 그림을 깐다 */}
      <section
        className="relative overflow-hidden"
        style={{
          marginTop: `calc(-${BAR_H}px - env(safe-area-inset-top))`,
          paddingTop: `calc(${BAR_H}px + env(safe-area-inset-top))`,
          background:
            "radial-gradient(90% 70% at 85% 0%, var(--a-amb), transparent 70%), linear-gradient(180deg, var(--a-hero), rgb(var(--bg)))",
        }}
      >
        {represent && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={characterImage(represent.characterId, 3)}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-8 top-6 h-[240px] w-[240px] object-cover"
            style={{
              opacity: "var(--a-art-op)",
              maskImage: "linear-gradient(to left, #000 30%, transparent 92%)",
              WebkitMaskImage: "linear-gradient(to left, #000 30%, transparent 92%)",
            }}
          />
        )}
        <div className="relative grid gap-2.5 px-4 pb-5 pt-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {tierText && <Badge tone="grad">{tierText}</Badge>}
            {metaLine.length > 0 && <span className="text-xs text-gray-300">{metaLine.join(" · ")}</span>}
          </div>
          <h1 className="break-all text-[26px] font-extrabold leading-tight tracking-[-0.01em] text-gray-50">{nickname}</h1>
          {rp !== null ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className="bg-clip-text text-[34px] font-extrabold leading-none tracking-[-0.03em] text-transparent"
                style={{ backgroundImage: "var(--a-grad)" }}
              >
                {rp.toLocaleString()}
              </span>
              <span className="text-[13px] font-semibold text-gray-500">RP</span>
              {maxRp !== null && maxRp > rp && <span className="text-[11px] text-gray-500">최고 {maxRp.toLocaleString()}</span>}
            </div>
          ) : (
            <span className="text-sm font-semibold text-gray-500">이번 시즌 공식전 기록이 없어요</span>
          )}
          {represent && (
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <CharImg id={represent.characterId} name={represent.characterName} size={22} radius={7} />
              <span>
                대표 캐릭터 <b className="font-bold text-gray-100">{represent.characterName}</b>
                {represent.positionName ? ` · ${represent.positionName}` : ""}
              </span>
            </div>
          )}
          <PlayTags tags={tags} max={5} />
          <div className="mt-1">
            <PlayerRefresh cachedAt={cachedAt} compareHref={`/players/compare?a=${encodeURIComponent(nickname)}`} />
          </div>
        </div>
      </section>

      <AppPage>
        {linkFlow && <PlayerLinkBand player={saved} />}

        {/* 보기 기준 — 아래 지표·분석·매치가 모두 이 기준을 따른다. 스크롤해도 상단바 아래 붙어 있다 */}
        <div
          className="a-glass sticky z-20 -mx-4 px-4 py-2"
          style={{ top: `calc(${BAR_H}px + env(safe-area-inset-top))` }}
        >
          <Segmented
            size="sm"
            value={basis}
            items={(["all", "rating", "normal"] as const).map((b) => ({ key: b, label: BASIS_LABEL[b], href: hrefOf(b) }))}
          />
        </div>

        {/* 지표 4칸 */}
        <section className="a-card grid grid-cols-2" aria-label="주요 지표">
          <MetricCell
            label="공식전 승률"
            value={stats.officialWinRate !== null ? `${stats.officialWinRate}%` : "-"}
            valueClass={wrClass(stats.officialWinRate)}
            sub={
              stats.officialWinRate !== null ? `통산 ${stats.officialWins}승 ${stats.officialLosses}패` : "공식전 기록 없음"
            }
            className="border-b border-r border-app-hair"
          />
          <MetricCell
            label={`최근 승률`}
            unavailable={isNormal}
            value={stats.recentWinRate !== null ? `${stats.recentWinRate}%` : "-"}
            valueClass={wrClass(stats.recentWinRate)}
            sub={isNormal ? "일반전은 승패 미제공" : stats.recentResolved > 0 ? `최근 공식전 ${stats.recentResolved}판` : "최근 공식전 없음"}
            className="border-b border-app-hair"
          />
          <MetricCell
            label="평균 KDA"
            unavailable={isNormal}
            value={stats.avgKda !== null ? stats.avgKda.toFixed(2) : "-"}
            valueClass="text-primary"
            sub={isNormal ? "일반전은 KDA 미제공" : stats.kdaSample > 0 ? `최근 공식전 ${stats.kdaSample}판` : "최근 공식전 없음"}
            className="border-r border-app-hair"
          />
          <MetricCell label="일반전 판수" value={stats.normalCountLabel} sub="최근 수집 기준" />
        </section>

        {/* 지표 기준 안내 */}
        <details className="a-tile group">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 text-[13px] font-semibold text-gray-300 [&::-webkit-details-marker]:hidden">
            <Icon name="info" size={16} />
            <span className="flex-1">지표 기준 안내</span>
            <span className="text-gray-500 transition-transform duration-200 group-open:rotate-180">
              <Icon name="chevronDown" size={16} />
            </span>
          </summary>
          <dl className="grid gap-2.5 px-3.5 pb-3.5 text-xs leading-relaxed">
            <HelpRow term="공식전 승률">Neople 공식전 통산(누적) 승·패로 계산해요. 보기 기준을 바꿔도 값이 같아요.</HelpRow>
            <HelpRow term="최근 승률">
              {isNormal
                ? "일반전은 Neople API가 승패를 주지 않아 승률을 표시할 수 없어요."
                : "최근 공식전 30판 중 승패가 확정된 경기만으로 계산해요. 승패는 공식전에만 있어서 전체·공식전 보기의 값이 같아요."}
            </HelpRow>
            <HelpRow term="평균 KDA">
              {isNormal
                ? "일반전은 KDA를 주지 않아 평균 KDA를 표시할 수 없어요."
                : "(킬+어시스트)÷데스의 평균이에요. 최근 공식전 30판 기준이라 전체·공식전 보기의 값이 같아요."}
            </HelpRow>
            <HelpRow term="일반전 판수">최근 수집된 일반전 판수예요(최대 100판). 일반전은 승패·KDA 없이 판수만 셀 수 있어요.</HelpRow>
            <HelpRow term="AI 전적 분석">지금 보기 기준(‘{basisLabel}’)의 최근 30판을 분석해요.</HelpRow>
            <HelpRow term="조회 기간">최근 90일 이내 기록만 조회돼요. 주 플레이 시간대는 한국 시간(KST)으로 셌어요.</HelpRow>
          </dl>
        </details>

        <PlayerAnalysisCard
          playerId={playerId}
          basis={basis}
          positionSystem={positionSystem}
          normalPlay={normalPlay}
          normalHref={hrefOf("normal")}
        />

        <AiSummaryCard summary={recentSummary} basisLabel={basisLabel} />

        {/* 플레이 스타일 + 자주 플레이한 캐릭터 */}
        {((playStyle && playStyle.classified > 0) || topChars.length > 0) && (
          <section className="a-card grid gap-3.5 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-gray-100">플레이 스타일</h2>
              <span className="text-[11px] text-gray-500">
                {basisLabel} 최근 {sampleCount}판
              </span>
            </div>
            {playStyle && playStyle.classified > 0 && (
              <div className="grid gap-2">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>
                    근거리 <b className="font-bold text-gray-100">{playStyle.meleePct}%</b>
                    <span className="text-gray-500"> · {playStyle.melee}판</span>
                  </span>
                  <span>
                    원거리 <b className="font-bold text-gray-100">{playStyle.rangedPct}%</b>
                    <span className="text-gray-500"> · {playStyle.ranged}판</span>
                  </span>
                </div>
                <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                  <span className="bg-primary" style={{ width: `${playStyle.meleePct}%` }} />
                  <span className="flex-1 bg-primary/30" />
                </div>
              </div>
            )}
            {topChars.length > 0 && (
              <div className="grid gap-2">
                <span className="text-xs font-bold text-gray-300">자주 플레이한 캐릭터</span>
                <ul className="grid gap-1.5">
                  {topChars.map((c, i) => (
                    <li key={c.characterName} className="flex items-center gap-2.5">
                      <span className="w-3 shrink-0 text-center text-[11px] font-bold text-gray-500">{i + 1}</span>
                      <CharImg id={c.characterId} name={c.characterName} size={28} radius={8} />
                      <span className="w-20 shrink-0 truncate text-[13px] font-semibold text-gray-100">{c.characterName}</span>
                      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(c.pct, 3)}%` }} />
                      </span>
                      <span className="w-[68px] shrink-0 text-right text-[11px] tabular-nums text-gray-500">
                        <b className="font-bold text-gray-200">{c.pct}%</b> · {c.count}판
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* 주 플레이 시간대 */}
        {heat.total > 0 && (
          <section className="a-card grid gap-3 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-gray-100">주 플레이 시간대</h2>
              <span className="text-[11px] text-gray-500">KST 기준 · 최근 {heat.total}판</span>
            </div>
            <div className="grid gap-[3px]" role="img" aria-label={heat.peakText ?? "요일·시간대별 플레이 횟수"}>
              {heat.grid.map((row, r) => (
                <div key={WEEK_LABELS[r]} className="flex items-center gap-1.5">
                  <span className={`w-3.5 shrink-0 text-[10px] ${r >= 5 ? "text-primary" : "text-gray-500"}`}>{WEEK_LABELS[r]}</span>
                  <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                    {row.map((n, h) => (
                      <span
                        key={h}
                        className="aspect-square rounded-[2px]"
                        style={{ backgroundColor: heatColor(n, heat.max) }}
                        title={`${WEEK_LABELS[r]} ${h}시 · ${n}판`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex pl-5 text-[9px] text-gray-500">
                {[0, 6, 12, 18].map((h) => (
                  <span key={h} className="flex-1">
                    {h}시
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 text-[11px] leading-snug text-gray-300">{heat.peakText}</span>
              <span className="flex shrink-0 items-center gap-[3px] text-[10px] text-gray-500">
                적음
                {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                  <span
                    key={t}
                    className="h-[9px] w-[9px] rounded-[2px]"
                    style={{ backgroundColor: t === 0 ? heatColor(0, 1) : heatColor(t * 4, 4) }}
                  />
                ))}
                많음
              </span>
            </div>
          </section>
        )}

        {/* 자주 만난 유저 (매치 상세를 여러 건 불러오므로 늦게 채운다) */}
        {partyMatches.length > 0 && (
          <Suspense fallback={<PartyCardSkeleton />}>
            <PartyCard playerId={playerId} matches={partyMatches} sample={partySample} />
          </Suspense>
        )}

        {/* 최근 매치 */}
        <section className="grid grid-cols-1 gap-2.5">
          <SectionHead title="최근 매치" sub={basisLabel} right={hasList ? <span className="text-xs text-gray-500">눌러서 요약 보기</span> : undefined} />
          {hasList ? (
            <>
              {/* 보기 기준이 바뀌면 목록을 새로 시작한다 */}
              <PlayerMatches key={basis} playerId={playerId} streams={listStreams} />
              {isNormal && (
                <p className="text-center text-[11px] leading-relaxed text-gray-500">
                  일반전은 승패·KDA가 제공되지 않아요. 펼치면 맵·팀 구성과 아이템을 볼 수 있어요.
                </p>
              )}
            </>
          ) : (
            <StateBox
              title={`최근 90일 동안 ${basis === "all" ? "" : `${basisLabel} `}매치 기록이 없어요`}
              desc="데이터는 약 1시간마다 갱신돼요. 다른 보기 기준이나 다른 플레이어를 찾아보세요."
              action={
                basis === "all" ? (
                  <GhostLink href="/search" icon="search">
                    다른 플레이어 검색
                  </GhostLink>
                ) : (
                  <GhostLink href={hrefOf("all")}>전체 기록 보기</GhostLink>
                )
              }
            />
          )}
        </section>
      </AppPage>
    </div>
  );
}

/**
 * 지표 한 칸 (라벨·값·보조 글). 일반전처럼 값을 줄 수 없으면 "표시할 수 없음"으로 그린다.
 * @param label 지표 이름
 * @param value 값
 * @param sub 보조 글
 * @param valueClass 값 글자 색
 * @param unavailable true 면 값 대신 "표시할 수 없음"
 * @param className 칸 테두리 등 추가 클래스
 */
function MetricCell({
  label,
  value,
  sub,
  valueClass = "text-gray-100",
  unavailable = false,
  className = "",
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
  unavailable?: boolean;
  className?: string;
}) {
  return (
    <div className={`grid min-w-0 content-start gap-0.5 px-4 py-3 ${className}`}>
      <span className="text-[11px] text-gray-500">{label}</span>
      {unavailable ? (
        <span className="flex h-7 items-center text-[13px] font-bold text-gray-500">표시할 수 없음</span>
      ) : (
        <span className={`h-7 text-[22px] font-extrabold leading-7 tabular-nums tracking-[-0.02em] ${valueClass}`}>{value}</span>
      )}
      <span className="truncate text-[10.5px] text-gray-500">{sub}</span>
    </div>
  );
}

/**
 * 지표 기준 안내 한 줄.
 * @param term 지표 이름
 * @param children 설명
 */
function HelpRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="font-semibold text-gray-200">{term}</dt>
      <dd className="text-gray-400">{children}</dd>
    </div>
  );
}
