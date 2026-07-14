'use server'

/**
 * Cart mutations.
 *
 * Every one of these is a thin, VALIDATED shell around the engine in '@/lib/cart' — which already
 * scopes each write by cartId (so one shopper can never touch another's line) and re-reads price,
 * stock and approval from the database. Nothing a client sends is trusted beyond an id and a
 * quantity; there is no price, no sellerId and no discount anywhere in these signatures.
 *
 * `revalidatePath('/', 'layout')` on every mutation looks heavy-handed. It is on purpose: the cart
 * badge lives in the (shop) LAYOUT, not on the page, so revalidating only '/cart' would leave the
 * header showing a stale count — the single most obvious "this site is broken" bug in a storefront.
 */
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'

import { getCart, removeCartItem, toPricedLines, updateCartItemQty, type CartResult } from '@/lib/cart'
import { prisma } from '@/lib/db'
import { applyCoupon, summarizeCart } from '@/lib/pricing'

import { COUPON_COOKIE, COUPON_COOKIE_MAX_AGE, normalizeCouponCode } from './_coupon'

/** Matches MAX_QTY_PER_LINE in the cart engine; 0 is the documented "remove this line". */
const qtySchema = z.number().int().min(0).max(99)
const idSchema = z.string().min(1).max(64)

/** Refresh the cart page, the checkout page AND the header badge in the shop layout. */
function revalidateCart(): void {
  revalidatePath('/cart')
  revalidatePath('/checkout')
  revalidatePath('/', 'layout')
}

/* -------------------------------------------------------------------------- */
/* Lines                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Set a line's quantity. `qty` of 0 removes it — which is what the stepper does when it hits its
 * floor, and it is the cart engine's own contract.
 *
 * Returns `clampedTo` when stock ran out under the customer's feet, so the row can say
 * "only 3 left" instead of pretending it added 5.
 */
export async function setCartItemQty(itemId: string, qty: number): Promise<CartResult> {
  const parsed = z.object({ itemId: idSchema, qty: qtySchema }).safeParse({ itemId, qty })
  if (!parsed.success) return { ok: false, error: 'Invalid quantity.' }

  const result = await updateCartItemQty(parsed.data.itemId, parsed.data.qty)
  if (result.ok) revalidateCart()

  return result
}

export async function removeCartLine(itemId: string): Promise<CartResult> {
  const parsed = idSchema.safeParse(itemId)
  if (!parsed.success) return { ok: false, error: 'Invalid item.' }

  const result = await removeCartItem(parsed.data)
  if (result.ok) revalidateCart()

  return result
}

/* -------------------------------------------------------------------------- */
/* Coupon                                                                     */
/* -------------------------------------------------------------------------- */

export type CouponActionResult =
  | { ok: true; code: string; discount: number }
  | { ok: false; error: string }

const couponSchema = z
  .string()
  .trim()
  .min(2, 'Enter a coupon code.')
  .max(40, 'That is not a coupon code.')

/**
 * Validate a code against the CURRENT cart and, if it holds up, remember it in the cookie.
 *
 * The discount returned here is a preview for the toast, nothing more. It is never stored and
 * never trusted: `placeOrder()` re-reads the coupon row inside its transaction and re-runs
 * `applyCoupon()` against the subtotal it computed itself. A coupon that expires between this
 * click and the "Place Order" click is caught there, not smuggled through.
 */
export async function applyCouponCode(rawCode: string): Promise<CouponActionResult> {
  const parsed = couponSchema.safeParse(rawCode)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Enter a coupon code.' }
  }

  const code = normalizeCouponCode(parsed.data)
  if (!code) return { ok: false, error: 'Enter a coupon code.' }

  // The subtotal the coupon is judged against — unavailable lines already excluded by the engine,
  // because a coupon must not be validated against goods we cannot ship.
  const cart = await getCart()
  const { subtotal } = summarizeCart(toPricedLines(cart), null, null)

  if (subtotal <= 0) {
    return { ok: false, error: 'Add something to your cart before applying a coupon.' }
  }

  const coupon = await prisma.coupon.findUnique({ where: { code } })
  if (!coupon) {
    // Deliberately identical wording for "no such code" and a typo'd one — no code oracle.
    return { ok: false, error: `“${code}” is not a valid coupon code.` }
  }

  const { discount, error } = applyCoupon(subtotal, coupon)
  if (error) return { ok: false, error }

  if (discount <= 0) {
    return { ok: false, error: 'This coupon is worth nothing on your current cart.' }
  }

  const jar = await cookies()
  jar.set(COUPON_COOKIE, code, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COUPON_COOKIE_MAX_AGE,
  })

  revalidateCart()
  return { ok: true, code, discount }
}

export async function removeCouponCode(): Promise<{ ok: true }> {
  const jar = await cookies()
  jar.delete(COUPON_COOKIE)

  revalidateCart()
  return { ok: true }
}
