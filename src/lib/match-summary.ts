/**
 * 매치 "AI 요약" — 매치 상세 지표를 분석해 자연어 요약 + 팀별 MVP 를 생성한다.
 * (실제 LLM 호출이 아닌 지표 기반 결정론적 분석 엔진. 추가 API 호출 없음.)
 *
 *  · MVP 는 게임의 ACE/JOKER 표식이 아니라, 킬·가한딜·탱킹(받은딜)·어시·생존·시야·힐을
 *    역할 균형 있게 가중 합산한 자체 점수로 각 팀에서 1명씩 뽑는다(딜러 편중 완화 →
 *    탱커·서포터도 MVP 가능).
 *  · 문구는 matchId 로 시드를 만들어 경기마다 표현을 조금씩 바꿔(같은 경기는 항상 동일) 반복감을 줄인다.
 */
import type { MatchDetail, MatchDetailPlayer, MatchDetailTeam } from "./types";
import { calcKDA, formatNumber, formatPlayTime } from "./format";

const n = (v?: number) => (typeof v === "number" ? v : 0);

export interface TeamMvp {
  teamLabel: string;
  win: boolean;
  known: boolean;
  playerId: string;
  nickname: string;
  characterId?: string;
  characterName?: string;
  kdaText: string;
  ratingText: string;
  reason: string;
}

export interface MatchSummary {
  hasStats: boolean;
  headline: string;
  points: string[];
  mvps: TeamMvp[];
}

interface TeamStat {
  team: MatchDetailTeam;
  win: boolean;
  known: boolean;
  kills: number;
  gold: number;
  dealt: number;
  sight: number;
}

/** MVP 자체 점수에 쓰는 지표 키 (모두 MatchPlayInfo 의 숫자 필드) */
export type MvpMetric =
  | "killCount"
  | "assistCount"
  | "attackPoint"
  | "damagePoint"
  | "deathCount"
  | "sightPoint"
  | "healAmount"
  | "towerAttackPoint";

export interface MvpCriterion {
  key: MvpMetric;
  label: string;
  weight: number;
  role: "딜러" | "탱커" | "서포터" | "공통" | "오브젝트";
  /** true 면 값이 낮을수록 가점(데스 → 생존) */
  invert?: boolean;
}

/**
 * MVP 자체 점수 가중치표 — 계산(mvpScore)과 화면 표(MvpCriteria)의 단일 출처.
 * 가중치 합 = 1.00. 공격(킬+가한딜) 0.33 으로 낮추고 탱킹·어시·시야·힐을 키워 역할 균형.
 */
export const MVP_CRITERIA: MvpCriterion[] = [
  { key: "killCount", label: "킬", weight: 0.18, role: "딜러" },
  { key: "assistCount", label: "어시스트", weight: 0.18, role: "서포터" },
  { key: "attackPoint", label: "가한 피해", weight: 0.15, role: "딜러" },
  { key: "damagePoint", label: "받은 피해 (탱킹)", weight: 0.12, role: "탱커" },
  { key: "deathCount", label: "생존 (적은 데스)", weight: 0.12, role: "공통", invert: true },
  { key: "sightPoint", label: "시야", weight: 0.11, role: "서포터" },
  { key: "healAmount", label: "힐량", weight: 0.09, role: "서포터" },
  { key: "towerAttackPoint", label: "타워 공격", weight: 0.05, role: "오브젝트" },
];

type MaxMap = Record<MvpMetric, number>;

function teamStat(team: MatchDetailTeam): TeamStat {
  let kills = 0;
  let gold = 0;
  let dealt = 0;
  let sight = 0;
  for (const p of team.players) {
    const pi = p.playInfo;
    kills += n(pi.killCount);
    gold += n(pi.getCoin);
    dealt += n(pi.attackPoint);
    sight += n(pi.sightPoint);
  }
  return {
    team,
    win: team.result === "win",
    known: team.result === "win" || team.result === "lose",
    kills,
    gold,
    dealt,
    sight,
  };
}

