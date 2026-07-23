/**
 * Neople 사이퍼즈 오픈API 서버 클라이언트.
 *
 * ⚠️ 이 모듈은 **서버 전용**입니다. (서버 컴포넌트 / 라우트 핸들러에서만 import)
 * NEOPLE_API_KEY 는 NEXT_PUBLIC_ 접두사가 없으므로 클라이언트 번들에 포함되지 않습니다.
 *
 * 캐싱은 Next.js 의 fetch revalidate 로 처리합니다.
 */

import type {
  CharacterRankingResponse,
  CharactersResponse,
  ItemDetail,
  ItemSearchResponse,
  MatchDetail,
  PlayerDetail,
  PlayerMatchesResponse,
  PlayerSearchResponse,
  RatingRankingResponse,
  TsjRankingResponse,
} from "./types";
import {
  normalizeCharacterRanking,
  normalizeCharacters,
  normalizeItemDetail,
  normalizeItemSearch,
  normalizeMatchDetail,
  normalizePlayerDetail,
  normalizePlayerMatches,
  normalizePlayerSearch,
  normalizeRatingRanking,
  normalizeTsjRanking,
} from "./normalize";
import { dateNDaysAgo, todayStr } from "./format";

// 백엔드(NestJS)를 통해 호출 — 백엔드가 Neople 프록시·캐싱·API키를 담당.
const BASE_URL = (process.env.CYPHERS_API_URL ?? "http://localhost:4000/api") + "/cy";

/** 캐시 TTL(초) — 데이터 성격에 맞춰 조정 */
export const TTL = {
  characters: 60 * 60 * 24, // 24시간 (거의 안 변함)
  itemDetail: 60 * 60 * 6, // 6시간
  itemSearch: 60 * 10, // 10분
  playerInfo: 60 * 5, // 5분
  ranking: 60, // 1분
  matchDetail: 60 * 30, // 30분 (종료된 매치는 불변)
  playerMatches: 60, // 1분
  search: 60, // 1분
} as const;

export class NeopleApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "NeopleApiError";
    this.status = status;
    this.code = code;
  }
}

interface FetchOptions {
  params?: Record<string, string | number | undefined>;
  revalidate?: number;
}

async function neopleFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = new URL(BASE_URL + path);

  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      next: { revalidate: opts.revalidate ?? 60 },
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    throw new NeopleApiError(
      503,
      "NETWORK_ERROR",
      `백엔드 API 요청 실패 — 백엔드 서버(:4000)가 실행 중인지 확인하세요. (${(e as Error).message})`,
    );
  }

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new NeopleApiError(res.status, "PARSE_ERROR", "응답을 파싱할 수 없습니다.");
  }

  if (!res.ok) {
    // Neople 에러 형식: { error: { status, code|name, message } }
    const err = (body as { error?: { status: number; code?: string; name?: string; message: string } })
      .error;
    throw new NeopleApiError(
      err?.status ?? res.status,
      err?.code ?? err?.name ?? "API_ERROR",
      err?.message ?? `API 오류 (HTTP ${res.status})`,
    );
  }

  return body as T;
}

/** URL 세그먼트 인코딩 (닉네임 등 한글/특수문자) */
function seg(value: string): string {
  return encodeURIComponent(value);
}

/* ------------------------------------------------------------------ */
/* 플레이어                                                            */
/* ------------------------------------------------------------------ */

export async function searchPlayers(
  nickname: string,
  opts: { wordType?: "match" | "full"; limit?: number } = {},
): Promise<PlayerSearchResponse> {
  const raw = await neopleFetch<unknown>("/players", {
    params: { nickname, wordType: opts.wordType ?? "match", limit: opts.limit ?? 20 },
    revalidate: TTL.search,
  });
  return normalizePlayerSearch(raw);
}

export async function getPlayer(playerId: string): Promise<PlayerDetail> {
  const raw = await neopleFetch<unknown>(`/players/${seg(playerId)}`, {
    revalidate: TTL.playerInfo,
  });
  return normalizePlayerDetail(raw);
}

