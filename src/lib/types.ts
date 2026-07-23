/**
 * 사이퍼즈 앱 타입.
 *
 * ┌─ 베이스: `neople-openapi-types` 패키지 (crowrish/neople-openapi-types)
 * │   - 라이브러리는 `Cyphers` 네임스페이스로 타입을 제공합니다: `Cyphers.PlayerInfo` 등
 * │   - 공통 리스트 응답 `ApiResponse<T>` = { rows: T[]; next? } 는 최상위 export
 * └─ 확장: 이 파일에서 라이브러리 타입을 extend / Pick 하여 "뷰 모델"을 정의합니다.
 *
 * 👉 필요한 데이터 필드는 각 interface 안의 "여기에 추가" 주석 지점에 그냥 넣으면 됩니다.
 *    (라이브러리 원본은 건드리지 않고, 우리 타입만 확장)
 *
 * ⚠️ 라이브러리의 매치/랭킹 타입은 필드를 "평평하게(flat)" 정의하는데, 실제 API 는
 *    일부를 중첩(playInfo, player)해서 줄 수 있습니다. 이 뷰 타입은 중첩 형태를
 *    기준으로 하며, 두 형태 모두 `lib/normalize.ts` 가 흡수합니다.
 */

import type { ApiResponse, Cyphers } from "neople-openapi-types";

/* ── 베이스 타입 재노출 (라이브러리에서 그대로 가져옴) ── */
export type { ApiResponse };
export type Tier = Cyphers.CyphersTier; // 'BRONZE' | ... | 'ACE'
export type ItemRarityCode = Cyphers.CyphersItemRarity; // '101' | '102' | '103' | '104'
export type PlayerInfo = Cyphers.PlayerInfo; // { playerId, nickname, grade, clanName? }

/* ── 게임 공통 ── */
export type GameTypeId = "rating" | "normal";
export type MatchResult = "win" | "lose";

/**
 * 전투 스탯 집합 — 라이브러리 `Cyphers.MatchPlayer` 의 필드 정의를 그대로 재사용합니다.
 * (라이브러리가 스탯 필드를 업데이트하면 자동으로 반영됨)
 */
type StatKeys =
  | "level"
  | "killCount"
  | "deathCount"
  | "assistCount"
  | "attackPoint"
  | "damagePoint"
  | "battlePoint"
  | "sightPoint"
  | "towerAttackPoint"
  | "backAttackCount"
  | "comboCount"
  | "spellCount"
  | "healAmount"
  | "sentinelKillCount"
  | "demolisherKillCount";

export type CombatStats = Partial<Pick<Cyphers.MatchPlayer, StatKeys>>;

/* ── 플레이어 검색 ── */
export interface PlayerSearchRow extends PlayerInfo {
  // 여기에 추가
}
export type PlayerSearchResponse = ApiResponse<PlayerSearchRow>;

/* ── 대표 캐릭터 / 포지션 (라이브러리에 없어 자체 정의) ── */
export interface PositionAttribute {
  id: string;
  name: string;
}
export interface Position {
  name: string;
  attribute?: PositionAttribute[];
}
export interface RepresentCharacter {
  characterId: string;
  characterName: string;
  position?: Position;
}

/* ── 플레이어 상세: 라이브러리 PlayerInfo 확장 ── */
export interface PlayerRecord {
  gameTypeId: GameTypeId | string;
  // 실제 응답이 win/lose/stop 또는 winCount/loseCount/stopCount 로 올 수 있어 양쪽 대응
  win?: number;
  lose?: number;
  stop?: number;
  winCount?: number;
  loseCount?: number;
  stopCount?: number;
}
export interface PlayerDetail extends PlayerInfo {
  represent?: RepresentCharacter;
  tierName?: string;
  ratingPoint?: number;
  maxRatingPoint?: number;
  records?: PlayerRecord[];
  // 여기에 추가
}

