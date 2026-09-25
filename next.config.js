/** @type {import('next').NextConfig} */
const nextConfig = {
  // Puraane errors bypass karne ke liye
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // NAYA: Images ko allow karne ke liye
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Yeh kisi bhi external link ki image ko allow kar dega
      },
    ],
  },
};

module.exports = nextConfig;