/**
 * 플레이 성향 태그 — 랭킹 페이지와 프로필 페이지 공용 단일 계산.
 *
 * 최근 공식전 매치(getPlayerMatches rating)의 집계로 폼·픽·전투·특기 태그를 만든다.
 * 랭킹(ranking-enrich) 과 프로필이 이 함수 하나를 공유하므로, 임계값을 여기서 바꾸면
 * 양쪽에 동일하게 반영된다. (일반전은 API 가 스탯을 안 줘 공식전 표본만 사용)
 */

import type { MatchRow } from "./types";
import { calcKDA, winRate } from "./format";

/** 성향 태그 계산에 쓰는 최근 공식전 게임 수 — 랭킹·프로필 공통 표본 (여기만 바꾸면 양쪽 반영) */
export const PLAYSTYLE_SAMPLE = 30;

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

function aggregate(rows: MatchRow[]): Agg {
  const total = rows.length;
  const wins = rows.filter((r) => r.playInfo?.result === "win").length;
  const pickCount = new Map<string, number>();
  let kill = 0;
  let death = 0;
  let assist = 0;
  let sight = 0;
  let back = 0;
  let heal = 0;
  let tower = 0;

  for (const r of rows) {
    const pi = r.playInfo;
    if (!pi) continue;
    if (pi.characterId) pickCount.set(pi.characterId, (pickCount.get(pi.characterId) ?? 0) + 1);
    kill += pi.killCount ?? 0;
    death += pi.deathCount ?? 0;
    assist += pi.assistCount ?? 0;
    sight += pi.sightPoint ?? 0;
    back += pi.backAttackCount ?? 0;
    heal += pi.healAmount ?? 0;
    tower += pi.towerAttackPoint ?? 0;
  }

  const distinct = pickCount.size;
  const topShare = distinct ? Math.max(...Array.from(pickCount.values())) / total : 0;

  return {
    total,
    winRate: winRate(wins, total - wins),
    avgKill: kill / total,
    avgDeath: death / total,
    avgAssist: assist / total,
    avgKDA: calcKDA(kill / total, death / total, assist / total),
    avgSight: sight / total,
    avgBack: back / total,
    avgHeal: heal / total,
    avgTower: tower / total,
    distinct,
    topShare,
  };
}

/** 플레이 기록 집계 → 태그 최대 4개 (폼 + 픽 숙련도 + 전투 스타일 + 특기) */
function deriveTags(a: Agg): string[] {
  const tags: string[] = [];

  // 1) 폼 (최근 승률)
  if (a.total >= 3) {
    if (a.winRate >= 70) tags.push("👑 압도적");
    else if (a.winRate >= 60) tags.push("🔥 상승세");
    else if (a.winRate >= 52) tags.push("안정적");
    else if (a.winRate >= 45) tags.push("준수");
    else if (a.winRate >= 38) tags.push("기복 있음");
    else tags.push("반등 필요");
  }

  // 2) 픽 숙련도 (분포)
  if (a.distinct <= 1) tags.push("원챔 장인");
  else if (a.topShare >= 0.6) tags.push("주력픽 확고");
  else if (a.distinct >= 6) tags.push("만능 픽");
  else if (a.distinct >= 4) tags.push("멀티 픽");
  else tags.push("주력픽 뚜렷");

  // 3) 전투 스타일 (킬·데스·어시·KDA)
  if (a.avgKill >= 10) tags.push("학살자");
  else if (a.avgKill >= 7) tags.push("공격적");
  else if (a.avgAssist >= 12) tags.push("서포터형");
  else if (a.avgAssist >= 8) tags.push("조력자");
  else if (a.avgKDA >= 4.5) tags.push("고KDA");
  else if (a.avgDeath <= 2.5) tags.push("불사신");
  else if (a.avgDeath <= 4) tags.push("생존형");
  else tags.push("밸런스형");

  // 4) 특기 (부가 지표 — 실제 스케일 보정)
  if (a.avgHeal >= 2000) tags.push("힐러");
  else if (a.avgTower >= 45000) tags.push("공성 특화");
  else if (a.avgSight >= 230) tags.push("시야 장인");
  else if (a.avgBack >= 30) tags.push("백어택러");

  return tags.slice(0, 4);
}

/** 최근 공식전 매치 → 성향 태그(최대 4개). 스탯 있는 게임이 없으면 빈 배열. */
export function computePlaystyleTags(rows: MatchRow[]): string[] {
  if (rows.length === 0) return [];
  return deriveTags(aggregate(rows));
}