export async function getPlayerMatches(
  playerId: string,
  opts: {
    gameTypeId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    next?: string;
  } = {},
): Promise<PlayerMatchesResponse> {
  // 날짜 범위를 지정하지 않으면 기본으로 최근 90일(API 최대)을 조회.
  // 일반전 등 최근 경기가 드문 타입도 최대한 잡히도록 함.
  // KST 기준 최근 90일. Neople API 는 한국 시간으로 동작하므로 endDate 는 KST '오늘'까지만(미래 날짜는
  // 거부됨). todayStr 가 KST 기준이라 새벽(KST 00~09시)에도 당일 경기가 범위에 포함된다.
  const startDate = opts.startDate ?? dateNDaysAgo(90);
  const endDate = opts.endDate ?? todayStr();
  const raw = await neopleFetch<unknown>(`/players/${seg(playerId)}/matches`, {
    params: {
      gameTypeId: opts.gameTypeId ?? "rating",
      startDate,
      endDate,
      limit: opts.limit ?? 20,
      next: opts.next,
    },
    revalidate: TTL.playerMatches,
  });
  return normalizePlayerMatches(raw);
}

/* ------------------------------------------------------------------ */
/* 매치                                                                */
/* ------------------------------------------------------------------ */

export async function getMatch(matchId: string): Promise<MatchDetail> {
  const raw = await neopleFetch<unknown>(`/matches/${seg(matchId)}`, {
    revalidate: TTL.matchDetail,
  });
  return normalizeMatchDetail(raw);
}

/* ------------------------------------------------------------------ */
/* 랭킹                                                                */
/* ------------------------------------------------------------------ */

export async function getRatingRanking(
  opts: { playerId?: string; offset?: number; limit?: number } = {},
): Promise<RatingRankingResponse> {
  const raw = await neopleFetch<unknown>("/ranking/ratingpoint", {
    params: { playerId: opts.playerId, offset: opts.offset ?? 0, limit: opts.limit ?? 50 },
    revalidate: TTL.ranking,
  });
  return normalizeRatingRanking(raw);
}

export async function getCharacterRanking(
  characterId: string,
  rankingType: string,
  opts: { playerId?: string; offset?: number; limit?: number } = {},
): Promise<CharacterRankingResponse> {
  const raw = await neopleFetch<unknown>(
    `/ranking/characters/${seg(characterId)}/${seg(rankingType)}`,
    {
      params: { playerId: opts.playerId, offset: opts.offset ?? 0, limit: opts.limit ?? 50 },
      revalidate: TTL.ranking,
    },
  );
  return normalizeCharacterRanking(raw);
}

export async function getTsjRanking(
  tsjType: string,
  opts: { playerId?: string; offset?: number; limit?: number } = {},
): Promise<TsjRankingResponse> {
  const raw = await neopleFetch<unknown>(`/ranking/tsj/${seg(tsjType)}`, {
    params: { playerId: opts.playerId, offset: opts.offset ?? 0, limit: opts.limit ?? 50 },
    revalidate: TTL.ranking,
  });
  return normalizeTsjRanking(raw);
}

/* ------------------------------------------------------------------ */
/* 캐릭터                                                              */
/* ------------------------------------------------------------------ */

export async function getCharacters(): Promise<CharactersResponse> {
  const raw = await neopleFetch<unknown>("/characters", {
    revalidate: TTL.characters,
  });
  return normalizeCharacters(raw);
}

/* ------------------------------------------------------------------ */
/* 아이템                                                              */
/* ------------------------------------------------------------------ */

export async function searchItems(
  itemName: string,
  opts: {
    wordType?: "match" | "front" | "full";
    characterId?: string;
    slotCode?: string;
    rarityCode?: string;
    seasonCode?: string;
    limit?: number;
  } = {},
): Promise<ItemSearchResponse> {
  const raw = await neopleFetch<unknown>("/battleitems", {
    params: {
      itemName,
      wordType: opts.wordType ?? "match",
      characterId: opts.characterId,
      slotCode: opts.slotCode,
      rarityCode: opts.rarityCode,
      seasonCode: opts.seasonCode,
      limit: opts.limit ?? 30,
    },
    revalidate: TTL.itemSearch,
  });
  return normalizeItemSearch(raw);
}

export async function getItem(itemId: string): Promise<ItemDetail> {
  const raw = await neopleFetch<unknown>(`/battleitems/${seg(itemId)}`, {
    revalidate: TTL.itemDetail,
  });
  return normalizeItemDetail(raw);
}
