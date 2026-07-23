/**
 * 플레이 성향 태그 — 랭킹 페이지와 프로필 페이지 공용 단일 계산.
 *
 * 최근 공식전 매치(getPlayerMatches rating)의 스탯 평균/분포로 태그를 만든다.
 * 랭킹(ranking-enrich)·프로필이 이 함수 하나를 공유하므로, 임계값/이모지를 여기서 바꾸면 양쪽에 동일 반영.
 *
 * 임계값 기준(관측치): 시야 ~200~500 · 힐 ~0~2100 · 골드 ~13k~25k · 가한 피해 ~12k~59k ·
 * 받은 피해 ~14k~41k. (실제 데이터로 더 정밀하게 보정 가능 — 숫자만 조정하면 된다.)
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
  avgAtk: number; // attackPoint 가한 피해
  avgTaken: number; // damagePoint 받은 피해
  avgGold: number; // getCoin 골드 획득
  avgCombo: number; // comboCount
  avgSentinel: number; // sentinelKillCount 가디언 처치
  avgDemol: number; // demolisherKillCount 철거
  avgTime: number; // playTime (초)
  distinct: number;
  topShare: number;
}

const n = (v?: number) => (typeof v === "number" ? v : 0);

function aggregate(rows: MatchRow[]): Agg {
  const total = rows.length;
  const wins = rows.filter((r) => r.playInfo?.result === "win").length;
  const pick = new Map<string, number>();
  let kill = 0;
  let death = 0;
  let assist = 0;
  let sight = 0;
  let back = 0;
  let heal = 0;
  let atk = 0;
  let taken = 0;
  let gold = 0;
  let combo = 0;
  let sent = 0;
  let demol = 0;
  let time = 0;

  for (const r of rows) {
    const p = r.playInfo;
    if (!p) continue;
    if (p.characterId) pick.set(p.characterId, (pick.get(p.characterId) ?? 0) + 1);
    kill += n(p.killCount);
    death += n(p.deathCount);
    assist += n(p.assistCount);
    sight += n(p.sightPoint);
    back += n(p.backAttackCount);
    heal += n(p.healAmount);
    atk += n(p.attackPoint);
    taken += n(p.damagePoint);
    gold += n(p.getCoin);
    combo += n(p.comboCount);
    sent += n(p.sentinelKillCount);
    demol += n(p.demolisherKillCount);
    time += n(p.playTime);
  }

  const distinct = pick.size;
  const topShare = distinct ? Math.max(...Array.from(pick.values())) / total : 0;

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
    avgAtk: atk / total,
    avgTaken: taken / total,
    avgGold: gold / total,
    avgCombo: combo / total,
    avgSentinel: sent / total,
    avgDemol: demol / total,
    avgTime: time / total,
    distinct,
    topShare,
  };
}

/**
 * 집계 → 태그 최대 5개.
 *  1) 폼(승률) · 2) 픽 숙련도 · 3) 전투 스타일 에서 각 1개 +
 *  4) 특기(부가 스탯) 중 강도 상위 2개.
 */
