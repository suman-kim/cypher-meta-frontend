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
import { kstDateParts, calcKDA, formatPlayTime, formatNumber } from "./format";

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


/* ── 서술 분석 문구 변주 유틸 ──
 * 표본(matchId 목록)으로 시드를 만들어 문구 풀에서 하나를 고른다.
 * 같은 데이터면 항상 같은 문장(SSR/CSR 일치), 새 판이 쌓이면 표현이 바뀐다. */
function seedOf(id: string): number {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s + id.charCodeAt(i) * (i + 1)) % 100003;
  return s;
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
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

  /* ── AI 스타일 서술 분석 ──
   * 결정론적 규칙 엔진. 표본 시드로 문구 풀을 변주해 플레이어마다·새 판이 쌓일 때마다
   * 표현이 달라진다(같은 데이터 = 항상 같은 문장 → SSR/CSR 불일치 없음). */
  const nv = (v?: number) => (typeof v === "number" ? v : 0);
  const seed = seedOf(recent.map((m) => m.matchId).join("|") || basisLabel);
  const analysis: string[] = [];

  if (resolved.length >= 3 && wr !== null) {
    const wins = resolved.filter((m) => m.playInfo?.result === "win").length;
    const loses = resolved.length - wins;

    // ── 1) 총평 (승률 구간별 문구 풀 + 스트릭/흐름/ACE) ──
    let p1: string;
    if (wr >= 62)
      p1 = pick(
        [
          `최근 ${basisLabel} ${resolved.length}판을 ${wr}% 승률로 압도하며 뚜렷한 상승 곡선을 그리고 있습니다.`,
          `최근 ${basisLabel} ${resolved.length}판 ${wins}승 ${loses}패(승률 ${wr}%) — 지금 폼은 확실한 절정 구간입니다.`,
          `${basisLabel} 최근 ${resolved.length}판에서 ${wr}%라는 높은 승률을 기록 중입니다. 손이 완전히 풀린 시기예요.`,
        ],
        seed,
      );
    else if (wr >= 53)
      p1 = pick(
        [
          `최근 ${basisLabel} ${resolved.length}판에서 ${wr}% 승률로 안정적으로 이기는 흐름입니다.`,
          `최근 ${basisLabel} ${resolved.length}판 ${wins}승 ${loses}패(${wr}%) — 꾸준히 승수를 쌓아가는 페이스입니다.`,
          `${basisLabel} ${resolved.length}판 기준 승률 ${wr}%로, 이기는 판을 확실히 가져가는 모습입니다.`,
        ],
        seed,
      );
    else if (wr >= 46)
      p1 = pick(
        [
          `최근 ${basisLabel} ${resolved.length}판 ${wr}% 승률로, 승패가 엎치락뒤치락하는 반반 구간입니다.`,
          `최근 ${basisLabel} ${resolved.length}판은 ${wins}승 ${loses}패(${wr}%) — 한 끗 차이 경기가 많았던 구간으로 보입니다.`,
          `${basisLabel} ${resolved.length}판 승률 ${wr}%. 폼 자체는 나쁘지 않은데 마무리가 갈리는 시기입니다.`,
        ],
        seed,
      );
    else
      p1 = pick(
        [
          `최근 ${basisLabel} ${resolved.length}판 ${wr}% 승률로 다소 부진해 반등 포인트가 필요합니다.`,
          `최근 ${basisLabel} ${resolved.length}판은 ${wins}승 ${loses}패(${wr}%)로 아쉬운 구간입니다. 흐름을 바꿀 계기가 필요해 보여요.`,
          `${basisLabel} ${resolved.length}판 승률 ${wr}% — 잘 풀리지 않는 시기지만, 아래 지표를 보면 개선 포인트가 분명합니다.`,
        ],
        seed,
      );
    if (streakText) {
      p1 +=
        streakResult === "win"
          ? pick(
              [
                ` 지금은 ${streakText} 중이라 기세가 제대로 올랐습니다.`,
                ` 게다가 현재 ${streakText} 중 — 이 흐름을 탈 때 몰아치는 게 좋습니다.`,
              ],
              seed + 1,
            )
          : pick(
              [
                ` 지금은 ${streakText} 중이니, 무리한 교전보다 흐름을 끊는 데 집중하는 게 좋겠습니다.`,
                ` 현재 ${streakText} 중입니다. 한 판 쉬어가거나 가장 자신 있는 픽으로 분위기를 바꿔 보세요.`,
              ],
              seed + 1,
            );
    } else if (trend === "상승세") p1 += ` 직전 구간보다 승률이 올라오며 반등하는 모습입니다.`;
    else if (trend === "하락세") p1 += ` 다만 직전 구간보다 승률이 떨어지는 하락세인 점은 유의해야 합니다.`;
    if (aceCount >= 3) p1 += ` 이 기간 ACE도 ${aceCount}번 가져갔습니다.`;
    analysis.push(p1);

    // ── 2) 전투 스타일 (K/D/A 성향 + 백어택·멀티킬 시그니처) ──
    if (avgKda !== null) {
      const statRows = kdaRows;
      const avgOf = (get: (m: MatchRow) => number | undefined) =>
        statRows.length ? statRows.reduce((s, m) => s + nv(get(m)), 0) / statRows.length : 0;
      const avgBack = avgOf((m) => m.playInfo?.backAttackCount);
      let doubles = 0;
      let triplesUp = 0;
      for (const m of statRows) {
        const mk = m.playInfo?.multiKillCount;
        doubles += nv(mk?.double);
        triplesUp += nv(mk?.triple) + nv(mk?.quadruple) + nv(mk?.genocide);
      }

      let style: string;
      const killLead = avgKill >= 7 && avgKill >= avgAssist * 0.9;
      const assistLead = avgAssist >= 9 && avgAssist > avgKill;
      if (killLead)
        style = pick(
          [
            `경기당 평균 ${avgKill.toFixed(1)}킬로 직접 교전을 여는 공격적인 캐리형`,
            `평균 ${avgKill.toFixed(1)}킬을 꽂아 넣으며 본인이 게임을 끝내러 가는 캐리형`,
          ],
          seed + 2,
        );
      else if (assistLead)
        style = pick(
          [
            `평균 어시스트 ${avgAssist.toFixed(1)}로 팀 전투에 빠짐없이 관여하는 팀파이터 성향`,
            `평균 ${avgAssist.toFixed(1)}어시 — 킬은 팀에 양보해도 교전엔 늘 함께하는 조력형`,
          ],
          seed + 2,
        );
      else
        style = pick(
          [
            `킬·데스·어시가 고르게 나오는 균형형 플레이`,
            `특정 지표에 치우치지 않고 상황에 맞춰 역할을 바꾸는 올라운더형`,
          ],
          seed + 2,
        );

      let deathNote: string;
      if (avgDeath <= 3.3)
        deathNote = ` 평균 데스 ${avgDeath.toFixed(1)}로 생존·포지셔닝 관리가 특히 안정적입니다.`;
      else if (avgDeath >= 5.5)
        deathNote = ` 다만 평균 데스 ${avgDeath.toFixed(1)}로 높은 편이라, 데스만 줄여도 승률이 오를 여지가 큽니다.`;
      else deathNote = ` 평균 데스 ${avgDeath.toFixed(1)}로 무난합니다.`;

      let signature = "";
      if (avgBack >= 2)
        signature = ` 판당 백어택 ${avgBack.toFixed(1)}회는 눈에 띄는 수치로, 뒤를 잡는 각을 보는 감각이 좋다는 뜻입니다.`;
      else if (triplesUp >= 2)
        signature = ` 트리플킬 이상 멀티킬을 ${triplesUp}번 만들 만큼 한타 폭발력도 갖췄습니다.`;
      else if (doubles >= 5) signature = ` 더블킬 ${doubles}회로 교전 마무리 능력도 준수합니다.`;

      analysis.push(
        `전투 스타일은 ${style}입니다.${deathNote}${signature} 최근 평균 KDA는 ${avgKda.toFixed(2)}입니다.`,
      );
    }

    // ── 3) 승패 요인 — 이긴 판 vs 진 판에서 가장 크게 벌어지는 지표 ──
    {
      type DiffKey =
        | "killCount"
        | "assistCount"
        | "deathCount"
        | "battlePoint"
        | "sightPoint"
        | "attackPoint";
      const METRIC_DEFS: {
        key: DiffKey;
        label: string;
        invert?: boolean;
        big?: boolean; // 큰 수치(포인트)면 천 단위 포맷
        comment: string;
      }[] = [
        { key: "battlePoint", label: "전투 참여도", big: true, comment: "한타 합류 타이밍만 일정하게 가져가도 승률이 따라오는 타입입니다." },
        { key: "sightPoint", label: "시야 점수", big: true, comment: "시야를 먼저 잡은 날 이기는 경향이 뚜렷하니, 정찰 습관을 계속 유지하세요." },
        { key: "killCount", label: "킬", comment: "본인이 킬을 굴리는 날 확실하게 이기는 캐리 의존형 승리 공식입니다." },
        { key: "assistCount", label: "어시스트", comment: "팀과 함께 움직인 날 승률이 뛰는, 합류 중심의 승리 공식입니다." },
        { key: "attackPoint", label: "가한 피해", big: true, comment: "딜이 터지는 날과 아닌 날의 편차가 승패로 직결되고 있습니다." },
        { key: "deathCount", label: "데스", invert: true, comment: "결국 덜 죽는 날 이깁니다. 불리할 때 무리한 진입만 줄여도 지표가 바뀝니다." },
      ];
      const winRows = resolved.filter((m) => m.playInfo?.result === "win");
      const loseRows = resolved.filter((m) => m.playInfo?.result === "lose");
      if (winRows.length >= 3 && loseRows.length >= 3) {
        const avgKey = (rows: MatchRow[], k: DiffKey) => {
          const has = rows.filter((m) => typeof m.playInfo?.[k] === "number");
          if (has.length < 3) return null;
          return has.reduce((s, m) => s + nv(m.playInfo?.[k]), 0) / has.length;
        };
        let top: { label: string; w: number; l: number; gap: number; big?: boolean; invert?: boolean; comment: string } | null = null;
        for (const d of METRIC_DEFS) {
          const w = avgKey(winRows, d.key);
          const l = avgKey(loseRows, d.key);
          if (w === null || l === null) continue;
          const better = d.invert ? l - w : w - l; // 데스는 낮을수록 좋음
          const base = Math.max(d.invert ? w : l, 0.001);
          const gap = better / base;
          if (gap > (top?.gap ?? 0)) top = { label: d.label, w, l, gap, big: d.big, invert: d.invert, comment: d.comment };
        }
        if (top && top.gap >= 0.15) {
          const fmt = (v: number) => (top!.big ? formatNumber(Math.round(v)) : v.toFixed(1));
          const lead = pick(
            [
              `흥미로운 포인트는 승패 요인입니다. 이긴 판과 진 판을 비교하면 ${top.label}에서 차이가 가장 큽니다`,
              `데이터상 승패를 가르는 열쇠는 ${top.label}입니다`,
            ],
            seed + 3,
          );
          analysis.push(
            `${lead} — 승리한 판 평균 ${fmt(top.w)}, 패배한 판 평균 ${fmt(top.l)}. ${top.comment}`,
          );
        }
      }
    }

    // ── 4) 챔프 운영 + 파티/솔로 + 경기 템포 ──
    {
      let p4 = "";
      if (topPick) {
        if (distinct <= 2 || topShare >= 0.6)
          p4 = pick(
            [
              `챔프 폭은 ${topPick.name} 중심의 원챔 성향으로 주력 숙련도가 높습니다.`,
              `픽은 ${topPick.name}에 확실하게 힘을 실어 주는 스타일입니다(표본의 ${Math.round(topShare * 100)}%).`,
            ],
            seed + 4,
          );
        else if (distinct >= 6)
          p4 = pick(
            [
              `${distinct}종을 두루 다루는 넓은 챔프 폭을 갖췄습니다.`,
              `챔프 폭이 ${distinct}종에 달해 밴픽 상황에 유연하게 대응할 수 있는 타입입니다.`,
            ],
            seed + 4,
          );
        else p4 = `${topPick.name}을(를) 중심으로 몇 개 픽을 돌려 쓰는 운영입니다.`;
        if (bestChamp && bestChamp.wr >= 60) p4 += ` 특히 ${bestChamp.name}에서 ${bestChamp.wr}% 승률(${bestChamp.decided}판)로 강합니다.`;
        if (worstChamp && worstChamp.wr <= 40 && worstChamp.name !== bestChamp?.name) {
          p4 += ` 반면 ${worstChamp.name}(${worstChamp.wr}%)에서는 다소 고전하는 편입니다.`;
        }
      }

      // 파티 vs 솔로 (partyUserCount 데이터가 있을 때만)
      const partyRows = resolved.filter((m) => nv(m.playInfo?.partyUserCount) >= 2);
      const soloRows = resolved.filter((m) => m.playInfo?.partyUserCount !== undefined && nv(m.playInfo?.partyUserCount) < 2);
      if (partyRows.length >= 3 && soloRows.length >= 3) {
        const wrOf = (rows: MatchRow[]) =>
          Math.round((rows.filter((m) => m.playInfo?.result === "win").length / rows.length) * 100);
        const pWr = wrOf(partyRows);
        const sWr = wrOf(soloRows);
        if (pWr - sWr >= 15) p4 += ` 파티 플레이 승률(${pWr}%)이 솔로(${sWr}%)보다 확연히 높아, 아는 사람과 합을 맞출 때 강해지는 타입입니다.`;
        else if (sWr - pWr >= 15) p4 += ` 의외로 솔로 승률(${sWr}%)이 파티(${pWr}%)보다 높습니다. 혼자일 때 판단이 더 날카로운 편이에요.`;
      }

      // 경기 템포
      if (timeRows.length >= 5) {
        const avgT = Math.round(timeRows.reduce((s, m) => s + nv(m.playInfo?.playTime), 0) / timeRows.length);
        if (avgT <= 13 * 60) p4 += ` 평균 ${formatPlayTime(avgT)}의 속전속결 경기가 많아, 초반 스노우볼 굴리기에 능한 편입니다.`;
        else if (avgT >= 17 * 60) p4 += ` 평균 ${formatPlayTime(avgT)}로 장기전 비중이 높아, 후반 집중력이 승패에 크게 작용합니다.`;
      }
      if (p4) analysis.push(p4.trim());
    }

    // ── 5) 코칭 팁 (약점 우선순위 기반) ──
    let tip: string;
    if (avgKda !== null && avgDeath >= 5.5)
      tip = pick(
        [
          "다음 목표는 명확합니다 — 데스 관리. 무리한 진입 한두 번만 참아도 지표가 눈에 띄게 좋아질 거예요.",
          "우선순위는 데스 줄이기입니다. 죽지 않는 것만으로도 팀 기여가 유지되는 게임이니까요.",
        ],
        seed + 5,
      );
    else if (trend === "하락세")
      tip = pick(
        [
          "하락세일 땐 새 픽 실험보다 가장 자신 있는 주력 픽으로 흐름을 다잡는 게 정석입니다.",
          "하락 구간에서는 게임 수를 줄이고 이기는 그림이 나오는 픽만 잡는 것을 추천합니다.",
        ],
        seed + 5,
      );
    else if (distinct <= 2 && wr < 50)
      tip = "상성에 대응할 서브 픽을 하나만 늘려도 승률 방어에 도움이 됩니다.";
    else if (wr >= 55)
      tip = pick(
        [
          "지금의 폼과 픽 운영을 유지하면 좋은 결과가 이어질 것입니다.",
          "특별히 고칠 게 없는 구간입니다. 지금 하던 대로, 컨디션 관리가 곧 전략이에요.",
        ],
        seed + 5,
      );
    else
      tip = pick(
        [
          "주력 픽의 강점을 살리면서 데스를 줄이는 데 초점을 맞춰 보세요.",
          "이길 때의 플레이 패턴을 의식적으로 반복하는 것이 반등의 지름길입니다.",
        ],
        seed + 5,
      );
    analysis.push(tip);
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