function criteriaMaxes(all: MatchDetailPlayer[]): MaxMap {
  const mx = {} as MaxMap;
  for (const c of MVP_CRITERIA) {
    mx[c.key] = Math.max(1, ...all.map((p) => n(p.playInfo[c.key])));
  }
  return mx;
}

/** 자체 MVP 점수 — MVP_CRITERIA 를 매치 내 최댓값으로 정규화해 가중 합산 (표와 동일 출처) */
function mvpScore(p: MatchDetailPlayer, mx: MaxMap): number {
  const pi = p.playInfo;
  let score = 0;
  for (const c of MVP_CRITERIA) {
    const v = n(pi[c.key]);
    const norm = c.invert ? 1 - v / mx[c.key] : v / mx[c.key];
    score += c.weight * norm;
  }
  return score;
}

/** MVP 선정 근거 — 정규화 기여도 상위 2개 강점을 뽑아 문구화 */
function mvpReason(p: MatchDetailPlayer, mx: MaxMap): string {
  const pi = p.playInfo;
  const death = n(pi.deathCount);
  const parts = [
    { c: n(pi.killCount) / mx.killCount, t: `${n(pi.killCount)}킬` },
    { c: n(pi.attackPoint) / mx.attackPoint, t: "높은 딜링" },
    { c: n(pi.damagePoint) / mx.damagePoint, t: "든든한 탱킹" },
    { c: n(pi.assistCount) / mx.assistCount, t: `${n(pi.assistCount)}어시` },
    { c: 1 - death / mx.deathCount, t: death <= 2 ? "탄탄한 생존" : "적은 데스" },
    { c: n(pi.sightPoint) / mx.sightPoint, t: "넓은 시야" },
    { c: n(pi.healAmount) / mx.healAmount, t: "높은 힐량" },
  ].filter((x) => x.c > 0);
  parts.sort((a, b) => b.c - a.c);
  return parts.slice(0, 2).map((x) => x.t).join(" · ") || "종합 기여";
}

function kdaText(p: MatchDetailPlayer): string {
  const pi = p.playInfo;
  return `${n(pi.killCount)}/${n(pi.deathCount)}/${n(pi.assistCount)}`;
}
function ratingText(p: MatchDetailPlayer): string {
  const pi = p.playInfo;
  return `평점 ${calcKDA(n(pi.killCount), n(pi.deathCount), n(pi.assistCount)).toFixed(2)}`;
}

