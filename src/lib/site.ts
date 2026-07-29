/**
 * 사이트 절대 URL. SEO(메타데이터·사이트맵·robots)에 사용.
 * Vercel 환경변수 NEXT_PUBLIC_SITE_URL 에 배포 도메인을 설정하세요.
 * 예: https://cyphers-meta.vercel.app  (커스텀 도메인이면 그 주소)
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyphers-meta.vercel.app"
).replace(/\/$/, "");
