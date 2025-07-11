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
        hostname: '31.97.108.186',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.18.9',
        port: '3000',
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
            value: process.env.CLIENT_URL || 'https://31.97.108.186:3000',
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

  // Build standalone untuk VPS
  output: 'standalone',
};

export default nextConfig;