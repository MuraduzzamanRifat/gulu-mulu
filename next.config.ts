import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

// Pin Turbopack's workspace root to THIS directory. Without it, Turbopack walks up
// and finds an unrelated package-lock.json in the parent folder, infers that as the
// root, and traces the wrong file tree. Derived from import.meta.url so it stays
// correct on Linux (Vercel) as well as Windows.
const projectRoot = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    // Hand resizing to the source CDN (Unsplash/Picsum) instead of double-optimizing through
    // Vercel's /_next/image — see src/lib/image-loader.ts for the full rationale (cost + latency).
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    // Demo product/banner imagery. Swap for your own CDN (Cloudflare R2 / S3 +
    // CloudFront) once sellers upload real photos.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
    // Trim the width ladder: our largest source is the 1600px hero, so 2048/3840 only ever
    // upscale. This also shrinks every srcset the browser has to parse.
    deviceSizes: [640, 750, 828, 1080, 1200, 1600],
    imageSizes: [64, 128, 256, 384],
    // Next 16 narrowed this default to [75] only; allow a cheaper tier for dense grids.
    qualities: [60, 75, 90],
  },
  // Native/driver packages must not be bundled — they load bindings at runtime.
  serverExternalPackages: [
    'better-sqlite3',
    '@prisma/adapter-better-sqlite3',
    '@prisma/adapter-pg',
    'pg',
  ],
}

export default nextConfig
