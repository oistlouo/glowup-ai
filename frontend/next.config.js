/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ 빌드 시 ESLint 오류 무시 설정
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
