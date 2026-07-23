/** 앱 전역 상수 및 라벨 매핑 */

export const SITE_NAME = "Cypher Meta";
export const SITE_TAGLINE = "사이퍼즈 전적 검색";

/** 게임 타입 */
export const GAME_TYPES = [
  { id: "rating", label: "공식전" },
  { id: "normal", label: "일반전" },
] as const;

export function gameTypeLabel(id?: string): string {
  return GAME_TYPES.find((g) => g.id === id)?.label ?? id ?? "-";
}

/** 아이템 희귀도 (rarityCode) */
export const ITEM_RARITIES = [
  { code: "101", name: "일반", color: "#9aa7b4" },
  { code: "102", name: "언커먼", color: "#4fbf6b" },
  { code: "103", name: "레어", color: "#4f8ff0" },
  { code: "104", name: "유니크", color: "#e3b23c" },
] as const;

export function rarityMeta(code?: string) {
  return ITEM_RARITIES.find((r) => r.code === code);
}

/** 캐릭터 랭킹 지표 (rankingType) */
export const CHARACTER_RANKING_TYPES = [
  { type: "winCount", label: "승리 수" },
  { type: "winRate", label: "승률" },
  { type: "killCount", label: "킬 수" },
  { type: "assistCount", label: "어시스트 수" },
  { type: "exp", label: "경험치" },
] as const;

export function characterRankingLabel(type?: string): string {
  return CHARACTER_RANKING_TYPES.find((t) => t.type === type)?.label ?? type ?? "-";
}

/** 결투장(TSJ) 타입 */
export const TSJ_TYPES = [
  { type: "melee", label: "근거리 결투장" },
  { type: "ranged", label: "원거리 결투장" },
] as const;

export function tsjLabel(type?: string): string {
  return TSJ_TYPES.find((t) => t.type === type)?.label ?? type ?? "-";
}

/**
 * 티어 색상 매핑. API 의 tierName 은 "ACE 1ST", "다이아몬드 2" 등
 * 다양한 형태로 올 수 있어 키워드 포함 여부로 판별합니다.
 */
const TIER_COLOR_RULES: { keywords: string[]; color: string }[] = [
  { keywords: ["ACE", "에이스"], color: "#ff5470" },
  { keywords: ["JOKER", "조커"], color: "#a15bf0" },
  { keywords: ["DIAMOND", "다이아"], color: "#4fc7e8" },
  { keywords: ["GOLD", "골드"], color: "#e3b23c" },
  { keywords: ["SILVER", "실버"], color: "#9aa7b4" },
  { keywords: ["BRONZE", "브론즈"], color: "#b06b3f" },
];

export function tierColor(tierName?: string): string {
  if (!tierName) return "#6b7280";
  const upper = tierName.toUpperCase();
  for (const rule of TIER_COLOR_RULES) {
    if (rule.keywords.some((k) => upper.includes(k.toUpperCase()))) return rule.color;
  }
  return "#6b7280";
}

/** 매치 상세 통계 지표 라벨 (playInfo 필드 → 한글) */
export const STAT_LABELS: Record<string, string> = {
  attackPoint: "공격 포인트",
  damagePoint: "피해 포인트",
  battlePoint: "전투 포인트",
  sightPoint: "시야 포인트",
  towerAttackPoint: "타워 공격",
  backAttackCount: "백어택",
  comboCount: "콤보",
  spellCount: "스펠",
  healAmount: "힐량",
  sentinelKillCount: "가디언 처치",
  demolisherKillCount: "디몰리셔 처치",
};
