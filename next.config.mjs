/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img-api.neople.co.kr", pathname: "/**" },
    ],
  },
};

export default nextConfig;
