/**
 * live.ts — 여러 플랫폼(치지직/유튜브/SOOP)의 라이브를 하나의 표준 모델로 합치는 서버 전용 모듈.
 *
 * 현재는 치지직만 연결돼 있고, 유튜브·SOOP 소스는 아래 getLiveStreams() 에 추가하면
 * 자동으로 같은 레일에 '시청자수 내림차순'으로 합쳐진다.
 */
import { getCyphersLives, type ChzzkLive } from "@/lib/chzzk";
import { getYoutubeLives, type YoutubeLive } from "@/lib/youtube";

/** 지원 플랫폼 */
export type LivePlatform = "chzzk" | "youtube" | "soop";

/** 플랫폼 공용 라이브 DTO — UI(LiveStreams 레일)가 소비하는 단일 형태 */
export interface LiveStream {
  platform: LivePlatform;
  /** 플랫폼 전역 고유 id (예: "chzzk:<channelId>") */
  id: string;
  title: string;
  thumbnailUrl: string | null;
  /** 현재 시청자수 */
  viewerCount: number;
  channelName: string;
  channelImageUrl: string | null;
  /** 클릭 시 이동할 방송 URL */
  url: string;
  /** 카테고리/게임명 (있으면) */
  category: string | null;
  /** 방송 시작 시각 (플랫폼 원본 문자열; uptime 계산용) */
  openDate: string | null;
  /** 채널 인증 여부 */
  verified: boolean;
}

/** 치지직 라이브 → 표준 LiveStream */
export function mapChzzk(l: ChzzkLive): LiveStream {
  return {
    platform: "chzzk",
    id: `chzzk:${l.channelId}`,
    title: l.title,
    thumbnailUrl: l.thumbnailUrl,
    viewerCount: l.concurrentUserCount,
    channelName: l.channelName,
    channelImageUrl: l.channelImageUrl,
    url: l.url,
    category: l.categoryValue,
    openDate: l.openDate,
    verified: l.verified,
  };
}

/** 유튜브 라이브 → 표준 LiveStream */
export function mapYoutube(l: YoutubeLive): LiveStream {
  return {
    platform: "youtube",
    id: `youtube:${l.liveId}`,
    title: l.title,
    thumbnailUrl: l.thumbnailUrl,
    viewerCount: l.concurrentUserCount,
    channelName: l.channelName,
    channelImageUrl: l.channelImageUrl,
    url: l.url,
    category: null,
    openDate: l.openDate,
    verified: false,
  };
}

/**
 * 모든 플랫폼의 현재 라이브를 합쳐 시청자수 내림차순으로 반환한다.
 * 한 소스가 실패해도 나머지는 그대로 노출된다(allSettled).
 *
 * 유튜브·SOOP 추가 시: 아래 배열에 소스 Promise 를 하나 더 넣기만 하면 됩니다.
 *
 * @param limit — 반환할 최대 라이브 수(기본 20)
 */
export async function getLiveStreams(limit = 20, revalidate?: number): Promise<LiveStream[]> {
  const sources: Array<Promise<LiveStream[]>> = [
    getCyphersLives(limit, revalidate).then((r) => r.lives.map(mapChzzk)),
    getYoutubeLives(limit, revalidate).then((r) => r.map(mapYoutube)),
    // TODO(SOOP): getSoopLives(limit).then((r) => r.map(mapSoop)),
  ];
  const settled = await Promise.allSettled(sources);
  const all = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  // 전역 컷 없이 반환(각 소스가 이미 limit 로 제한됨). 프론트가 플랫폼별로 그룹핑하므로
  // 여기서 자르면 저시청자 플랫폼(유튜브 등) 방송이 치지직에 밀려 사라질 수 있다.
  return all.sort((a, b) => b.viewerCount - a.viewerCount);
}
