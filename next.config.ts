import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: 'tickets.admifarmgroup.com' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['tickets.admifarmgroup.com', 'localhost:3000'],
    },
  },
}

export default nextConfig
