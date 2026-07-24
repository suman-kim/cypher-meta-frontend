/**
 * videos.ts — 사이퍼즈 관련 동영상(VOD)을 유튜브·치지직에서 모아 표준 모델로 합치는 서버 전용 모듈.
 * 무한 스크롤: 유튜브는 pageToken, 치지직은 offset 으로 각각 페이지네이션하며 커서로 이어붙인다.
 */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export type VideoPlatform = "chzzk" | "youtube";
export type VideoSort = "view" | "recent";

/** 플랫폼 공용 동영상 DTO */
export interface Video {
  platform: VideoPlatform;
  id: string;
  title: string;
  thumbnailUrl: string | null;
  viewCount: number;
  publishedAt: string | null;
  durationSec: number | null;
  channelName: string;
  channelImageUrl: string | null;
  verified: boolean;
  url: string;
}

/** 한 페이지 결과 + 다음 커서 */
export interface VideoPage {
  videos: Video[];
  nextYt: string | null; // 유튜브 다음 pageToken (null = 더 없음)
  nextCz: number; // 치지직 다음 offset (-1 = 더 없음)
  hasMore: boolean;
}

interface YtVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  viewCount: number;
  publishedAt: string | null;
  durationSec: number | null;
  channelName: string;
  channelImageUrl: string | null;
  url: string;
}
interface CzVideo {
  videoNo: number | string;
  title: string;
  thumbnailUrl: string | null;
  viewCount: number;
  publishedAt: string | null;
  durationSec: number | null;
  channelName: string;
  channelImageUrl: string | null;
  verified: boolean;
  url: string;
}

async function getYt(
  sort: VideoSort,
  limit: number,
  pageToken: string,
): Promise<{ videos: Video[]; nextToken: string | null }> {
  try {
    const r = await fetch(
      `${API}/youtube/videos?sort=${sort}&limit=${limit}&pageToken=${encodeURIComponent(pageToken)}`,
      { cache: "no-store" },
    );
    if (!r.ok) return { videos: [], nextToken: null };
    const d = (await r.json()) as { videos?: YtVideo[]; nextPageToken?: string | null };
    const videos: Video[] = (d.videos ?? []).map((v) => ({
      platform: "youtube",
      id: `youtube:${v.videoId}`,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      viewCount: v.viewCount,
      publishedAt: v.publishedAt,
      durationSec: v.durationSec,
      channelName: v.channelName,
      channelImageUrl: v.channelImageUrl ?? null,
      verified: false,
      url: v.url,
    }));
    return { videos, nextToken: d.nextPageToken ?? null };
  } catch {
    return { videos: [], nextToken: null };
  }
}

async function getCz(sort: VideoSort, limit: number, offset: number): Promise<Video[]> {
  try {
    const r = await fetch(`${API}/chzzk/videos?sort=${sort}&limit=${limit}&offset=${offset}`, {
      cache: "no-store",
    });
    if (!r.ok) return [];
    const d = (await r.json()) as { videos?: CzVideo[] };
    return (d.videos ?? []).map((v) => ({
      platform: "chzzk",
      id: `chzzk:${v.videoNo}`,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      viewCount: v.viewCount,
      publishedAt: v.publishedAt,
      durationSec: v.durationSec,
      channelName: v.channelName,
      channelImageUrl: v.channelImageUrl,
      verified: v.verified,
      url: v.url,
    }));
  } catch {
    return [];
  }
}

function sortVideos(list: Video[], sort: VideoSort): Video[] {
  return list.sort((a, b) =>
    sort === "recent"
      ? (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0)
      : b.viewCount - a.viewCount,
  );
}

/**
 * 사이퍼즈 동영상(VOD) 한 페이지를 유튜브+치지직에서 모아 반환 + 다음 커서.
 * @param ytToken — 유튜브 pageToken("" = 첫 페이지, null = 유튜브 소진)
 * @param czOffset — 치지직 offset(0 = 첫 페이지, -1 = 치지직 소진)
 */
export async function getVideosPage(
  sort: VideoSort = "view",
  limit = 24,
  ytToken: string | null = "",
  // czOffset 은 하위 호환성으로 남겨둠(동영상 VOD 는 유튜브 전용 — 치지직은 라이브만 지원)
  _czOffset = 0,
): Promise<VideoPage> {
  const ytR =
    ytToken !== null
      ? await getYt(sort, limit, ytToken)
      : { videos: [] as Video[], nextToken: null as string | null };
  const videos = sortVideos([...ytR.videos], sort);
  const nextYt = ytToken !== null ? ytR.nextToken : null;
  const nextCz = -1; // 치지직 VOD 미지원
  const hasMore = nextYt !== null;
  return { videos, nextYt, nextCz, hasMore };
}
