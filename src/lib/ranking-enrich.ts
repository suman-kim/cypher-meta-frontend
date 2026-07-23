/**
 * 랭킹 보강(enrich) — 각 플레이어의 최근 공식전 기록을 집계해
 * 승률·픽 TOP3·플레이스타일 태그·대표(최다 픽) 캐릭터를 만든다.
 *
 * 통합 랭킹(ratingpoint) 응답에는 승/패·캐릭터가 없어서, 플레이어별
 * 매치 기록(getPlayerMatches)에서 파생한다. (서버 컴포넌트 전용)
 *
 * 성향 태그는 프로필 페이지와 공용인 computePlaystyleTags(@/lib/badges) 를 사용한다.
 */
import { getPlayer, getPlayerMatches } from "@/lib/neople";
import { winRate } from "@/lib/format";
import { computePlaystyleTags } from "@/lib/badges";

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

function emptyMeta(playerId: string): PlayerMeta {
  return { playerId, picks: [], total: 0, wins: 0, winRate: 0, tags: [] };
}

export async function enrichPlayer(playerId: string, limit: number): Promise<PlayerMeta> {
  try {
    const res = await getPlayerMatches(playerId, { gameTypeId: "rating", limit });
    const rows = res.matches?.rows ?? [];
    if (rows.length === 0) return emptyMeta(playerId);

    const total = rows.length;
    const wins = rows.filter((r) => r.playInfo?.result === "win").length;

    // 픽 분포(대표 캐릭터·TOP3 표시용)
    const pickMap = new Map<string, PickInfo>();
    for (const r of rows) {
      const pi = r.playInfo;
      if (!pi?.characterId) continue;
      const cur =
        pickMap.get(pi.characterId) ??
        { characterId: pi.characterId, characterName: pi.characterName ?? "", count: 0 };
      cur.count += 1;
      if (!cur.characterName && pi.characterName) cur.characterName = pi.characterName;
      pickMap.set(pi.characterId, cur);
    }
    const picks = Array.from(pickMap.values()).sort((a, b) => b.count - a.count);

    return {
      playerId,
      topChar: picks[0]
        ? { characterId: picks[0].characterId, characterName: picks[0].characterName }
        : undefined,
      picks,
      total,
      wins,
      winRate: winRate(wins, total - wins),
      tags: computePlaystyleTags(rows), // 프로필과 동일한 성향 계산
    };
  } catch {
    return emptyMeta(playerId);
  }
}

export interface RepChar {
  characterId?: string;
  characterName?: string;
}

/** 각 플레이어의 대표 캐릭터(represent)를 조회 — 아바타용. 실패는 undefined. */
export async function loadRepChars(ids: string[]): Promise<Map<string, RepChar | undefined>> {
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
