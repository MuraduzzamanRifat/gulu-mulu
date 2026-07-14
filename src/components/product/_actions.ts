'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

const toggleWishlistSchema = z.object({
  productId: z.string().min(1).max(64),
})

export type WishlistResult =
  | { ok: true; wishlisted: boolean }
  /** `requiresAuth` tells the client to send the shopper to /login instead of shouting at them. */
  | { ok: false; error: string; requiresAuth?: boolean }

/**
 * Add or remove a product from the signed-in shopper's wishlist.
 *
 * Never trusts the client beyond the product id: the user comes from the session cookie,
 * and the product row is re-read from the DB, so a forged id can't create a dangling item.
 */
export async function toggleWishlist(input: { productId: string }): Promise<WishlistResult> {
  const parsed = toggleWishlistSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'That product could not be identified.' }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, error: 'Sign in to save items to your wishlist.', requiresAuth: true }
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true },
  })
  if (!product) {
    return { ok: false, error: 'This product is no longer available.' }
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId: product.id } },
    select: { id: true },
  })

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } })
    revalidatePath('/account/wishlist')
    return { ok: true, wishlisted: false }
  }

  await prisma.wishlistItem.create({
    data: { userId: user.id, productId: product.id },
  })
  revalidatePath('/account/wishlist')
  return { ok: true, wishlisted: true }
}
