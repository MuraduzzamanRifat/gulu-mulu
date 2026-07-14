'use server'

/**
 * Product-detail mutations.
 *
 * The client sends ids and a quantity. Nothing else is trusted: prices, stock, seller, approval
 * status and purchase history are all re-read from the database inside these functions. A forged
 * payload can, at worst, ask for something that does not exist — and be told so.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { addToCart } from '@/lib/cart'
import { prisma } from '@/lib/db'
import { OrderStatus, ProductStatus, SellerStatus } from '@/generated/prisma/client'

/** Same ceiling the cart engine enforces — reject fat-fingered quantities before they hit the DB. */
const MAX_QTY = 99

const ID = z.string().min(1).max(64)

/* -------------------------------------------------------------------------- */
/* Add to cart (also powers "Buy Now")                                        */
/* -------------------------------------------------------------------------- */

const addToCartSchema = z.object({
  productId: ID,
  variantId: ID.nullable(),
  qty: z.number().int().min(1).max(MAX_QTY),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>

export type AddToCartActionResult =
  | {
      ok: true
      /** The cart's new total quantity — the header badge. */
      count: number
      /** Set when stock forced us to add FEWER units than asked for. */
      clampedTo?: number
    }
  | { ok: false; error: string }

/**
 * Add a line from the PDP.
 *
 * All the real work — approval gate, variant-belongs-to-product check, stock clamping, guest-vs-user
 * cart resolution — happens inside `addToCart()` in '@/lib/cart'. This action is the thin, validated
 * seam between the browser and that engine, plus the cache invalidation.
 *
 * The revalidated product path is derived from the DB row, never from a client-supplied slug.
 */
export async function addProductToCart(input: AddToCartInput): Promise<AddToCartActionResult> {
  const parsed = addToCartSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Please choose a valid option and quantity.' }
  }

  const result = await addToCart(parsed.data.productId, parsed.data.variantId, parsed.data.qty)
  if (!result.ok) return result

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { slug: true },
  })

  revalidatePath('/cart')
  if (product) revalidatePath(`/product/${product.slug}`)

  return result
}

/* -------------------------------------------------------------------------- */
/* Write a review                                                             */
/* -------------------------------------------------------------------------- */

const reviewSchema = z.object({
  productId: ID,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export type SubmitReviewInput = z.infer<typeof reviewSchema>

export type SubmitReviewResult =
  | { ok: true }
  /** `requiresAuth` tells the form to send the shopper to /login rather than shouting at them. */
  | { ok: false; error: string; requiresAuth?: boolean }

/**
 * Create a verified-buyer review, then recompute the product's rating and reviewCount from the
 * actual review rows.
 *
 * Two rules this enforces on the server, because the client cannot be trusted to:
 *
 *  1. NO FAKE REVIEWS. There must be a DELIVERED OrderItem for this product on an order belonging
 *     to the signed-in user, and they must not have reviewed it already.
 *  2. THE NUMBER IS DERIVED, NEVER INCREMENTED. `rating`/`reviewCount` are re-aggregated from the
 *     rows — an incrementing counter drifts the first time a write half-fails, and then the "4.6
 *     (23)" in the header disagrees forever with the reviews you can actually read.
 */
export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Please choose a rating from 1 to 5 stars.' }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, error: 'Sign in to review this product.', requiresAuth: true }
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, slug: true, status: true, seller: { select: { status: true } } },
  })

  if (
    !product ||
    product.status !== ProductStatus.APPROVED ||
    product.seller.status !== SellerStatus.APPROVED
  ) {
    return { ok: false, error: 'This product is no longer available.' }
  }

  const [orderItem, existing] = await Promise.all([
    prisma.orderItem.findFirst({
      where: { productId: product.id, status: OrderStatus.DELIVERED, order: { userId: user.id } },
      select: { id: true },
    }),
    prisma.review.findFirst({
      where: { productId: product.id, userId: user.id },
      select: { id: true },
    }),
  ])

  if (!orderItem) {
    return { ok: false, error: 'Only verified buyers can review this product.' }
  }
  if (existing) {
    return { ok: false, error: 'You have already reviewed this product.' }
  }

  const comment = parsed.data.comment?.trim() ?? ''

  await prisma.review.create({
    data: {
      productId: product.id,
      userId: user.id,
      orderItemId: orderItem.id, // the proof of purchase, kept on the row
      rating: parsed.data.rating,
      comment: comment.length > 0 ? comment : null,
    },
  })

  const agg = await prisma.review.aggregate({
    where: { productId: product.id },
    _avg: { rating: true },
    _count: { _all: true },
  })

  await prisma.product.update({
    where: { id: product.id },
    data: {
      rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count._all,
    },
  })

  revalidatePath(`/product/${product.slug}`)
  return { ok: true }
}
