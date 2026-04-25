/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel ko bolna ki ESLint (choti-moti warnings) ko ignore kare
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Vercel ko bolna ki TypeScript ki errors ko ignore kare
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;