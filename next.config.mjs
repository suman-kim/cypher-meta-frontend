/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
