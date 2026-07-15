/**
 * Custom next/image loader.
 *
 * WHY THIS EXISTS — cost and latency.
 * Our demo imagery is served from Unsplash and Picsum, both of which are already CDNs with
 * their own on-the-fly resize + modern-format (AVIF/WebP) support. Routing those through
 * Vercel's built-in `/_next/image` optimizer means every image is optimized TWICE:
 *   - Vercel bills per source image transformed (real money on a marketplace with hundreds
 *     of product photos), and
 *   - a cache-miss adds a whole extra network hop + transform before the byte reaches the user.
 * Worse, Next's default width ladder asks for w=2048 and w=3840 from ~800–1600px sources, so
 * the optimizer upscales — paying to make an image blurrier.
 *
 * This loader hands the requested render width straight to the source CDN, which resizes and
 * auto-formats at its own edge, for free, and skips `/_next/image` entirely.
 *
 * Anything that ISN'T one of those CDNs (the local placeholder SVG, generated OG/icon routes)
 * falls through unchanged — an SVG has nothing to optimize, and the metadata routes don't use
 * this loader.
 */
interface LoaderArgs {
  src: string
  width: number
  quality?: number
}

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  const q = quality ?? 75

  // Unsplash (imgix under the hood): rewrite w/q, keep auto=format so it serves AVIF/WebP by
  // Accept header. Never request more than the source width — upscaling only wastes bytes.
  if (src.includes('images.unsplash.com')) {
    const [base] = src.split('?')
    const sourceWidth = Number(new URL(src).searchParams.get('w')) || width
    const w = Math.min(width, sourceWidth)
    return `${base}?w=${w}&q=${q}&auto=format&fit=crop`
  }

  // Picsum: its resize lives in the path (/seed/<seed>/<w>/<h>), not a query, and these are only
  // small avatars/logos already requested at their display size — pass through untouched.
  if (src.includes('picsum.photos')) {
    return src
  }

  // Local assets (placeholder SVG, etc.) — nothing to optimize, serve as-is.
  return src
}
