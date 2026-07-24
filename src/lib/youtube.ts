/**
 * 유튜브 라이브 API 클라이언트 — 서버 컴포넌트 전용 fetch.
 * 백엔드(NestJS)의 /api/youtube/lives 를 호출한다. API 키는 백엔드에만 있다.
 */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export interface YoutubeLive {
  liveId: string;
  title: string;
  thumbnailUrl: string | null;
  concurrentUserCount: number;
  channelId: string;
  channelName: string;
  channelImageUrl: string | null;
  openDate: string | null;
  url: string;
}

/**
 * 현재 진행 중인 유튜브 '사이퍼즈' 라이브 목록. 실패해도 던지지 않고 빈 배열 반환.
 * @param limit — 최대 라이브 수(기본 12)
 */
export async function getYoutubeLives(limit = 12): Promise<YoutubeLive[]> {
  try {
    const r = await fetch(`${API}/youtube/lives?limit=${limit}`, { cache: "no-store" });
    if (!r.ok) return [];
    const data = (await r.json()) as { lives?: YoutubeLive[] };
    return Array.isArray(data?.lives) ? data.lives : [];
  } catch {
    return [];
  }
}
