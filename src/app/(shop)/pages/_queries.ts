import { cache } from 'react'

import { prisma } from '@/lib/db'
import type { Page } from '@/generated/prisma/client'

/**
 * Reads for the CMS policy pages.
 *
 * `@/lib/queries` covers the catalogue; the `Page` model has no reader there, so its two queries
 * live next to the only routes that use them. Both apply the same gate: **an unpublished page does
 * not exist**, on the index and on a direct slug URL alike.
 */

/** One published page. `findFirst`, not `findUnique` — the slug alone is not the whole condition. */
export const getPublishedPage = cache(async (slug: string): Promise<Page | null> => {
  if (!slug) return null
  return prisma.page.findFirst({ where: { slug, isPublished: true } })
})

/** Every published page, alphabetical. Used by the index, the sidebar nav and the sitemap. */
export const getPublishedPages = cache(async (): Promise<Page[]> => {
  return prisma.page.findMany({
    where: { isPublished: true },
    orderBy: { title: 'asc' },
  })
})

/* -------------------------------------------------------------------------- */
/* Audience grouping                                                          */
/* -------------------------------------------------------------------------- */

export type PageAudience = 'customer' | 'seller'

/**
 * The `Page` model carries no audience column, so the split is derived from the slug — the same
 * split the footer already makes between its "Policies" and "Seller" columns, kept in one place so
 * the two can never disagree.
 *
 * A page an admin adds later lands under "For shoppers" unless its slug says otherwise, which is
 * the safe default: a shopper seeing a seller policy is a mild oddity, a shopper NOT seeing the
 * return policy is a support ticket.
 */
const SELLER_PAGE_SLUGS = new Set([
  'seller-policy',
  'product-policy',
  'pickup-delivery-policy',
  'seller-exchange-return-policy',
])

export function audienceOf(page: Pick<Page, 'slug'>): PageAudience {
  return SELLER_PAGE_SLUGS.has(page.slug) || page.slug.includes('seller') ? 'seller' : 'customer'
}

export interface GroupedPages {
  customer: Page[]
  seller: Page[]
}

export function groupByAudience(pages: Page[]): GroupedPages {
  const grouped: GroupedPages = { customer: [], seller: [] }
  for (const page of pages) grouped[audienceOf(page)].push(page)
  return grouped
}
