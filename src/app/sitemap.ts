import type { MetadataRoute } from 'next'

import { prisma } from '@/lib/db'
import { STOREFRONT_PRODUCT } from '@/lib/queries'

/**
 * The sitemap.
 *
 * Everything here is read from the database, so it can never drift from the catalogue. The one
 * rule it inherits — and must not break — is the storefront visibility gate: a rejected listing or
 * a suspended shop 404s on its own URL, so submitting it to Google would be advertising a dead
 * link. `STOREFRONT_PRODUCT` is the same `where` every storefront query spreads, which is exactly
 * why it is reused here rather than re-typed.
 *
 * Not listed, deliberately:
 *   - /products/search — a results page per query string is thin, near-duplicate content, and the
 *     page already carries `robots: { index: false }`. Crawl the products it links to instead.
 *   - /cart, /checkout, /account, /seller, /zawadpanel — private or transactional; robots.ts blocks them.
 *
 * `sitemap.ts` is a Route Handler and is cached by default; the hourly revalidate keeps a newly
 * approved product out of the sitemap for at most an hour rather than until the next deploy.
 */
export const revalidate = 3600

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

const url = (path: string) => `${SITE_URL}${path}`

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, brands, pages] = await Promise.all([
    prisma.product.findMany({
      where: STOREFRONT_PRODUCT,
      select: { slug: true, updatedAt: true, isFeatured: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.category.findMany({
      select: { slug: true, parentId: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.brand.findMany({
      select: { slug: true },
      orderBy: { name: 'asc' },
    }),
    prisma.page.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
      orderBy: { title: 'asc' },
    }),
  ])

  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: url('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: url('/become-a-seller'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: url('/pages'),
      lastModified: pages[0]?.updatedAt ?? now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: url(`/category/${category.slug}`),
    lastModified: now,
    changeFrequency: 'daily',
    // A top-level category is a landing page in its own right; a child is one click deeper.
    priority: category.parentId == null ? 0.9 : 0.7,
  }))

  const brandRoutes: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: url(`/brand/${brand.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: url(`/product/${product.slug}`),
    lastModified: product.updatedAt,
    changeFrequency: 'weekly',
    priority: product.isFeatured ? 0.8 : 0.7,
  }))

  const pageRoutes: MetadataRoute.Sitemap = pages.map((page) => ({
    url: url(`/pages/${page.slug}`),
    lastModified: page.updatedAt,
    changeFrequency: 'yearly',
    priority: 0.4,
  }))

  return [...staticRoutes, ...categoryRoutes, ...brandRoutes, ...productRoutes, ...pageRoutes]
}
