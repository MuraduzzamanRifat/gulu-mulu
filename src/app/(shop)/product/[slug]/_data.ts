/**
 * PDP-only reads.
 *
 * `@/lib/queries` owns everything the storefront shares (`getProductBySlug`, `getRelatedProducts`).
 * The three reads below exist ONLY for this page, so they live here rather than bloating the shared
 * query layer:
 *
 *   - the star histogram (needs an aggregate across ALL review rows, not the 12 the detail query
 *     returns for display),
 *   - "may this shopper review this product?" (needs the shopper's order history),
 *   - "has this shopper hearted it?" (needs the shopper's wishlist).
 *
 * All three are React-`cache`d, so `generateMetadata()` and the page body share one round trip.
 */
import { cache } from 'react'

import { prisma } from '@/lib/db'
import { OrderStatus } from '@/generated/prisma/client'

export type StarValue = 1 | 2 | 3 | 4 | 5

export const STAR_VALUES: StarValue[] = [5, 4, 3, 2, 1]

export interface RatingBreakdown {
  /** Every review row for the product — NOT the truncated list rendered on screen. */
  total: number
  /** Mean of the real rows, rounded to 1dp. 0 when there are none. */
  average: number
  counts: Record<StarValue, number>
  /** Whole percent per star, summing to ~100. All zero when there are no reviews. */
  percents: Record<StarValue, number>
}

const emptyStars = (): Record<StarValue, number> => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })

/**
 * The "5★ ▇▇▇▇▇ 60%" histogram.
 *
 * Computed from the review rows themselves, never from `Product.rating` — the bars and the headline
 * average are then incapable of disagreeing with each other, or with the reviews you can scroll.
 */
export const getRatingBreakdown = cache(async (productId: string): Promise<RatingBreakdown> => {
  const groups = await prisma.review.groupBy({
    by: ['rating'],
    where: { productId },
    _count: { _all: true },
  })

  const counts = emptyStars()
  let total = 0
  let sum = 0

  for (const group of groups) {
    const star = Math.min(5, Math.max(1, Math.round(group.rating))) as StarValue
    const count = group._count._all
    counts[star] += count
    total += count
    sum += star * count
  }

  const percents = emptyStars()
  if (total > 0) {
    for (const star of STAR_VALUES) {
      percents[star] = Math.round((counts[star] / total) * 100)
    }
  }

  return {
    total,
    average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    counts,
    percents,
  }
})

export interface ReviewEligibility {
  /** The shopper has a DELIVERED line for this product and has not written a review yet. */
  canReview: boolean
  hasPurchased: boolean
  hasReviewed: boolean
}

/**
 * No fake reviews: a review may only be written against a line the shopper actually received.
 * The Server Action re-checks all of this — this read only decides which UI to paint.
 */
export const getReviewEligibility = cache(
  async (productId: string, userId: string | null): Promise<ReviewEligibility> => {
    if (!userId) return { canReview: false, hasPurchased: false, hasReviewed: false }

    const [delivered, existing] = await Promise.all([
      prisma.orderItem.findFirst({
        where: { productId, status: OrderStatus.DELIVERED, order: { userId } },
        select: { id: true },
      }),
      prisma.review.findFirst({
        where: { productId, userId },
        select: { id: true },
      }),
    ])

    const hasPurchased = delivered != null
    const hasReviewed = existing != null

    return { canReview: hasPurchased && !hasReviewed, hasPurchased, hasReviewed }
  },
)

/**
 * Which of these products the shopper has hearted.
 *
 * One query for the product AND every card in the related rail — the hearts on nine tiles must not
 * cost nine round trips. Returns an empty set for a signed-out visitor without touching the DB.
 */
export const getWishlistedIds = cache(
  async (productIds: string[], userId: string | null): Promise<Set<string>> => {
    if (!userId || productIds.length === 0) return new Set()

    const rows = await prisma.wishlistItem.findMany({
      where: { userId, productId: { in: productIds } },
      select: { productId: true },
    })

    return new Set(rows.map((row) => row.productId))
  },
)
