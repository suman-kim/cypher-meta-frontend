/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ⚠️ Cloudflare(next-on-pages) edge 런타임에서는 process.env 가 "모듈 최상단"에서
  //    비어 있어(요청 시점에만 채워짐), 백엔드 주소가 localhost 로 폴백돼 502가 났다.
  //    아래 env 로 "빌드 시점" 값을 코드에 인라인(치환)해 런타임 조회 자체를 없앤다.
  //    (빌드 머신에 해당 env 가 설정돼 있어야 함 — Cloudflare Pages Variables / 로컬 .env)
  env: {
    CYPHERS_API_URL: process.env.CYPHERS_API_URL,
    NAVER_SITE_VERIFICATION: process.env.NAVER_SITE_VERIFICATION,
    GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
    BING_SITE_VERIFICATION: process.env.BING_SITE_VERIFICATION,
  },
  images: {
    // Neople 이미지 서버 (캐릭터/아이템/속성 이미지). API 키 불필요, 공개 리소스.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img-api.neople.co.kr",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
