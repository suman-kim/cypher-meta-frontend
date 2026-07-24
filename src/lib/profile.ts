/**
 * 플레이어 프로필 집계 — 순수 함수 계층 (fetch 없음, 테스트 가능).
 *
 * 입력은 이미 불러온 매치 목록/매치 상세이며, 여기서 파생 통계를 계산한다.
 *  - 플레이 스타일: 사용 캐릭터의 attackType(근거리/원거리) 비율
 *  - 자주 플레이한 캐릭터: characterName 빈도 상위
 *  - 자주 같이하던 파티원: 매치 상세에서 "내 팀" 동료의 동반 등장 빈도
 *  - 주 플레이 시간대: 매치 시각(KST)을 평일/주말 × 3시간 버킷으로 집계
 */

import type { MatchRow, MatchDetail, MatchDetailPlayer } from "./types";
import { kstDateParts, calcKDA, formatPlayTime } from "./format";

/* ── 플레이 스타일 (근거리/원거리) ── */
export interface PlayStyle {
  melee: number;
  ranged: number;
  etc: number;
  /** 분류된 게임 수 (근거리+원거리) — 비율 분모 */
  classified: number;
  meleePct: number;
  rangedPct: number;
}

export function buildPlayStyle(
  matches: MatchRow[],
  attackTypeByName: Map<string, string>,
): PlayStyle {
  let melee = 0;
  let ranged = 0;
  let etc = 0;
  for (const m of matches) {
    const name = m.playInfo?.characterName;
    const at = name ? attackTypeByName.get(name) : undefined;
    if (at === "근거리") melee += 1;
    else if (at === "원거리") ranged += 1;
    else etc += 1;
  }
  const classified = melee + ranged;
  const denom = classified || 1;
  return {
    melee,
    ranged,
    etc,
    classified,
    meleePct: Math.round((melee / denom) * 1000) / 10,
    rangedPct: Math.round((ranged / denom) * 1000) / 10,
  };
}

/* ── 자주 플레이한 캐릭터 ── */
export interface TopCharacter {
  characterId?: string;
  characterName: string;
  count: number;
  pct: number;
}

