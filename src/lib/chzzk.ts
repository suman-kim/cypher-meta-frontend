/**
 * 치지직(CHZZK) 라이브 API 클라이언트 — 서버 컴포넌트 전용 fetch.
 * 백엔드(NestJS)의 /api/chzzk/lives 를 호출한다. 시크릿은 백엔드에만 있으므로
 * 프론트에는 자격증명이 필요 없다.
 */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/** 백엔드가 내려주는 표준 라이브 DTO */
export interface ChzzkLive {
  liveId: number | string;
  title: string;
  thumbnailUrl: string | null;
  concurrentUserCount: number;
  channelId: string;
  channelName: string;
  channelImageUrl: string | null;
  verified: boolean;
  categoryValue: string | null;
  openDate: string | null;
  url: string;
}

export interface ChzzkLivesResult {
  lives: ChzzkLive[];
  category: string | null;
  fetchedAt: string;
}

const EMPTY: ChzzkLivesResult = { lives: [], category: null, fetchedAt: "" };

/**
 * 현재 진행 중인 '사이퍼즈' 라이브 목록을 백엔드에서 가져온다.
 * 실패해도 던지지 않고 빈 결과를 반환한다(메인 페이지가 깨지지 않도록).
 *
 * @param limit — 최대 라이브 수(기본 8)
 */
export async function getCyphersLives(limit = 8, revalidate?: number): Promise<ChzzkLivesResult> {
  try {
    const r = await fetch(`${API}/chzzk/lives?limit=${limit}`, revalidate ? { next: { revalidate } } : { cache: "no-store" });
    if (!r.ok) return EMPTY;
    const data = (await r.json()) as ChzzkLivesResult;
    return { lives: Array.isArray(data?.lives) ? data.lives : [], category: data?.category ?? null, fetchedAt: data?.fetchedAt ?? "" };
  } catch {
    return EMPTY;
  }
}
