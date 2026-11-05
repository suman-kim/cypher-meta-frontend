/**
 * 앱 매치 상세 화면 (시안 04).
 *
 * 상단바(뒤로 + "매치 상세") 아래 종합·분석 세그먼트.
 * - 종합: 내 결과 요약(승패·캐릭터·K/D/A, 모드·맵·경기 시간·일시) → AI 경기 요약(팀 MVP·산정 기준)
 *         → 우리 팀·상대 팀 플레이어 행(누르면 아이템·구매 순서·주요 포인트·코인·전적 보기)
 * - 분석: 웹 MatchAnalysis 와 같은 8개 지표를 팀 합계 비교 막대로, 선수별 값은 지표마다 펼쳐서 본다.
 * 어느 플레이어 기준으로 볼지는 웹과 같이 주소의 ?highlight=플레이어ID 를 따른다(없으면 1팀·2팀으로 표시).
 */
import { gameTypeLabel } from "@/lib/constants";
import { calcKDA, formatNumber } from "@/lib/format";
import { buildMatchSummary, MVP_CRITERIA } from "@/lib/match-summary";
import type { MatchDetail, MatchDetailPlayer, MatchDetailTeam, MatchPlayInfo } from "@/lib/types";
import { Icon } from "../../icons";
import { AppPage, CharImg, StateBox } from "../../ui";
import { MatchShell, TeamList } from "./MatchClient";
import { clockTime, shortDate } from "./parts";

/** 숫자 필드 읽기 (없으면 0) */
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

/**
 * K/D/A 값이 있는지 (일반전은 없다).
 * @param pi 플레이 정보
 */
function hasKda(pi?: Partial<MatchPlayInfo>): boolean {
  return !!pi && (pi.killCount !== undefined || pi.deathCount !== undefined || pi.assistCount !== undefined);
}

/** 분석 탭 지표 (웹 MatchAnalysis 와 같은 8개) */
const METRICS: { key: keyof MatchPlayInfo; label: string; lowerBetter?: boolean }[] = [
  { key: "killCount", label: "킬" },
  { key: "deathCount", label: "데스", lowerBetter: true },
  { key: "battlePoint", label: "전투 점수" },
  { key: "getCoin", label: "골드 획득량" },
  { key: "attackPoint", label: "가한 피해량" },
  { key: "damagePoint", label: "받은 피해량" },
  { key: "sightPoint", label: "시야" },
  { key: "healAmount", label: "힐량" },
];

/**
 * @param match 매치 상세 (정규화된 값)
 * @param highlight 기준 플레이어 ID (?highlight=, 없으면 undefined)
 */
