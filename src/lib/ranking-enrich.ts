/**
 * 랭킹 보강(enrich) — 각 플레이어의 최근 공식전 기록을 집계해
 * 승률·픽 TOP3·플레이스타일 태그·대표(최다 픽) 캐릭터를 만든다.
 *
 * 통합 랭킹(ratingpoint) 응답에는 승/패·캐릭터가 없어서, 플레이어별
 * 매치 기록(getPlayerMatches)에서 파생한다. (서버 컴포넌트 전용)
 */
import { getPlayer, getPlayerMatches } from "@/lib/neople";
import { calcKDA, winRate } from "@/lib/format";

export interface PickInfo {
  characterId: string;
  characterName: string;
  count: number;
}

export interface PlayerMeta {
  playerId: string;
  /** 최다 픽 캐릭터 (아바타용) */
  topChar?: { characterId: string; characterName: string };
  picks: PickInfo[];
  total: number;
  wins: number;
  /** 최근 공식전 승률(%) */
  winRate: number;
  tags: string[];
}

interface Agg {
  total: number;
  winRate: number;
  avgKill: number;
  avgDeath: number;
  avgAssist: number;
  avgKDA: number;
  avgSight: number;
  avgBack: number;
  avgHeal: number;
  avgTower: number;
  distinct: number;
  topShare: number;
}

function emptyMeta(playerId: string): PlayerMeta {
  return { playerId, picks: [], total: 0, wins: 0, winRate: 0, tags: [] };
}

/** 플레이 기록 메타데이터 → 태그 몇 개 생성 (폼 + 숙련도 + 스타일) */
function deriveTags(a: Agg): string[] {
  const tags: string[] = [];

  // 1) 폼 (최근 승률)
  if (a.total >= 3) {
    if (a.winRate >= 60) tags.push("🔥 상승세");
    else if (a.winRate >= 52) tags.push("안정적");
    else if (a.winRate >= 42) tags.push("기복 있음");
    else tags.push("반등 필요");
  }

  // 2) 숙련도 (픽 분포)
  if (a.distinct <= 2 || a.topShare >= 0.55) tags.push("원챔 장인");
  else if (a.distinct >= 5) tags.push("만능 픽");
  else tags.push("주력픽 뚜렷");

  // 3) 플레이스타일 (두드러진 스탯 하나)
  if (a.avgKill >= 8) tags.push("공격적");
  else if (a.avgAssist >= 12) tags.push("서포터형");
  else if (a.avgKDA >= 4) tags.push("고KDA");
  else if (a.avgDeath <= 3.5) tags.push("생존형");
  else if (a.avgBack >= 4) tags.push("백어택러");
  else tags.push("밸런스형");

  return tags.slice(0, 3);
}

export async function enrichPlayer(playerId: string, limit: number): Promise<PlayerMeta> {
  let rows;
  try {
    const res = await getPlayerMatches(playerId, { gameTypeId: "rating", limit });
    rows = res.matches?.rows ?? [];
  } catch {
    return emptyMeta(playerId);
  }
  if (rows.length === 0) return emptyMeta(playerId);

  const total = rows.length;
  const wins = rows.filter((r) => r.playInfo.result === "win").length;

  const pickMap = new Map<string, PickInfo>();
  let kill = 0,
    death = 0,
    assist = 0,
    sight = 0,
    back = 0,
    heal = 0,
    tower = 0;

  for (const r of rows) {
    const pi = r.playInfo;
    if (pi.characterId) {
      const cur =
        pickMap.get(pi.characterId) ??
        { characterId: pi.characterId, characterName: pi.characterName ?? "", count: 0 };
      cur.count += 1;
      if (!cur.characterName && pi.characterName) cur.characterName = pi.characterName;
      pickMap.set(pi.characterId, cur);
    }
    kill += pi.killCount ?? 0;
    death += pi.deathCount ?? 0;
    assist += pi.assistCount ?? 0;
    sight += pi.sightPoint ?? 0;
    back += pi.backAttackCount ?? 0;
    heal += pi.healAmount ?? 0;
    tower += pi.towerAttackPoint ?? 0;
  }

  const picks = Array.from(pickMap.values()).sort((a, b) => b.count - a.count);
  const wr = winRate(wins, total - wins);
  const agg: Agg = {
    total,
    winRate: wr,
    avgKill: kill / total,
    avgDeath: death / total,
    avgAssist: assist / total,
    avgKDA: calcKDA(kill / total, death / total, assist / total),
    avgSight: sight / total,
    avgBack: back / total,
    avgHeal: heal / total,
    avgTower: tower / total,
    distinct: picks.length,
    topShare: picks.length ? picks[0].count / total : 0,
  };

  return {
    playerId,
    topChar: picks[0]
      ? { characterId: picks[0].characterId, characterName: picks[0].characterName }
      : undefined,
    picks,
    total,
    wins,
    winRate: wr,
    tags: deriveTags(agg),
  };
}

export interface RepChar {
  characterId?: string;
  characterName?: string;
}

/** 각 플레이어의 대표 캐릭터(represent)를 조회 — 아바타용. 실패는 undefined. */
export async function loadRepChars(
  ids: string[],
): Promise<Map<string, RepChar | undefined>> {
  const entries = await mapLimit(ids, 8, async (id) => {
    try {
      const p = await getPlayer(id);
      return [id, p.represent] as const;
    } catch {
      return [id, undefined] as const;
    }
  });
  return new Map(entries);
}

/** 동시성 제한 map (index도 전달) */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