/* ── 매치별 플레이 정보 (뷰): 스탯 베이스 + 앱 필드 ── */
export interface MatchPlayInfo extends CombatStats {
  characterId: string;
  characterName: string;
  result: MatchResult;
  random?: boolean;
  playTypeName?: string;
  partyUserCount?: number;
  playTime?: number; // 초
  responseTime?: number;
  /** ACE / JOKER 등 MVP 정보 (없으면 null) */
  aceInfo?: { code: number; name: string } | null;
  /** 멀티킬 횟수 */
  multiKillCount?: { double?: number; triple?: number; quadruple?: number; genocide?: number };
  /** 코인 획득/소비 */
  getCoin?: number;
  spendCoin?: number;
  spendConsumablesCoin?: number;
  // 여기에 추가
}

/* ── 매치 기록(플레이어 전적 리스트) ── */
export interface MatchRow {
  matchId: string;
  date: string;
  playInfo: MatchPlayInfo;
}
export interface PlayerMatchesResponse {
  matches: {
    date?: string;
    gameTypeId?: GameTypeId | string;
    next?: string;
    rows: MatchRow[];
  };
}

/* ── 매치 상세 ── */
export interface MatchDetailItem extends Partial<Cyphers.MatchPlayerItem> {
  // 라이브러리 MatchPlayerItem(itemId/itemName/slotCode/rarityCode/equipSlotCode/itemTypeCode)
  // 를 베이스로, 응답에 따라 함께 오는 표시용 필드를 확장
  slotName?: string;
  rarityName?: string;
}
export interface MatchDetailPlayer {
  playerId: string;
  nickname: string;
  playInfo: MatchPlayInfo;
  items?: MatchDetailItem[];
  /** 아이템 구매 순서 (itemId 배열, 중복=재구매/업그레이드) */
  itemPurchase?: string[];
}
export interface MatchDetailTeam {
  teamId?: string;
  result?: MatchResult;
  players: MatchDetailPlayer[];
}
export interface MatchMap {
  mapId?: string;
  name?: string;
}
export interface MatchDetail {
  matchId: string;
  date: string;
  gameTypeId: GameTypeId | string;
  map?: MatchMap;
  teams: MatchDetailTeam[];
}

/* ── 랭킹 ── */
export interface RankingPlayer {
  playerId: string;
  nickname: string;
  grade?: number;
  clanName?: string;
}
export interface RatingRankingRow {
  ranking: number;
  /** 이전 순위 (API 제공). 0/undefined 면 신규 진입. */
  beforeRank?: number;
  player: RankingPlayer;
  ratingPoint?: number;
  rankingPoint?: number;
  tierName?: string;
  win?: number;
  lose?: number;
  stop?: number;
}
export type RatingRankingResponse = ApiResponse<RatingRankingRow>;

export interface CharacterRankingRow {
  ranking: number;
  player: RankingPlayer;
  characterId?: string;
  characterName?: string;
  value?: number;
  winCount?: number;
  loseCount?: number;
  winRate?: number;
}
export type CharacterRankingResponse = ApiResponse<CharacterRankingRow>;

export interface TsjRankingRow {
  ranking: number;
  player: RankingPlayer;
  score?: number;
  winCount?: number;
  loseCount?: number;
}
export type TsjRankingResponse = ApiResponse<TsjRankingRow>;

/* ── 캐릭터 ── */
export interface CharacterRow {
  characterId: string;
  characterName: string;
}
export type CharactersResponse = ApiResponse<CharacterRow>;

/* ── 아이템: 라이브러리 ItemInfo 확장 ── */
export interface ItemRow extends Partial<Cyphers.ItemInfo> {
  itemId: string;
  itemName: string;
  slotName?: string;
  rarityName?: string;
  seasonCode?: string;
  // 여기에 추가
}
export type ItemSearchResponse = ApiResponse<ItemRow>;

export interface ItemDetail extends ItemRow {
  // 실제 아이템 상세 필드 (schemas.md ItemDetail)
  characterId?: string;
  characterName?: string;
  seasonName?: string;
  explain?: string; // 설명
  explainDetail?: string; // 레벨별 효과 등 상세
  itemHash?: string;
  obtainInfo?: string;
  tuning?: { explain?: string; slotId?: number; explain2?: string };
  // 여기에 추가
}
