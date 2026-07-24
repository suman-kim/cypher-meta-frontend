/** 백엔드 메타 통계 API 클라이언트 (서버 컴포넌트 전용 fetch) + 티어 산정 헬퍼(순수 함수) */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export interface CharacterMeta {
  characterId: string;
  characterName: string | null;
  role: RoleOrEtc;
  picks: number;
  /** 이 캐릭터가 등장한 고유 매치 수 (판 기준 픽률의 분자) */
  matchCount: number;
  wins: number;
  pickRate: number;
  winRate: number;
  kda: number;
  avgKill: number;
  avgDeath: number;
  avgAssist: number;
}

export interface MetaSummary {
  matches: number;
  playerRecords: number;
  characters: number;
  lastCollect: {
    lastRun?: string;
    collected?: number;
    scanned?: number;
    rankers?: number;
    perPlayer?: number;
    gameTypeId?: string;
  } | null;
  scope?: {
    gameType?: string;
    perPlayer?: number | null;
    rankTop?: number | null;
    rotating?: boolean;
    window?: number | null;
    cursorOffset?: number | null;
    lastCollectedOffset?: number | null;
  };
}

export interface ItemAdoption {
  itemId: string;
  itemName: string | null;
  slotName: string | null;
  rarityCode: string | null;
  count: number;
  rate: number;
}

export interface SlotItem {
  itemId: string;
  itemName: string | null;
  rarityCode: string | null;
  count: number;
  rate: number;
}

export interface CharacterSlot {
  equipSlotCode: string;
  slotCode: string | null;
  slotName: string | null;
  items: SlotItem[];
}

export interface CharacterItemMeta {
  characterId: string;
  picks: number;
  slots: CharacterSlot[];
  items: ItemAdoption[];
}

/** 아이템 슬롯 표시 순서 (사용자 지정: 장갑→…→특수킷). 각 위치의 동의어로 slotName 매칭. */
const SLOT_ORDER: string[][] = [
  ["손", "장갑", "글러브"],   // 장갑  (실제 slotName: 손(공격))
  ["머리", "모자"],           // 모자  (머리(치명))
  ["가슴", "옷", "상의"],     // 옷    (가슴(체력))
  ["허리", "벨트"],           // 허리  (허리(회피))
  ["다리", "바지", "하의"],   // 바지  (다리(방어))
  ["발", "신발", "구두"],     // 신발  (발(이동))
  ["목걸이", "목"],           // 목걸이 (목)
  ["장신구", "악세"],         // 장신구1~N
  ["회복"],                   // 회복킷
  ["가속", "스피드"],         // 스피드킷 (가속킷)
  ["공격킷", "공격"],         // 공격킷  (손(공격)은 위 '손'에서 먼저 매칭)
  ["방어킷", "방어"],         // 방어킷  (다리(방어)는 위 '다리'에서 먼저 매칭)
  ["특수"],                   // 특수킷
];

const ACCESSORY_INDEX = 7; // SLOT_ORDER 에서 "장신구" 위치

function slotOrderIndex(slotName: string | null): number {
  const name = slotName ?? "";
  if (!name) return SLOT_ORDER.length + 1;
  for (let i = 0; i < SLOT_ORDER.length; i++) {
    if (SLOT_ORDER[i].some((kw) => name.includes(kw))) return i;
  }
  return SLOT_ORDER.length + 1; // 미매칭은 뒤로
}

export interface OrderedSlot extends CharacterSlot {
  label: string;
}

/** 슬롯을 사용자 지정 순서로 정렬하고 라벨을 붙임(장신구는 1..N). */
export function orderSlots(slots: CharacterSlot[]): OrderedSlot[] {
  const list = Array.isArray(slots) ? slots : [];
  const sorted = [...list].sort((a, b) => {
    const d = slotOrderIndex(a.slotName) - slotOrderIndex(b.slotName);
    if (d !== 0) return d;
    return a.equipSlotCode < b.equipSlotCode ? -1 : a.equipSlotCode > b.equipSlotCode ? 1 : 0;
  });
  let accIdx = 0;
  return sorted.map((s) => {
    if (slotOrderIndex(s.slotName) === ACCESSORY_INDEX) {
      accIdx += 1;
      return { ...s, label: `장신구${accIdx}` };
    }
    return { ...s, label: s.slotName ?? `슬롯 ${s.equipSlotCode}` };
  });
}

/* ------------------------------------------------------------------ */
/* fetch (서버 전용)                                                    */
/* ------------------------------------------------------------------ */

