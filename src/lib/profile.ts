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
import { kstDateParts } from "./format";

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
