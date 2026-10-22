/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // fetch 데이터 캐시를 디스크(.next/cache/fetch-cache)에 쓰지 않고 메모리 LRU(기본 50MB)에만 둔다.
    // 디스크에 쓰면 플레이어 페이지마다 ~1MB 파일이 지워지지 않고 쌓이고, 컨테이너에선 이 파일 캐시가
    // 메모리 사용량으로 잡혀 Railway 메모리 과금이 한도까지 차오른다. (백엔드 api_cache 가 이미 캐시함)
    isrFlushToDisk: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img-api.neople.co.kr", pathname: "/**" },
    ],
  },
};

export default nextConfig;