export async function getCharacterMeta(gameTypeId?: string): Promise<CharacterMeta[]> {
  const url = `${API}/meta/characters${gameTypeId ? `?gameTypeId=${encodeURIComponent(gameTypeId)}` : ""}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`meta characters ${res.status}`);
  return res.json();
}

export async function getMetaSummary(): Promise<MetaSummary> {
  const res = await fetch(`${API}/meta/summary`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`meta summary ${res.status}`);
  return res.json();
}

export async function getCharacterItemMeta(characterId: string): Promise<CharacterItemMeta> {
  const res = await fetch(`${API}/meta/characters/${encodeURIComponent(characterId)}/items`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`meta items ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/* 티어 산정 (순수 함수 — 서버/클라이언트 공용)                          */
/* ------------------------------------------------------------------ */

export type Tier = "S" | "A" | "B" | "C" | "D";

export const TIER_ORDER: Tier[] = ["S", "A", "B", "C", "D"];

export const TIER_META: Record<Tier, { label: string; color: string; desc: string }> = {
  S: { label: "S", color: "#ff5470", desc: "최상위 (OP)" },
  A: { label: "A", color: "#e3b23c", desc: "1티어" },
  B: { label: "B", color: "#5383E8", desc: "준수" },
  C: { label: "C", color: "#4fbf6b", desc: "평범" },
  D: { label: "D", color: "#9aa7b4", desc: "하위" },
};

/**
 * 메타 점수 = 승률 + 픽률 보정(픽률이 높을수록 표본 신뢰도·존재감 반영, 최대 +4).
 * 승률 50%를 기준으로 절대 임계값으로 티어를 나눕니다(수집 표본 기준).
 */
export function metaScore(m: Pick<CharacterMeta, "winRate" | "pickRate">): number {
  const pickBonus = Math.min(m.pickRate, 40) * 0.1; // 0 ~ +4
  return Math.round((m.winRate + pickBonus) * 10) / 10;
}

export interface TieredCharacter extends CharacterMeta {
  score: number;
  tier: Tier;
}

/** 백분위(상위 %) 경계 — 상대 평가. pct < max 인 첫 구간의 티어. */
const TIER_PERCENTILE: { tier: Tier; max: number }[] = [
  { tier: "S", max: 0.1 },
  { tier: "A", max: 0.25 },
  { tier: "B", max: 0.5 },
  { tier: "C", max: 0.8 },
  { tier: "D", max: 1.01 },
];

function percentileTier(rank: number, n: number): Tier {
  const pct = n > 0 ? rank / n : 0;
  for (const b of TIER_PERCENTILE) if (pct < b.max) return b.tier;
  return "D";
}

/** 티어 산정 기준 — 종합점수 / 승률 / 픽률 */
export type TierBasis = "score" | "win" | "pick";

export const TIER_BASIS_LABEL: Record<TierBasis, string> = {
  score: "종합",
  win: "승률",
  pick: "픽률",
};

function basisValue(r: TieredCharacter, by: TierBasis): number {
  if (by === "win") return r.winRate;
  if (by === "pick") return r.pickRate;
  return r.score;
}

/**
 * 상대 평가(백분위) 티어. 선택한 기준(by) 내림차순 정렬 후
 * 상위 10% S / 25% A / 50% B / 80% C / 나머지 D.
 * minSample 미만 표본은 티어 산정에서 제외하고 D로 둡니다(기본 0 = 제외 없음).
 */
export function withTiers(
  rows: CharacterMeta[],
  by: TierBasis = "score",
  minSample = 0,
): TieredCharacter[] {
  const scored: TieredCharacter[] = rows.map((r) => ({ ...r, score: metaScore(r), tier: "D" }));
  const qualified = scored
    .filter((r) => r.picks >= minSample)
    .sort((a, b) => basisValue(b, by) - basisValue(a, by) || b.matchCount - a.matchCount);
  const n = qualified.length;
  qualified.forEach((r, i) => {
    r.tier = percentileTier(i, n);
  });
  return scored;
}

export function groupByTier(
  rows: TieredCharacter[],
  by: TierBasis = "score",
): Record<Tier, TieredCharacter[]> {
  const g: Record<Tier, TieredCharacter[]> = { S: [], A: [], B: [], C: [], D: [] };
  for (const r of rows) g[r.tier].push(r);
  // 각 티어 내부도 선택한 기준(종합/픽률/승률) 내림차순으로 정렬한다.
  // (티어 순서 S→D + 티어 내부 기준 내림차순 = 전체가 기준값 높은 순으로 나열됨)
  for (const t of TIER_ORDER)
    g[t].sort(
      (a, b) => basisValue(b, by) - basisValue(a, by) || b.matchCount - a.matchCount || b.picks - a.picks,
    );
  return g;
}

/* ------------------------------------------------------------------ */
/* 역할(포지션) 필터                                                    */
/* ------------------------------------------------------------------ */

export type CharacterRoleCode = "tank" | "melee" | "ranged" | "support";
export type RoleOrEtc = CharacterRoleCode | "etc";
export type RoleFilter = "all" | RoleOrEtc;

export const ROLE_LABELS: Record<RoleOrEtc, string> = {
  tank: "탱커",
  melee: "근접딜러",
  ranged: "원거리딜러",
  support: "서포터",
  etc: "미분류",
};

/** 메타 페이지 역할 탭 (전체 + 4개 포지션) */
export const ROLE_TABS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "tank", label: "탱커" },
  { key: "melee", label: "근접딜러" },
  { key: "ranged", label: "원거리딜러" },
  { key: "support", label: "서포터" },
];

