/**
 * Where a merchandising banner points.
 *
 * `Banner.linkUrl` is admin-authored, so it can be null (a purely decorative banner) and it can
 * carry a legacy short prefix. The seeded demo banners use `/c/<slug>`, but the storefront's real
 * category route — the one the header mega-menu and the mobile tab bar link to — is
 * `/category/<slug>`. Normalising here keeps a stale row from dead-ending the shopper on a 404.
 * Once the banner rows are re-authored with full paths this becomes a no-op and can be deleted.
 */
export function bannerHref(linkUrl: string | null | undefined): string {
  const url = linkUrl?.trim()
  if (!url) return '/products/search'
  if (url.startsWith('/c/')) return `/category/${url.slice(3)}`
  return url
}
