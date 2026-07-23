import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** 주요 정적 경로. (플레이어/캐릭터 상세는 동적이라 제외 — 백엔드 의존) */
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/ranking", priority: 0.9, changeFrequency: "daily" },
  { path: "/ranking/characters", priority: 0.7, changeFrequency: "daily" },
  { path: "/ranking/tsj", priority: 0.7, changeFrequency: "daily" },
  { path: "/meta", priority: 0.8, changeFrequency: "daily" },
  { path: "/meta/comp", priority: 0.7, changeFrequency: "daily" },
  { path: "/characters", priority: 0.7, changeFrequency: "weekly" },
  { path: "/items", priority: 0.6, changeFrequency: "weekly" },
  { path: "/community", priority: 0.7, changeFrequency: "daily" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
