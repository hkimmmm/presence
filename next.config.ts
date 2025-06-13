import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Konfigurasi untuk Next.js Image Optimization
  images: {
    domains: [
      'flowbite.com', // Domain eksternal yang sudah ada
      '192.168.18.9', // Tambahkan IP/domain server lokal Anda
      'localhost'     // Tambahkan localhost untuk development
    ],
  },

  // Konfigurasi header CORS untuk file statis
  async headers() {
    return [
      {
        // Apply CORS to all static files
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;