function deriveTags(a: Agg): string[] {
  const tags: string[] = [];

  // 1) 폼 (최근 승률)
  if (a.total >= 3) {
    if (a.winRate >= 70) tags.push("👑 압도적");
    else if (a.winRate >= 60) tags.push("🔥 상승세");
    else if (a.winRate >= 52) tags.push("🛡️ 안정적");
    else if (a.winRate >= 45) tags.push("👍 준수");
    else if (a.winRate >= 38) tags.push("🎢 기복 있음");
    else tags.push("📉 반등 필요");
  }

  // 2) 픽 숙련도 (분포)
  if (a.distinct <= 1) tags.push("🎯 원챔 장인");
  else if (a.topShare >= 0.6) tags.push("📌 주력픽 확고");
  else if (a.distinct >= 6) tags.push("🎭 만능 픽");
  else if (a.distinct >= 4) tags.push("🃏 멀티 픽");
  else tags.push("⭐ 주력픽 뚜렷");

  // 3) 전투 스타일 (킬·데스·어시·KDA)
  if (a.avgKill >= 10) tags.push("🔪 학살자");
  else if (a.avgKill >= 7) tags.push("⚔️ 공격적");
  // else if (a.avgAssist >= 12) tags.push("🤝 서포터형");
  // else if (a.avgAssist >= 8) tags.push("🫶 어시스터");
  else if (a.avgKDA >= 4.5) tags.push("📈 고KDA");
  else if (a.avgDeath <= 3) tags.push("🧿 불사신");
  else if (a.avgDeath <= 4.5) tags.push("🍀 생존형");
  else tags.push("⚖️ 밸런스형");

  // 4) 특기 — 조건 만족 항목 중 "임계값 대비 강도" 상위 2개
  const specials: { label: string; score: number }[] = [];
  const spec = (ok: boolean, label: string, score: number) => {
    if (ok) specials.push({ label, score });
  };
  spec(a.avgHeal >= 2500, "💚 힐러", a.avgHeal / 2500);
  spec(a.avgAtk >= 38000, "🐉 딜러", a.avgAtk / 38000);
  spec(a.avgTaken >= 34000 && a.avgDeath <= 5, "🧱 탱커", a.avgTaken / 34000);
  spec(a.avgSight >= 330, "👁️ 시야 장인", a.avgSight / 330);
  spec(a.avgTime > 0 && a.avgTime <= 780 && a.winRate >= 50, "⚡ 속전속결", 780 / Math.max(a.avgTime, 1));
  spec(a.avgTime >= 1080, "🐢 장기전형", a.avgTime / 1080);

  specials
    .sort((x, y) => y.score - x.score)
    .slice(0, 2)
    .forEach((s) => tags.push(s.label));

  return tags.slice(0, 5);
}

/** 최근 공식전 매치 → 성향 태그(최대 5개). 랭킹과 동일하게 rows 전체를 집계한다. */
export function computePlaystyleTags(rows: MatchRow[]): string[] {
  if (rows.length === 0) return [];
  return deriveTags(aggregate(rows));
}

/* ------------------------------------------------------------------ */
/* 태그 색상 그룹 (5색) — 칩 배경색을 그룹별로 나누기 위한 판별.       */
/* 실제 색 클래스는 Tailwind 스캔 대상인 TagChips.tsx 에서 관리한다.       */
/* ------------------------------------------------------------------ */

/** 폼 · 픽 숙련도 · 전투 스타일 · 특기(공격) · 특기(수비/유틸) */
export type TagGroup = "form" | "pick" | "combat" | "offense" | "utility";

/** 태그 라벨(이모지 제외) → 그룹. deriveTags 의 라벨과 일치시킬 것. */
const TAG_GROUP: Record<string, TagGroup> = {
  // 폼(승률)
  "압도적": "form", "상승세": "form", "안정적": "form", "준수": "form", "기복 있음": "form", "반등 필요": "form",
  // 픽 숙련도
  "원챔 장인": "pick", "주력픽 확고": "pick", "만능 픽": "pick", "멀티 픽": "pick", "주력픽 뚜렷": "pick",
  // 전투 스타일
  "학살자": "combat", "공격적": "combat", "서포터형": "combat", "조력자": "combat", "고KDA": "combat", "불사신": "combat", "생존형": "combat", "밸런스형": "combat",
  // 특기 - 공격 성향
  "화력형": "offense", "골드 파밍": "offense", "콤보 장인": "offense", "백어택러": "offense", "속전속결": "offense",
  // 특기 - 수비/유틸
  "힐러": "utility", "철벽": "utility", "시야 장인": "utility", "가디언 헌터": "utility", "공성 특화": "utility", "장기전형": "utility",
};

/** 태그 문자열("👁️ 시야 장인")에서 색상 그룹 판별 — 첫 공백 뒤 라벨로 조회. */
export function tagGroup(tag: string): TagGroup {
  const sp = tag.indexOf(" ");
  const label = sp >= 0 ? tag.slice(sp + 1) : tag;
  return TAG_GROUP[label] ?? "combat";
}