export default function AppMatch({ match, highlight }: { match: MatchDetail; highlight?: string }) {
  const teams = match.teams ?? [];
  const myIdx = highlight ? teams.findIndex((t) => t.players.some((p) => p.playerId === highlight)) : -1;
  const hasMine = myIdx >= 0;
  // 우리 팀을 먼저 (기준 플레이어가 없으면 원래 순서)
  const order = hasMine ? [myIdx, ...teams.map((_, i) => i).filter((i) => i !== myIdx)] : teams.map((_, i) => i);
  const labelOf = (origIdx: number) => (hasMine ? (origIdx === myIdx ? "우리 팀" : "상대 팀") : `${origIdx + 1}팀`);
  const me = hasMine ? teams[myIdx].players.find((p) => p.playerId === highlight) : undefined;

  const all = teams.flatMap((t) => t.players);
  const hasStats = all.some((p) => hasKda(p.playInfo));
  const summary = buildMatchSummary(match, highlight);
  const mvpIds = summary.mvps.map((m) => m.playerId).filter(Boolean);
  // 팀 MVP 는 우리 팀부터, 이름은 화면의 팀 이름("우리 팀")에 맞춘다
  const mvps = summary.mvps
    .map((m) => ({ ...m, teamLabel: m.teamLabel === "내 팀" ? "우리 팀" : m.teamLabel }))
    .sort((a, b) => (a.teamLabel === "우리 팀" ? -1 : b.teamLabel === "우리 팀" ? 1 : 0));
  const maxDmg = Math.max(1, ...all.map((p) => num(p.playInfo?.attackPoint)));
  const duration = all[0]?.playInfo?.playTime;
  const backHref = highlight ? `/players/${highlight}` : "/search";

  /* ── 종합 ── */
  const overview = (
    <AppPage>
      <ResultCard match={match} me={me} duration={duration} />

      {/* AI 경기 요약 */}
      <section className="a-card grid gap-3 p-4">
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
          <Icon name="sparkle" size={16} />
          AI 경기 요약
        </div>
        <p className="text-sm font-semibold leading-relaxed text-gray-100">{summary.headline}</p>
        {summary.points.length > 0 && (
          <ul className="grid gap-1.5">
            {summary.points.map((pt, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-gray-300">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        )}
        {mvps.length > 0 && (
          <div className="grid gap-2">
            {mvps.map((mv) => (
              <div key={mv.teamLabel} className="flex items-center gap-2.5 rounded-2xl bg-bg p-2.5">
                <CharImg id={mv.characterId} name={mv.characterName ?? mv.nickname} size={36} radius={10} />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex items-center gap-1 text-[11px] font-bold">
                    <span className="text-primary">
                      <Icon name="trophy" size={12} />
                    </span>
                    <span className="text-gray-300">{mv.teamLabel} MVP</span>
                    {mv.known && (
                      <span className={mv.win ? "text-app-win-tx" : "text-app-loss-tx"}>· {mv.win ? "승리" : "패배"}</span>
                    )}
                  </span>
                  <span className="truncate text-[13px] font-bold text-gray-100">{mv.nickname}</span>
                  <span className="truncate text-[11px] text-gray-500">
                    {mv.characterName ? `${mv.characterName} · ` : ""}
                    {mv.kdaText} · {mv.ratingText}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-primary">{mv.reason}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        {mvps.length > 0 && <MvpCriteriaBox />}
        <p className="text-[11px] leading-relaxed text-gray-500">경기 지표를 자체 분석해 자동으로 만든 참고용 요약이에요.</p>
      </section>

      {teams.length < 2 ? (
        <StateBox
          title="분석할 팀 데이터가 부족해요"
          desc="경기 기록이 일부만 수집된 매치예요. 잠시 뒤 다시 확인해 주세요."
        />
      ) : (
        order.map((ti) => {
          const team = teams[ti];
          const known = team.result === "win" || team.result === "lose";
          return (
            <section key={team.teamId ?? ti} className="grid gap-2">
              <div className="flex items-baseline justify-between px-0.5">
                <span
                  className={`text-[13px] font-bold ${
                    known ? (team.result === "win" ? "text-app-win-tx" : "text-app-loss-tx") : "text-gray-300"
                  }`}
                >
                  {labelOf(ti)}
                  {known ? ` · ${team.result === "win" ? "승리" : "패배"}` : ""}
                </span>
                <span className="text-xs text-gray-500">{hasStats ? "K/D/A · 딜량" : `${team.players.length}명`}</span>
              </div>
              <TeamList team={team} highlight={highlight} mvpIds={mvpIds} maxDmg={maxDmg} />
            </section>
          );
        })
      )}
    </AppPage>
  );

  /* ── 분석 ── */
  const left = teams[order[0]];
  const right = teams[order[1]];
  const analysis = (
    <AppPage>
      {teams.length < 2 || !left || !right ? (
        <StateBox
          title="분석할 팀 데이터가 부족해요"
          desc="경기 기록이 일부만 수집된 매치예요. 잠시 뒤 다시 확인해 주세요."
        />
      ) : !hasStats ? (
        <StateBox
          icon="info"
          title="이 경기는 팀 비교를 할 수 없어요"
          desc="일반전은 경기 지표(킬·딜량 등)가 제공되지 않아요. 종합에서 팀 구성과 아이템을 볼 수 있어요."
        />
      ) : (
        <section className="a-card grid gap-4 p-4">
          <div className="flex justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {labelOf(order[0])}
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              {labelOf(order[1])}
              <span className="h-2 w-2 rounded-full bg-gray-500/60" />
            </span>
          </div>
          {METRICS.map((m) => (
            <MetricCompare key={m.key as string} metric={m} left={left} right={right} highlight={highlight} />
          ))}
          <p className="text-[11px] text-gray-500">팀 합계 기준이에요. 지표마다 “선수별 보기”를 누르면 한 명씩 볼 수 있어요.</p>
        </section>
      )}
    </AppPage>
  );

  return <MatchShell overview={overview} analysis={analysis} backHref={backHref} />;
}

/**
 * 내 결과 요약 카드 (기준 플레이어가 없으면 경기 정보만).
 * @param match 매치 상세
 * @param me 기준 플레이어 (없으면 undefined)
 * @param duration 경기 시간(초)
 */
function ResultCard({ match, me, duration }: { match: MatchDetail; me?: MatchDetailPlayer; duration?: number }) {
  const pi = me?.playInfo;
  const known = pi?.result === "win" || pi?.result === "lose";
  const win = pi?.result === "win";
  const bg = me && known ? (win ? "bg-app-win-bg" : "bg-app-loss-bg") : "a-card";
  const info: [string, string][] = [
    ["모드", gameTypeLabel(match.gameTypeId)],
    ["맵", match.map?.name ?? "-"],
    ["경기 시간", duration ? clockTime(duration) : "-"],
    ["일시", shortDate(match.date)],
  ];

  return (
    <section className={`grid gap-3.5 rounded-[20px] border border-app-hair p-4 ${bg}`}>
      {me && pi ? (
        <div className="flex items-center gap-3.5">
          <CharImg id={pi.characterId} name={pi.characterName} size={56} radius={16} />
          <div className="grid min-w-0 gap-0.5">
            <span className={`text-[13px] font-extrabold ${known ? (win ? "text-app-win-tx" : "text-app-loss-tx") : "text-gray-500"}`}>
              {known ? (win ? "승리" : "패배") : "결과 미제공"}
              <span className="font-semibold text-gray-500"> · {me.nickname}</span>
            </span>
            <span className="truncate text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-gray-50">
              {pi.characterName}
              {hasKda(pi) ? ` · ${num(pi.killCount)}/${num(pi.deathCount)}/${num(pi.assistCount)}` : ""}
            </span>
            {hasKda(pi) && (
              <span className="text-xs text-gray-400">
                평점 {calcKDA(num(pi.killCount), num(pi.deathCount), num(pi.assistCount)).toFixed(2)} · 딜{" "}
                {formatNumber(pi.attackPoint)}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-0.5">
          <span className="text-[13px] font-bold text-primary">{gameTypeLabel(match.gameTypeId)} 경기</span>
          <span className="text-[22px] font-extrabold tracking-[-0.02em] text-gray-50">
            {match.map?.name ?? "매치 정보"}
          </span>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {info.map(([k, v]) => (
          <div key={k} className="grid min-w-0 gap-0.5">
            <dt className="text-[10.5px] text-gray-500">{k}</dt>
            <dd className="truncate text-[13px] font-bold text-gray-100">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * MVP 산정 기준 (접힘) — 가중치는 lib/match-summary 의 MVP_CRITERIA 를 그대로 읽어 실제 계산과 같다.
 */
function MvpCriteriaBox() {
  const maxW = Math.max(...MVP_CRITERIA.map((c) => c.weight));
  return (
    <details className="group rounded-2xl bg-bg">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-gray-400 [&::-webkit-details-marker]:hidden">
        <Icon name="info" size={14} />
        <span className="flex-1">MVP는 어떻게 뽑나요?</span>
        <span className="transition-transform duration-200 group-open:rotate-180">
          <Icon name="chevronDown" size={14} />
        </span>
      </summary>
      <div className="grid gap-2 px-3 pb-3">
        <p className="text-[11px] leading-relaxed text-gray-500">
          게임 공식 ACE·JOKER 와 별개인 자체 지표예요. 각 항목을 경기 안 최고값 대비 0~100%로 맞춘 뒤 아래 비중으로 더해,
          점수가 가장 높은 선수를 팀마다 한 명 뽑아요. 딜러에 치우치지 않도록 전투 참여·시야 비중을 크게 두었어요.
        </p>
        <ul className="grid gap-1.5">
          {MVP_CRITERIA.map((c) => (
            <li key={c.key} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-right text-[11px] font-bold tabular-nums text-primary">
                {Math.round(c.weight * 100)}%
              </span>
              <span className="w-[112px] shrink-0 truncate text-[11px] text-gray-300">{c.label}</span>
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(c.weight / maxW) * 100}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right text-[10px] text-gray-500">{c.role}</span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-gray-500">비중 합계 100% · 데스는 적을수록 점수가 높아요</p>
      </div>
    </details>
  );
}

/**
 * 지표 하나의 팀 비교 — 합계 막대 + 선수별 보기(펼침).
 * @param metric 지표 (키·이름·낮을수록 좋은지)
 * @param left 왼쪽 팀 (우리 팀 / 1팀)
 * @param right 오른쪽 팀 (상대 팀 / 2팀)
 * @param highlight 강조할 플레이어 ID
 */
function MetricCompare({
  metric,
  left,
  right,
  highlight,
}: {
  metric: { key: keyof MatchPlayInfo; label: string; lowerBetter?: boolean };
  left: MatchDetailTeam;
  right: MatchDetailTeam;
  highlight?: string;
}) {
  const sum = (t: MatchDetailTeam) => t.players.reduce((s, p) => s + num(p.playInfo?.[metric.key]), 0);
  const a = sum(left);
  const b = sum(right);
  const share = a + b > 0 ? (a / (a + b)) * 100 : 50;
  const aLead = metric.lowerBetter ? a < b : a > b;
  const bLead = metric.lowerBetter ? b < a : b > a;
  const max = Math.max(1, ...[...left.players, ...right.players].map((p) => num(p.playInfo?.[metric.key])));

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className={`font-extrabold tabular-nums ${aLead ? "text-primary" : "text-gray-100"}`}>{formatNumber(a)}</span>
        <span className="text-[11px] text-gray-500">
          {metric.label}
          {metric.lowerBetter ? " (적을수록 좋아요)" : ""}
        </span>
        <span className={`font-extrabold tabular-nums ${bLead ? "text-primary" : "text-gray-100"}`}>{formatNumber(b)}</span>
      </div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        <span className="bg-primary" style={{ width: `${share}%` }} />
        <span className="flex-1 bg-gray-500/40" />
      </div>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-0.5 text-[11px] font-semibold text-gray-500 [&::-webkit-details-marker]:hidden">
          선수별 보기
          <span className="transition-transform duration-200 group-open:rotate-180">
            <Icon name="chevronDown" size={12} />
          </span>
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {[left, right].map((t, side) => (
            <ul key={side} className="grid content-start gap-1.5">
              {t.players.map((p, i) => {
                const v = num(p.playInfo?.[metric.key]);
                const me = !!highlight && p.playerId === highlight;
                return (
                  <li key={p.playerId || i} className="grid gap-0.5">
                    <span className="flex min-w-0 items-center gap-1">
                      <CharImg id={p.playInfo?.characterId} name={p.playInfo?.characterName} size={16} radius={5} />
                      <span className={`min-w-0 flex-1 truncate text-[10.5px] ${me ? "font-bold text-app-ac-tx" : "text-gray-300"}`}>
                        {p.nickname || p.playInfo?.characterName}
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-gray-400">{formatNumber(v)}</span>
                    </span>
                    <span className="h-1 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className={`block h-full rounded-full ${side === 0 ? "bg-primary" : "bg-gray-500/60"}`}
                        style={{ width: `${max > 0 ? Math.max(v > 0 ? 3 : 0, (v / max) * 100) : 0}%` }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </details>
    </div>
  );
}