function seedOf(id: string): number {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s + id.charCodeAt(i) * (i + 1)) % 100003;
  return s;
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function buildMatchSummary(match: MatchDetail, highlightPlayerId?: string): MatchSummary {
  const teams = match.teams ?? [];
  if (teams.length < 2) {
    return { hasStats: false, headline: "분석할 팀 데이터가 부족합니다.", points: [], mvps: [] };
  }

  const playTime = teams[0]?.players[0]?.playInfo?.playTime;
  const anyStat = teams.some((t) =>
    t.players.some(
      (p) => p.playInfo?.killCount !== undefined || p.playInfo?.deathCount !== undefined,
    ),
  );

  if (!anyStat) {
    const points: string[] = [];
    if (playTime) points.push(`경기 시간은 ${formatPlayTime(playTime)}였습니다.`);
    points.push(
      "일반전은 Neople API가 승패·KDA·스탯을 제공하지 않아, 팀 구성과 아이템 빌드 위주로만 확인할 수 있습니다.",
    );
    return { hasStats: false, headline: "이 경기는 상세 스탯이 제공되지 않습니다.", points, mvps: [] };
  }

  const seed = seedOf(match.matchId || "0");
  const stats = teams.map(teamStat);
  const maxes = criteriaMaxes(teams.flatMap((t) => t.players));

  const myIdx = highlightPlayerId
    ? teams.findIndex((t) => t.players.some((p) => p.playerId === highlightPlayerId))
    : -1;
  const hasMine = myIdx >= 0;

  const labelOf = (idx: number) => (hasMine ? (idx === myIdx ? "내 팀" : "상대 팀") : `${idx + 1}팀`);

  // 팀별 MVP (자체 점수 최고)
  const mvps: TeamMvp[] = teams.map((team, idx) => {
    const best = team.players.reduce((a, b) => (mvpScore(b, maxes) > mvpScore(a, maxes) ? b : a));
    return {
      teamLabel: labelOf(idx),
      win: team.result === "win",
      known: team.result === "win" || team.result === "lose",
      playerId: best.playerId,
      nickname: best.nickname,
      characterId: best.playInfo.characterId,
      characterName: best.playInfo.characterName,
      kdaText: kdaText(best),
      ratingText: ratingText(best),
      reason: mvpReason(best, maxes),
    };
  });

  // 서술 기준 팀 A(내 팀/1팀) vs B
  const A = hasMine ? stats[myIdx] : stats[0];
  const B = hasMine ? stats[myIdx === 0 ? 1 : 0] : stats[1];
  const aLabel = labelOf(hasMine ? myIdx : 0);
  const bLabel = labelOf(hasMine ? (myIdx === 0 ? 1 : 0) : 1);

  const killDiff = A.kills - B.kills;
  const goldDiff = A.gold - B.gold;
  const aLeadCount = [A.kills > B.kills, A.gold > B.gold, A.dealt > B.dealt, A.sight > B.sight].filter(
    Boolean,
  ).length;
  const intensity =
    Math.abs(killDiff) >= 12 || Math.abs(goldDiff) >= 15000
      ? "일방적으로"
      : Math.abs(killDiff) <= 4
        ? "박빙 끝에"
        : "안정적으로";

  // ── 헤드라인 (경기마다 표현 변주) ──
  let headline: string;
  if (A.known && A.win) {
    if (aLeadCount <= 1)
      headline = pick(
        [
          `${aLabel}이 지표 열세를 딛고 거점을 노려 승리를 가져간 경기입니다.`,
          `${aLabel}이 성장에서 밀리고도 한타 집중력으로 승부를 뒤집은 경기입니다.`,
        ],
        seed,
      );
    else if (intensity === "일방적으로" && aLeadCount >= 3)
      headline = pick(
        [
          `${aLabel}이 초반부터 스노우볼을 굴리며 일방적으로 승리한 경기입니다.`,
          `${aLabel}이 전 지표를 압도하며 완승한 경기입니다.`,
        ],
        seed,
      );
    else if (intensity === "박빙 끝에")
      headline = pick(
        [
          `${aLabel}이 박빙의 접전 끝에 승리를 챙긴 경기입니다.`,
          `${aLabel}이 마지막 한타에서 우위를 잡고 신승한 경기입니다.`,
        ],
        seed,
      );
    else
      headline = pick(
        [
          `${aLabel}이 안정적인 운영으로 승리한 경기입니다.`,
          `${aLabel}이 주도권을 유지하며 무난히 승리한 경기입니다.`,
        ],
        seed,
      );
  } else if (A.known) {
    if (aLeadCount >= 3)
      headline = pick(
        [
          `${aLabel}이 지표에서 앞서고도 거점 관리에서 밀려 아쉽게 패배한 경기입니다.`,
          `${aLabel}이 교전은 이기고 경기는 내준, 뼈아픈 패배입니다.`,
        ],
        seed,
      );
    else if (intensity === "박빙 끝에")
      headline = `${aLabel}이 박빙 끝에 아쉽게 무너진 경기입니다.`;
    else if (intensity === "일방적으로") headline = `${aLabel}이 초반부터 밀리며 완패한 경기입니다.`;
    else headline = `${aLabel}이 흐름을 내주며 패배한 경기입니다.`;
  } else {
    const w = stats[0].win ? 0 : stats[1].win ? 1 : -1;
    headline = w >= 0 ? `${labelOf(w)}이 승리한 경기입니다.` : "경기 지표 요약";
  }

  // ── 분석 포인트 ──
  const points: string[] = [];

  // 1) 결정적 요인 (승리 팀의 최대 상대 격차 지표)
  const winner = stats.find((s) => s.win) ?? null;
  const loser = stats.find((s) => s.known && !s.win) ?? null;
  if (winner && loser) {
    const wLabel = labelOf(teams.indexOf(winner.team));
    const lLabel = labelOf(teams.indexOf(loser.team));
    const defs = [
      { label: "교전(킬)", w: winner.kills, l: loser.kills, fmt: (x: number) => `${x}` },
      { label: "성장(골드)", w: winner.gold, l: loser.gold, fmt: (x: number) => formatNumber(x) },
      { label: "화력(딜)", w: winner.dealt, l: loser.dealt, fmt: (x: number) => formatNumber(x) },
      { label: "시야", w: winner.sight, l: loser.sight, fmt: (x: number) => formatNumber(x) },
    ];
    const wLeads = defs
      .filter((d) => d.w > d.l)
      .map((d) => ({ ...d, gap: (d.w - d.l) / Math.max(d.w, d.l, 1) }))
      .sort((a, b) => b.gap - a.gap);
    if (wLeads.length) {
      const d = wLeads[0];
      points.push(
        `승부를 가른 건 ${d.label}였습니다 — ${wLabel} ${d.fmt(d.w)} vs ${lLabel} ${d.fmt(d.l)}로 ${Math.round(d.gap * 100)}% 우위.`,
      );
    } else {
      points.push(
        `${wLabel}은 지표에서 앞서지 못했지만 거점을 집중 공략해 승리를 만들어냈습니다.`,
      );
    }
    // 2) 패한 팀이 그래도 앞선 지표
    const lLeads = defs.filter((d) => d.l > d.w).sort((a, b) => b.l / Math.max(b.w, 1) - a.l / Math.max(a.w, 1));
    if (lLeads.length) {
      points.push(`${lLabel}도 ${lLeads[0].label}에선 앞섰지만 승부를 뒤집진 못했습니다.`);
    }
  } else {
    points.push(
      `킬 ${A.kills}:${B.kills} · 골드 ${formatNumber(A.gold)}:${formatNumber(B.gold)} · 화력 ${formatNumber(A.dealt)}:${formatNumber(B.dealt)} (${aLabel} 기준).`,
    );
  }

  // 3) 검색 플레이어 코멘트
  if (highlightPlayerId) {
    const me = teams.flatMap((t) => t.players).find((p) => p.playerId === highlightPlayerId);
    if (me) {
      const pi = me.playInfo;
      const kda = calcKDA(n(pi.killCount), n(pi.deathCount), n(pi.assistCount));
      const isTeamMvp = mvps.some((mv) => mv.nickname === me.nickname && mv.characterName === pi.characterName);
      let verdict: string;
      if (isTeamMvp) verdict = "팀 MVP로 경기를 이끌었습니다";
      else if (kda >= 5) verdict = "지표 전반에서 존재감을 보였습니다";
      else if (n(pi.deathCount) >= 8) verdict = "데스가 많아 기복이 아쉬웠습니다";
      else if (kda >= 3) verdict = "제 몫을 안정적으로 해냈습니다";
      else verdict = "무난한 활약이었습니다";
      points.push(`${me.nickname}님(${pi.characterName ?? "해당 캐릭터"} ${kdaText(me)})은 ${verdict}.`);
    }
  }

  // 4) 경기 양상
  if (playTime) {
    const flow =
      playTime <= 720
        ? pick(["빠르게 굳힌 스노우볼 양상", "초반 주도권이 끝까지 이어진 흐름"], seed)
        : playTime >= 1080
          ? pick(["막판까지 물고 늘어진 장기전", "쉽게 승부가 나지 않은 소모전"], seed)
          : "표준적인 템포";
    points.push(`${formatPlayTime(playTime)} 경기로, ${flow}이었습니다.`);
  }

  return { hasStats: true, headline, points: points.slice(0, 5), mvps };
}
