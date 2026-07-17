import type { MetadataRoute } from 'next'

/**
 * robots.txt.
 *
 * Open the catalogue, close everything that is private, transactional, or personal:
 *
 *   /seller   — the seller portal and its onboarding forms
 *   /account  — one shopper's orders, addresses and wishlist
 *   /checkout — a transaction in progress; crawling it is meaningless and mutates carts
 *   /cart     — per-session, never the same page twice
 *   /login, /logout — auth endpoints; /logout in particular must never be followed by a crawler
 *
 * The staff panel is deliberately NOT listed here. It lives at a non-obvious path and is gated by
 * requireAdmin; naming it in robots.txt would publish that path to anyone who reads the file, which
 * is the opposite of what a non-guessable admin URL is for. It isn't linked publicly, so no crawler
 * finds it, and the auth gate stops anyone who does.
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
      disallow: ['/account', '/checkout', '/cart', '/login', '/logout'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
