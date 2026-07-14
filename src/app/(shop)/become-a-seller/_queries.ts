import { cache } from 'react'

import { STOREFRONT_PRODUCT } from '@/lib/queries'
import { prisma } from '@/lib/db'
import { SellerStatus } from '@/generated/prisma/client'

/**
 * The proof numbers in the hero.
 *
 * They are counted, not written. A landing page that claims "500+ sellers" while the marketplace
 * has eleven is the fastest way to lose a merchant's trust on the day they join — so the page can
 * only ever say what is actually true right now.
 *
 * `STOREFRONT_PRODUCT` is reused for the live-product count so this page counts exactly what a
 * shopper can actually buy: approved listings from approved shops.
 */
export interface MarketplaceStats {
  sellers: number
  products: number
  categories: number
  orders: number
}

export const getMarketplaceStats = cache(async (): Promise<MarketplaceStats> => {
  const [sellers, products, categories, orders] = await Promise.all([
    prisma.seller.count({ where: { status: SellerStatus.APPROVED } }),
    prisma.product.count({ where: STOREFRONT_PRODUCT }),
    prisma.category.count(),
    prisma.order.count(),
  ])

  return { sellers, products, categories, orders }
})
