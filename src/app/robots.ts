import type { MetadataRoute } from 'next'

/**
 * robots.txt.
 *
 * Open the catalogue, close everything that is private, transactional, or personal:
 *
 *   /admin    — staff only
 *   /seller   — the seller portal and its onboarding forms
 *   /account  — one shopper's orders, addresses and wishlist
 *   /checkout — a transaction in progress; crawling it is meaningless and mutates carts
 *   /cart     — per-session, never the same page twice
 *   /login, /logout — auth endpoints; /logout in particular must never be followed by a crawler
 *
 * `/become-a-seller` sits OUTSIDE the blocked `/seller` prefix on purpose: the marketing page is
 * the one thing here we most want indexed, while the registration form behind it is not.
 */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/seller', '/account', '/checkout', '/cart', '/login', '/logout'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
