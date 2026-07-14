'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/auth'
import { addToCart } from '@/lib/cart'
import { prisma } from '@/lib/db'

const productIdSchema = z.object({
  productId: z.string().min(1).max(64),
})

export type WishlistActionResult = { ok: true } | { ok: false; error: string }

export type AddToCartActionResult =
  | {
      ok: true
      /** The cart's new total quantity — the toast quotes it back. */
      count: number
      /** Set when stock ran out mid-add and we honoured less than asked. */
      clampedTo?: number
    }
  | { ok: false; error: string }

/**
 * Remove a saved product.
 *
 * `deleteMany` scoped by `{ userId, productId }` is both the delete and the ownership check in one
 * query — a forged productId simply matches nothing. Deleting a row that isn't there is not an
 * error worth shouting about: the shopper wanted it gone, and it is gone.
 */
export async function removeFromWishlistAction(input: {
  productId: string
}): Promise<WishlistActionResult> {
  const parsed = productIdSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'That product could not be identified.' }
  }

  const user = await requireUser()

  await prisma.wishlistItem.deleteMany({
    where: { userId: user.id, productId: parsed.data.productId },
  })

  revalidatePath('/account/wishlist')
  return { ok: true }
}

/**
 * Move a saved product into the cart.
 *
 * Everything that matters is decided by `addToCart()` in '@/lib/cart': it re-reads the product,
 * re-checks approval and stock, and picks the price. The client sends an id and nothing else — no
 * price, no seller, no quantity beyond the literal 1 hard-coded below.
 *
 * A product WITH variants cannot be added blind (which size? which colour?), so the wishlist card
 * links to the product page instead and this action never sees it. The check stays here anyway:
 * `addToCart` refuses it, and the shopper gets told why rather than nothing happening.
 */
export async function addWishlistItemToCartAction(input: {
  productId: string
}): Promise<AddToCartActionResult> {
  const parsed = productIdSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'That product could not be identified.' }
  }

  await requireUser()

  const result = await addToCart(parsed.data.productId, null, 1)
  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  // The header's cart badge lives in the (shop) layout — 'layout' is what refreshes it.
  revalidatePath('/', 'layout')
  revalidatePath('/cart')

  return result.clampedTo != null
    ? { ok: true, count: result.count, clampedTo: result.clampedTo }
    : { ok: true, count: result.count }
}
