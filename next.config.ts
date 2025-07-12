import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimasi gambar menggunakan remotePatterns
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flowbite.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'app.citrabuana.online',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Nonaktifkan ESLint selama build (opsional)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Header CORS untuk file statis
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://app.citrabuana.online',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Untuk menghindari warning CORS di _next/* resource
  allowedDevOrigins: [
    'https://app.citrabuana.online',
  ],

  // Build standalone untuk VPS
  output: 'standalone',
};

export default nextConfig;
