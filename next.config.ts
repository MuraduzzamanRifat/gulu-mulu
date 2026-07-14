import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Demo product/banner imagery is served from Unsplash. Swap for your own CDN
    // (Cloudflare R2 / S3 + CloudFront) when real seller uploads land.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
    // Next 16 narrowed this default to [75] only; allow a cheaper tier for dense grids.
    qualities: [60, 75, 90],
  },
  // better-sqlite3 is a native module — it must not be bundled.
  serverExternalPackages: ['better-sqlite3', '@prisma/adapter-better-sqlite3'],
}

export default nextConfig