export function buildTopCharacters(matches: MatchRow[], limit = 5): TopCharacter[] {
  const map = new Map<string, { characterId?: string; count: number }>();
  for (const m of matches) {
    const name = m.playInfo?.characterName;
    if (!name) continue;
    const cur = map.get(name) ?? { characterId: m.playInfo?.characterId, count: 0 };
    cur.count += 1;
    if (!cur.characterId && m.playInfo?.characterId) cur.characterId = m.playInfo.characterId;
    map.set(name, cur);
  }
  const total = matches.length || 1;
  return Array.from(map.entries())
    .map(([characterName, v]) => ({
      characterName,
      characterId: v.characterId,
      count: v.count,
      pct: Math.round((v.count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* ── 자주 만난 유저 (팀 / 적팀) ── */
export interface FrequentPlayer {
  playerId: string;
  nickname: string;
  count: number;
  /** 만난 판에서 그 유저가 가장 많이 쓴 캐릭터 (아바타용) */
  characterId?: string;
  characterName?: string;
}

type FreqAcc = {
  nickname: string;
  count: number;
  chars: Map<string, { id?: string; n: number }>;
};

function accumulate(map: Map<string, FreqAcc>, p: MatchDetailPlayer) {
  if (!p.playerId) return;
  const cur = map.get(p.playerId) ?? { nickname: p.nickname, count: 0, chars: new Map() };
  cur.count += 1;
  if (p.nickname) cur.nickname = p.nickname;
  const cn = p.playInfo?.characterName;
  if (cn) {
    const c = cur.chars.get(cn) ?? { id: p.playInfo?.characterId, n: 0 };
    c.n += 1;
    cur.chars.set(cn, c);
  }
  map.set(p.playerId, cur);
}

function finalize(map: Map<string, FreqAcc>, limit: number, minGames: number): FrequentPlayer[] {
  return Array.from(map.entries())
    .map(([playerId, v]) => {
      let best: { name?: string; id?: string; n: number } = { n: 0 };
      for (const [name, c] of v.chars) if (c.n > best.n) best = { name, id: c.id, n: c.n };
      return {
        playerId,
        nickname: v.nickname,
        count: v.count,
        characterName: best.name,
        characterId: best.id,
      };
    })
    .filter((m) => m.count >= minGames)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * 자주 만난 유저를 팀(같은 편) / 적팀(상대 편)으로 나눠 집계.
 * 참고: Neople API 는 파티(사전 그룹) 정보를 주지 않으므로, 이는 실제 파티가 아니라
 * "자주 같은/상대 팀으로 매칭된" 빈도다.
 */
export function buildFrequentPlayers(
  details: MatchDetail[],
  selfPlayerId: string,
  opts: { limit?: number; minGames?: number } = {},
): { teammates: FrequentPlayer[]; enemies: FrequentPlayer[] } {
  const limit = opts.limit ?? 5;
  const minGames = opts.minGames ?? 2;
  const teamMap = new Map<string, FreqAcc>();
  const enemyMap = new Map<string, FreqAcc>();

  for (const d of details) {
    const teams = d.teams ?? [];
    const myTeam = teams.find((t) => t.players?.some((p) => p.playerId === selfPlayerId));
    if (!myTeam) continue;
    for (const t of teams) {
      const isMine = t === myTeam;
      const target = isMine ? teamMap : enemyMap;
      for (const p of t.players ?? []) {
        if (isMine && p.playerId === selfPlayerId) continue; // 내 팀에서는 나 자신 제외
        accumulate(target, p);
      }
    }
  }

  return {
    teammates: finalize(teamMap, limit, minGames),
    enemies: finalize(enemyMap, limit, minGames),
  };
}

/* ── 주 플레이 시간대 (히트맵) ── */
export interface PlayTimeHeat {
  /** grid[row][col] — row 0=평일, 1=주말 · col 0..7 (3시간 단위: 0,3,6,9,12,15,18,21) */
  grid: number[][];
  max: number;
  total: number;
}

/** 히트맵 열(시간 버킷) 시작 시각 라벨 */
export const HEAT_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

export function buildPlayTimeHeat(matches: MatchRow[]): PlayTimeHeat {
  const grid = [Array<number>(8).fill(0), Array<number>(8).fill(0)];
  let total = 0;
  let max = 0;
  for (const m of matches) {
    const p = kstDateParts(m.date);
    if (!p) continue;
    const row = p.weekday === 0 || p.weekday === 6 ? 1 : 0;
    const col = Math.min(7, Math.floor(p.hour / 3));
    grid[row][col] += 1;
    total += 1;
    if (grid[row][col] > max) max = grid[row][col];
  }
  return { grid, max, total };
}


/* ── 최근 전적 요약 (탭별 분석) ── */
export interface RecentInsight {
  icon: string;
  title: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad" | "neutral";
}
export interface RecentSummary {
  sample: number;
  resolved: number;
  analysis: string[];
  items: RecentInsight[];
}

/**
 * 현재 탭의 최근 매치(최신순 가정, 최대 30판)로 요약 지표를 만든다.
 * 일반전은 승패/KDA가 없어 판수·주력 캐릭터·플레이타임 위주로 자동 축소된다.
 */
export function buildRecentSummary(
  matches: MatchRow[],
  gameTypeId: string | undefined,
  basisLabel: string,
  sample = 30,
  formMatches?: MatchRow[],
): RecentSummary {
  const recent = matches.slice(0, sample);
  const isRes = (m: MatchRow) => m.playInfo?.result === "win" || m.playInfo?.result === "lose";
  const hasK = (m: MatchRow) => {
    const p = m.playInfo;
    return !!p && (p.killCount !== undefined || p.deathCount !== undefined || p.assistCount !== undefined);
  };
  // 승패·KDA·연승/흐름 지표는 공식전에서만 산출 가능하다. formMatches(공식전 최근 표본)가 주어지면
  // 그것으로 계산해, 상단 타일의 '최근 공식전 N판' 기준과 승률·평점이 항상 일치하게 한다.
  // 픽 빈도·플레이타임 등은 recent(탭 문맥, 전체 탭이면 혼합)로 그대로 집계한다.
  const form = (formMatches ?? recent).slice(0, sample);
  const resolved = form.filter(isRes);
  const kdaRows = form.filter(hasK);

  // 픽 집계
  const pickMap = new Map<string, { name: string; count: number; wins: number; decided: number }>();
  for (const m of recent) {
    const name = m.playInfo?.characterName;
    if (!name) continue;
    const e = pickMap.get(name) ?? { name, count: 0, wins: 0, decided: 0 };
    e.count += 1;
    if (m.playInfo?.result === "win") { e.wins += 1; e.decided += 1; }
    else if (m.playInfo?.result === "lose") e.decided += 1;
    pickMap.set(name, e);
  }
  const picksArr = [...pickMap.values()];
  const topPick = [...picksArr].sort((a, b) => b.count - a.count)[0];
  const topPickWr = topPick && topPick.decided > 0 ? Math.round((topPick.wins / topPick.decided) * 100) : null;
  const distinct = picksArr.length;
  const topShare = topPick && recent.length ? topPick.count / recent.length : 0;
  const rated = picksArr
    .filter((p) => p.decided >= 2)
    .map((p) => ({ ...p, wr: Math.round((p.wins / p.decided) * 100) }));
  const bestChamp = [...rated].sort((a, b) => b.wr - a.wr || b.count - a.count)[0];
  const worstChamp = [...rated].sort((a, b) => a.wr - b.wr || b.count - a.count)[0];

  const items: RecentInsight[] = [];

  // 폼 + 스트릭
  let wr: number | null = null;
  let streakText = "";
  let streakResult: string | undefined;
  if (resolved.length > 0) {
    const wins = resolved.filter((m) => m.playInfo?.result === "win").length;
    const loses = resolved.length - wins;
    wr = Math.round((wins / resolved.length) * 100);
    streakResult = resolved[0]?.playInfo?.result;
    let streak = 0;
    for (const m of resolved) {
      if (m.playInfo?.result === streakResult) streak += 1;
      else break;
    }
    if (streak >= 2) streakText = streakResult === "win" ? `${streak}연승` : `${streak}연패`;
    items.push({
      icon: "🎯",
      title: "최근 폼",
      value: `${wins}승 ${loses}패`,
      sub: `승률 ${wr}%${streakText ? ` · ${streakResult === "win" ? "🔥" : "❄️"} ${streakText}` : ""}`,
      tone: wr >= 55 ? "good" : wr < 45 ? "bad" : "neutral",
    });
  }

  // 평균 KDA
  let avgKda: number | null = null;
  let avgKill = 0, avgDeath = 0, avgAssist = 0;
  if (kdaRows.length > 0) {
    let k = 0, d = 0, a = 0;
    for (const m of kdaRows) {
      k += m.playInfo?.killCount ?? 0;
      d += m.playInfo?.deathCount ?? 0;
      a += m.playInfo?.assistCount ?? 0;
    }
    const n = kdaRows.length;
    avgKill = k / n; avgDeath = d / n; avgAssist = a / n;
    avgKda = calcKDA(avgKill, avgDeath, avgAssist);
    items.push({
      icon: "⚔️",
      title: "평균 KDA",
      value: avgKda.toFixed(2),
      sub: `${avgKill.toFixed(1)} / ${avgDeath.toFixed(1)} / ${avgAssist.toFixed(1)} (K/D/A)`,
      tone: avgKda >= 3.5 ? "good" : avgKda < 2 ? "bad" : "neutral",
    });
  }

  // 주력 캐릭터
  if (topPick) {
    items.push({
      icon: "⭐",
      title: "주력 캐릭터",
      value: topPick.name,
      sub: `${topPick.count}판${topPickWr !== null ? ` · 승률 ${topPickWr}%` : ""}`,
    });
  }

  // 최근 흐름
  let trend: string | null = null;
  if (resolved.length >= 8) {
    const half = Math.floor(resolved.length / 2);
    const rHalf = resolved.slice(0, half);
    const oHalf = resolved.slice(half);
    const rWr = Math.round((rHalf.filter((m) => m.playInfo?.result === "win").length / rHalf.length) * 100);
    const oWr = Math.round((oHalf.filter((m) => m.playInfo?.result === "win").length / oHalf.length) * 100);
    const diff = rWr - oWr;
    trend = diff >= 8 ? "상승세" : diff <= -8 ? "하락세" : "유지";
    items.push({
      icon: diff >= 8 ? "📈" : diff <= -8 ? "📉" : "➡️",
      title: "최근 흐름",
      value: trend,
      sub: `직전 구간 대비 ${diff > 0 ? "+" : ""}${diff}%p`,
      tone: diff >= 8 ? "good" : diff <= -8 ? "bad" : "neutral",
    });
  }

  // 평균 플레이타임
  const timeRows = recent.filter((m) => (m.playInfo?.playTime ?? 0) > 0);
  if (timeRows.length > 0) {
    const avgT = Math.round(timeRows.reduce((sum, m) => sum + (m.playInfo?.playTime ?? 0), 0) / timeRows.length);
    items.push({ icon: "⏱️", title: "평균 플레이타임", value: formatPlayTime(avgT), sub: "판당" });
  }

  // ACE
  const aceCount = resolved.filter((m) => m.playInfo?.aceInfo?.name === "ACE").length;
  if (aceCount > 0) {
    items.push({ icon: "🏆", title: "ACE 획득", value: `${aceCount}회`, sub: `최근 ${resolved.length}판 중`, tone: "good" });
  }

  /* ── AI 스타일 서술 분석 ── */
  const analysis: string[] = [];
  if (resolved.length >= 3 && wr !== null) {
    const wins = resolved.filter((m) => m.playInfo?.result === "win").length;

    // 1) 총평
    let p1: string;
    if (wr >= 62) p1 = `최근 ${basisLabel} ${resolved.length}판을 ${wr}% 승률로 압도하며 좋은 폼을 보이고 있습니다.`;
    else if (wr >= 53) p1 = `최근 ${basisLabel} ${resolved.length}판에서 ${wr}% 승률로 안정적으로 이기는 흐름입니다.`;
    else if (wr >= 46) p1 = `최근 ${basisLabel} ${resolved.length}판 ${wr}% 승률로, 승패 편차가 있는 반반 구간입니다.`;
    else p1 = `최근 ${basisLabel} ${resolved.length}판 ${wr}% 승률로 다소 부진해 반등 포인트가 필요합니다.`;
    if (streakText) {
      p1 += streakResult === "win"
        ? ` 지금은 ${streakText} 중이라 자신감이 붙은 상태예요.`
        : ` 지금은 ${streakText} 중이니, 무리한 교전보다 흐름을 끊는 데 집중하는 게 좋겠습니다.`;
    } else if (trend === "상승세") p1 += ` 직전 구간보다 승률이 올라오며 반등하는 모습입니다.`;
    else if (trend === "하락세") p1 += ` 다만 직전 구간보다 승률이 떨어져 하락세인 점은 유의해야 합니다.`;
    analysis.push(p1);

    // 2) 전투 스타일
    if (avgKda !== null) {
      let style: string;
      const killLead = avgKill >= 7 && avgKill >= avgAssist * 0.9;
      const assistLead = avgAssist >= 9 && avgAssist > avgKill;
      if (killLead) style = `경기당 평균 ${avgKill.toFixed(1)}킬로 직접 교전을 여는 공격적인 캐리형`;
      else if (assistLead) style = `평균 어시스트 ${avgAssist.toFixed(1)}로 팀 전투에 적극 관여하는 조력·서포팅 성향`;
      else style = `킬·데스·어시가 고르게 나오는 균형형 플레이`;
      let deathNote: string;
      if (avgDeath <= 3.3) deathNote = ` 평균 데스 ${avgDeath.toFixed(1)}로 생존·포지셔닝 관리가 특히 안정적입니다.`;
      else if (avgDeath >= 5.5) deathNote = ` 다만 평균 데스 ${avgDeath.toFixed(1)}로 높은 편이라, 데스만 줄여도 승률이 오를 여지가 큽니다.`;
      else deathNote = ` 평균 데스 ${avgDeath.toFixed(1)}로 무난합니다.`;
      analysis.push(`전투 스타일은 ${style}입니다.${deathNote} 최근 평균 KDA는 ${avgKda.toFixed(2)}예요.`);
    }

    // 3) 챔프 운영 + 코칭
    let p3 = "";
    if (topPick) {
      if (distinct <= 2 || topShare >= 0.6) p3 = `챔프 폭은 ${topPick.name} 중심의 원챔 성향으로 주력 숙련도가 높습니다.`;
      else if (distinct >= 6) p3 = `${distinct}종을 두루 다루는 넓은 챔프 폭을 갖췄습니다.`;
      else p3 = `${topPick.name}을(를) 중심으로 몇 개 픽을 운영합니다.`;
      if (bestChamp && bestChamp.wr >= 60) p3 += ` 특히 ${bestChamp.name}에서 ${bestChamp.wr}% 승률로 강합니다.`;
      if (worstChamp && worstChamp.wr <= 40 && worstChamp.name !== bestChamp?.name) {
        p3 += ` 반면 ${worstChamp.name}(${worstChamp.wr}%)에서는 다소 고전하는 편입니다.`;
      }
    }
    let tip: string;
    if (avgKda !== null && avgDeath >= 5.5) tip = "데스 관리에 조금만 더 집중하면 지표가 눈에 띄게 개선될 거예요.";
    else if (trend === "하락세") tip = "하락세일 땐 자신 있는 주력 픽으로 흐름을 다잡아 보세요.";
    else if (distinct <= 2 && wr < 50) tip = "상성에 대응할 서브 픽을 하나만 늘려도 승률 방어에 도움이 됩니다.";
    else if (wr >= 55) tip = "지금의 폼과 픽 운영을 유지하면 좋은 결과가 이어질 것입니다.";
    else tip = "주력 픽의 강점을 살리면서 데스를 줄이는 데 초점을 맞춰 보세요.";
    analysis.push(`${p3 ? p3 + " " : ""}${tip}`.trim());
  } else if (recent.length > 0) {
    const pickClause = topPick ? ` 그중 ${topPick.name}을(를) ${topPick.count}판으로 가장 자주 골랐습니다.` : "";
    analysis.push(`최근 ${basisLabel} ${recent.length}판을 플레이했습니다.${pickClause}`);
    analysis.push(
      "일반전은 Neople API가 승패·KDA를 공개하지 않아, 승률·전투 심층 분석은 공식전 탭에서 확인할 수 있습니다.",
    );
  } else {
    analysis.push("표시할 최근 전적이 없습니다.");
  }

  return { sample: recent.length, resolved: resolved.length, analysis, items };
}
