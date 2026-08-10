import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getCharacters } from "@/lib/neople";

// 로스터(캐릭터 목록) 조회 결과를 하루 캐시해 사이트맵을 재생성한다.
export const dynamic = "force-dynamic"; // Railway 내부망은 런타임 전용 — 빌드 프리렌더 대신 요청 시점 렌더

/** 주요 정적 경로. (플레이어 상세는 무한·동적이라 제외. 캐릭터 상세는 아래에서 동적으로 추가) */
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/ranking", priority: 0.9, changeFrequency: "daily" },
  { path: "/ranking/characters", priority: 0.7, changeFrequency: "daily" },
  { path: "/ranking/tsj", priority: 0.7, changeFrequency: "daily" },
  { path: "/meta", priority: 0.8, changeFrequency: "daily" },
  { path: "/meta/comp", priority: 0.7, changeFrequency: "daily" },
  { path: "/characters", priority: 0.7, changeFrequency: "weekly" },
  { path: "/items", priority: 0.6, changeFrequency: "weekly" },
  { path: "/costumes", priority: 0.6, changeFrequency: "weekly" },
  { path: "/community", priority: 0.7, changeFrequency: "daily" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // 캐릭터 상세는 고정된 로스터(약 60명)라 사이트맵에 포함한다.
  // 조회 실패(빌드 시 API 미가용 등) 시에는 조용히 정적 경로만 제공한다.
  let characterEntries: MetadataRoute.Sitemap = [];
  try {
    const res = await getCharacters();
    characterEntries = (res.rows ?? [])
      .filter((c) => c.characterId)
      .map((c) => ({
        url: `${SITE_URL}/characters/${c.characterId}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    // 무시: 정적 경로만 반환
  }

  return [...staticEntries, ...characterEntries];
}
