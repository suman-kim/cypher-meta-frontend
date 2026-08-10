/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare(next-on-pages) edge 런타임에선 process.env 가 모듈 최상단에서 비어 있어
  // 백엔드 주소가 localhost 로 폴백돼 502가 났다. 아래 env 로 "빌드 시점"에 값을 코드에
  // 인라인(치환)해 런타임 조회를 없앤다. 빌드 머신에 env 가 없어도 프로덕션 기본값으로
  // railway 주소가 박히도록 폴백을 코드에 직접 둔다(=undefined 방지 + 안전망).
  env: {
    CYPHERS_API_URL:
      process.env.CYPHERS_API_URL ||
      "https://cypher-meta-backend-production.up.railway.app/api",
    NAVER_SITE_VERIFICATION: process.env.NAVER_SITE_VERIFICATION || "",
    GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION || "",
    BING_SITE_VERIFICATION: process.env.BING_SITE_VERIFICATION || "",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img-api.neople.co.kr", pathname: "/**" },
    ],
  },
};

export default nextConfig;