export function isRoleFilter(v: string | undefined): v is RoleFilter {
  return !!v && ["all", "tank", "melee", "ranged", "support", "etc"].includes(v);
}

/* ------------------------------------------------------------------ */
/* 팀 조합 (5인 풀팀)                                                   */
/* ------------------------------------------------------------------ */

export interface Composition {
  ids: string[];
  names: string[];
  games: number;
  wins: number;
  winRate: number;
}

export interface CompositionsResult {
  gameTypeId: string;
  teamSize: number;
  totalTeams: number;
  distinctCombos: number;
  /** 2판 이상 반복 등장한 서로 다른 조합 수 */
  repeatedCombos?: number;
  /** 가장 많이 나온 조합의 판수 */
  maxGames?: number;
  /** 이 통계가 도출된 표본 경기 수(고유 매치) */
  sampledMatches?: number;
  minGames: number;
  byFrequency: Composition[];
  byWinRate: Composition[];
}

export async function getCompositions(opts?: {
  gameTypeId?: string;
  limit?: number;
  minGames?: number;
}): Promise<CompositionsResult> {
  const p = new URLSearchParams();
  if (opts?.gameTypeId) p.set("gameTypeId", opts.gameTypeId);
  if (opts?.limit) p.set("limit", String(opts.limit));
  if (opts?.minGames) p.set("minGames", String(opts.minGames));
  const qs = p.toString();
  const res = await fetch(`${API}/meta/compositions${qs ? `?${qs}` : ""}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`meta compositions ${res.status}`);
  return res.json();
}


/* ------------------------------------------------------------------ */
/* 드릴다운: 표본 픽 / 조합 매치 (클라이언트 fetch — 상대경로 프록시)     */
/* ------------------------------------------------------------------ */

export interface CharacterPick {
  matchId: string;
  playerId: string;
  nickname: string | null;
  result: string;
  killCount: number;
  deathCount: number;
  assistCount: number;
  playedAt: string | null;
  mapName: string | null;
}
export interface CharacterPicksResult {
  characterId: string;
  total: number;
  picks: CharacterPick[];
}

/** 특정 캐릭터를 픽한 표본 기록(누가·어떤 경기). 클라이언트 컴포넌트에서 호출. */
export async function getCharacterPicks(
  characterId: string,
  gameTypeId?: string,
): Promise<CharacterPicksResult> {
  const qs = new URLSearchParams({ limit: "30" });
  if (gameTypeId) qs.set("gameTypeId", gameTypeId);
  const res = await fetch(`/api/meta/characters/${encodeURIComponent(characterId)}/picks?${qs.toString()}`);
  if (!res.ok) throw new Error(`picks ${res.status}`);
  return res.json();
}

export interface CompMatchPlayer {
  playerId: string;
  nickname: string | null;
  characterId: string;
  characterName: string | null;
  killCount: number;
  deathCount: number;
  assistCount: number;
}
export interface CompMatch {
  matchId: string;
  result: string;
  playedAt: string | null;
  mapName: string | null;
  players: CompMatchPlayer[];
}
export interface CompMatchesResult {
  ids: string[];
  gameTypeId: string;
  matches: CompMatch[];
}

/** 특정 조합이 등장한 표본 매치 목록. 클라이언트 컴포넌트에서 호출. */
export async function getCompositionMatches(
  ids: string[],
  gameTypeId?: string,
): Promise<CompMatchesResult> {
  const qs = new URLSearchParams({ ids: ids.join(","), limit: "20" });
  if (gameTypeId) qs.set("gameTypeId", gameTypeId);
  const res = await fetch(`/api/meta/compositions/matches?${qs.toString()}`);
  if (!res.ok) throw new Error(`comp matches ${res.status}`);
  return res.json();
}
